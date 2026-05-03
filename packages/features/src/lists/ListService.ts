import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  isListDisplayMode,
  isListItemStatus,
  isListProgressMode,
  type ActivityActorType,
  type ListDisplayMode,
  type ListItemStatus,
  type ListProgressMode
} from "@local-work-os/core";
import {
  ActivityLogService,
  ItemRepository,
  ListRepository,
  SearchIndexService,
  SortOrderService,
  TransactionService,
  type DatabaseConnection,
  type ItemRecord,
  type ListDetailsRecord,
  type ListItemRecord,
  type ListWithItemRecord,
  type SearchIndexRecord,
  type UpdateListItemPatch
} from "@local-work-os/db";
import {
  assertTaskDateOrder,
  normalizeTaskDateTime
} from "../tasks/TaskQueries";
import { parseBulkListItems } from "./BulkListParser";

// Owns checklist and structured-list application operations.
// Does not own project lifecycle or list UI rendering.
export type ListServiceIdFactory = (prefix: string) => string;

export type CreateListInput = {
  workspaceId: string;
  containerId: string;
  title: string;
  actorType?: ActivityActorType;
  body?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  displayMode?: ListDisplayMode;
  showCompleted?: boolean;
  progressMode?: ListProgressMode;
  sortOrder?: number;
  pinned?: boolean;
};

export type AddListItemInput = {
  listId: string;
  title: string;
  actorType?: ActivityActorType;
  body?: string | null;
  status?: ListItemStatus;
  depth?: number;
  sortOrder?: number;
  listItemParentId?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
};

export type UpdateListItemInput = {
  listItemId: string;
  actorType?: ActivityActorType;
  title?: string;
  body?: string | null;
  status?: ListItemStatus;
  depth?: number;
  sortOrder?: number;
  listItemParentId?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
};

export type ReorderListItemsInput = {
  listId: string;
  actorType?: ActivityActorType;
  items: Array<{
    id: string;
    sortOrder: number;
    depth?: number;
    listItemParentId?: string | null;
  }>;
};

export type BulkCreateListItemsInput = {
  listId: string;
  text: string;
  actorType?: ActivityActorType;
  startSortOrder?: number;
};

export type ListMutationResult = {
  item: ItemRecord;
  list: ListDetailsRecord;
  searchRecord: SearchIndexRecord;
};

export type ListItemMutationResult = {
  listItem: ListItemRecord;
  searchRecord: SearchIndexRecord;
};

export class ListService {
  readonly module = "lists";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: ListServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: ListServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async createList(input: CreateListInput): Promise<ListMutationResult> {
    this.validateCreateListInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const itemRepository = new ItemRepository(this.connection);
      const listRepository = new ListRepository(this.connection);
      const sortOrderService = new SortOrderService({
        connection: this.connection
      });
      const item = itemRepository.create({
        id: this.idFactory("item"),
        workspaceId: input.workspaceId,
        containerId: input.containerId,
        containerTabId: input.containerTabId ?? null,
        type: "list",
        title: input.title.trim(),
        body: normalizeNullableString(input.body),
        categoryId: normalizeNullableString(input.categoryId),
        sortOrder:
          input.sortOrder ??
          sortOrderService.getNextItemSortOrder({
            containerId: input.containerId,
            containerTabId: input.containerTabId ?? null
          }),
        ...(input.pinned === undefined ? {} : { pinned: input.pinned }),
        timestamp
      });
      const list = listRepository.createDetails({
        itemId: item.id,
        workspaceId: input.workspaceId,
        ...(input.displayMode === undefined ? {} : { displayMode: input.displayMode }),
        ...(input.showCompleted === undefined
          ? {}
          : { showCompleted: input.showCompleted }),
        ...(input.progressMode === undefined
          ? {}
          : { progressMode: input.progressMode }),
        timestamp
      });

      this.logListEvent({
        item,
        list,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.listCreated,
        summary: `Created list "${item.title}".`,
        before: null,
        timestamp
      });

      const searchRecord = this.upsertListSearchRecord(item, list, timestamp);

      return { item, list, searchRecord };
    });
  }

  async addListItem(
    input: AddListItemInput
  ): Promise<ListItemMutationResult> {
    this.validateAddListItemInput(input);

    return await this.transactionService.runInTransaction(() =>
      this.createListItemInCurrentTransaction(input)
    );
  }

  async updateListItem(
    input: UpdateListItemInput
  ): Promise<ListItemMutationResult> {
    this.validateUpdateListItemInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireListItem(input.listItemId);
      const patch = this.buildListItemPatch(input, before, timestamp);
      const listItem = new ListRepository(this.connection).updateListItem(
        input.listItemId,
        patch
      );

      this.logListItemEvent({
        listItem,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.listItemUpdated,
        summary: `Updated list item "${listItem.title}".`,
        before,
        timestamp
      });

      const searchRecord = this.upsertListItemSearchRecord(listItem, timestamp);

      return { listItem, searchRecord };
    });
  }

  async completeListItem(
    id: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ListItemMutationResult> {
    validateNonEmptyString(id, "id");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireListItem(id);
      const listItem = new ListRepository(this.connection).updateListItem(id, {
        status: "done",
        completedAt: timestamp,
        timestamp
      });

      this.logListItemEvent({
        listItem,
        actorType,
        action: ActivityAction.listItemCompleted,
        summary: `Completed list item "${listItem.title}".`,
        before,
        timestamp
      });

      const searchRecord = this.upsertListItemSearchRecord(listItem, timestamp);

      return { listItem, searchRecord };
    });
  }

  async reopenListItem(
    id: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ListItemMutationResult> {
    validateNonEmptyString(id, "id");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireListItem(id);
      const listItem = new ListRepository(this.connection).updateListItem(id, {
        status: "open",
        completedAt: null,
        timestamp
      });

      this.logListItemEvent({
        listItem,
        actorType,
        action: ActivityAction.listItemReopened,
        summary: `Reopened list item "${listItem.title}".`,
        before,
        timestamp
      });

      const searchRecord = this.upsertListItemSearchRecord(listItem, timestamp);

      return { listItem, searchRecord };
    });
  }

  async reorderListItems(
    input: ReorderListItemsInput
  ): Promise<ListItemMutationResult[]> {
    this.validateReorderListItemsInput(input);

    return await this.transactionService.runInTransaction(() => {
      this.requireList(input.listId);
      const timestamp = createIsoTimestamp(this.now());
      const repository = new ListRepository(this.connection);
      const results: ListItemMutationResult[] = [];

      for (const itemInput of input.items) {
        const before = this.requireListItem(itemInput.id);

        if (before.listId !== input.listId) {
          throw new Error(`List item does not belong to list: ${itemInput.id}.`);
        }

        if (itemInput.listItemParentId !== undefined) {
          this.validateParent(input.listId, itemInput.id, itemInput.listItemParentId);
        }

        const patch: UpdateListItemPatch = {
          sortOrder: itemInput.sortOrder,
          ...(itemInput.depth === undefined ? {} : { depth: itemInput.depth }),
          ...(itemInput.listItemParentId === undefined
            ? {}
            : { listItemParentId: itemInput.listItemParentId }),
          timestamp
        };
        const listItem = repository.updateListItem(itemInput.id, patch);

        this.logListItemEvent({
          listItem,
          ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
          action: ActivityAction.listItemReordered,
          summary: `Reordered list item "${listItem.title}".`,
          before,
          timestamp
        });

        results.push({
          listItem,
          searchRecord: this.upsertListItemSearchRecord(listItem, timestamp)
        });
      }

      return results;
    });
  }

  async bulkCreateListItems(
    input: BulkCreateListItemsInput
  ): Promise<ListItemMutationResult[]> {
    validateNonEmptyString(input.listId, "listId");
    validateNonEmptyString(input.text, "text");

    return await this.transactionService.runInTransaction(() => {
      const parsedItems = parseBulkListItems(input.text);

      if (parsedItems.length === 0) {
        throw new Error("text must contain at least one list item.");
      }

      const createdByDepth = new Map<number, ListItemRecord>();
      const results: ListItemMutationResult[] = [];
      let nextSortOrder =
        input.startSortOrder ??
        new ListRepository(this.connection).getMaxListItemSortOrder(input.listId) ??
        0;

      for (const parsed of parsedItems) {
        nextSortOrder += 1024;
        const parent = createdByDepth.get(parsed.depth - 1) ?? null;
        const normalizedDepth = parent === null ? 0 : parent.depth + 1;
        const result = this.createListItemInCurrentTransaction({
          listId: input.listId,
          title: parsed.title,
          ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
          status: parsed.status,
          depth: normalizedDepth,
          sortOrder: nextSortOrder,
          listItemParentId: parent?.id ?? null
        });

        createdByDepth.set(normalizedDepth, result.listItem);
        for (const depth of Array.from(createdByDepth.keys())) {
          if (depth > normalizedDepth) {
            createdByDepth.delete(depth);
          }
        }
        results.push(result);
      }

      return results;
    });
  }

  listItems(listId: string): ListItemRecord[] {
    validateNonEmptyString(listId, "listId");

    return new ListRepository(this.connection).listItems(listId);
  }

  listListsByContainer(containerId: string): ListWithItemRecord[] {
    validateNonEmptyString(containerId, "containerId");

    return new ListRepository(this.connection).listByContainer(containerId);
  }

  private createListItemInCurrentTransaction(
    input: AddListItemInput
  ): ListItemMutationResult {
    const timestamp = createIsoTimestamp(this.now());
    const list = this.requireList(input.listId);
    const parent =
      input.listItemParentId === undefined || input.listItemParentId === null
        ? null
        : this.validateParent(input.listId, "", input.listItemParentId);
    const startAt = normalizeTaskDateTime(input.startAt, "startAt") ?? null;
    const dueAt = normalizeTaskDateTime(input.dueAt, "dueAt") ?? null;
    assertTaskDateOrder(startAt, dueAt);

    const status = input.status ?? "open";
    const listItem = new ListRepository(this.connection).createListItem({
      id: this.idFactory("list_item"),
      workspaceId: list.list.workspaceId,
      listId: input.listId,
      title: input.title.trim(),
      body: normalizeNullableString(input.body),
      status,
      depth: input.depth ?? (parent === null ? 0 : parent.depth + 1),
      sortOrder: input.sortOrder ?? this.getNextListItemSortOrder(input.listId),
      listItemParentId: input.listItemParentId ?? null,
      startAt,
      dueAt,
      completedAt: status === "done" ? timestamp : null,
      timestamp
    });

    this.logListItemEvent({
      listItem,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      action: ActivityAction.listItemCreated,
      summary: `Created list item "${listItem.title}".`,
      before: null,
      timestamp
    });

    const searchRecord = this.upsertListItemSearchRecord(listItem, timestamp);

    return { listItem, searchRecord };
  }

  private requireList(itemId: string): ListWithItemRecord {
    const list = new ListRepository(this.connection).getByItemId(itemId);

    if (list === null) {
      throw new Error(`List was not found: ${itemId}.`);
    }

    return list;
  }

  private requireListItem(id: string): ListItemRecord {
    const listItem = new ListRepository(this.connection).getListItemById(id);

    if (listItem === null) {
      throw new Error(`List item was not found: ${id}.`);
    }

    return listItem;
  }

  private validateParent(
    listId: string,
    childId: string,
    parentId: string | null
  ): ListItemRecord | null {
    if (parentId === null) {
      return null;
    }

    if (parentId === childId) {
      throw new Error("listItemParentId cannot reference the same list item.");
    }

    const parent = this.requireListItem(parentId);

    if (parent.listId !== listId) {
      throw new Error("listItemParentId must belong to the same list.");
    }

    return parent;
  }

  private getNextListItemSortOrder(listId: string): number {
    const maxSortOrder = new ListRepository(
      this.connection
    ).getMaxListItemSortOrder(listId);

    return maxSortOrder === null ? 1024 : maxSortOrder + 1024;
  }

  private buildListItemPatch(
    input: UpdateListItemInput,
    before: ListItemRecord,
    timestamp: string
  ): UpdateListItemPatch {
    const patch: UpdateListItemPatch = { timestamp };

    if (input.title !== undefined) {
      patch.title = input.title.trim();
    }

    if (input.body !== undefined) {
      patch.body = normalizeNullableString(input.body);
    }

    if (input.status !== undefined) {
      patch.status = input.status;
      patch.completedAt = input.status === "done" ? timestamp : null;
    }

    if (input.depth !== undefined) {
      patch.depth = input.depth;
    }

    if (input.sortOrder !== undefined) {
      patch.sortOrder = input.sortOrder;
    }

    if (input.listItemParentId !== undefined) {
      this.validateParent(before.listId, input.listItemId, input.listItemParentId);
      patch.listItemParentId = input.listItemParentId;
    }

    if (input.startAt !== undefined) {
      patch.startAt = normalizeTaskDateTime(input.startAt, "startAt") ?? null;
    }

    if (input.dueAt !== undefined) {
      patch.dueAt = normalizeTaskDateTime(input.dueAt, "dueAt") ?? null;
    }

    const nextStartAt =
      patch.startAt === undefined ? before.startAt : patch.startAt;
    const nextDueAt = patch.dueAt === undefined ? before.dueAt : patch.dueAt;
    assertTaskDateOrder(nextStartAt, nextDueAt);

    return patch;
  }

  private upsertListSearchRecord(
    item: ItemRecord,
    list: ListDetailsRecord,
    timestamp: string
  ): SearchIndexRecord {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertItem(item, {
      timestamp,
      metadata: {
        displayMode: list.displayMode,
        showCompleted: list.showCompleted,
        progressMode: list.progressMode
      }
    });
  }

  private upsertListItemSearchRecord(
    listItem: ListItemRecord,
    timestamp: string
  ): SearchIndexRecord {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertListItem(listItem, { timestamp });
  }

  private logListEvent(input: {
    item: ItemRecord;
    list: ListDetailsRecord;
    actorType?: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: ListWithItemRecord | null;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.item.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: input.action,
      targetType: "item",
      targetId: input.item.id,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify({ item: input.item, list: input.list }),
      timestamp: input.timestamp
    });
  }

  private logListItemEvent(input: {
    listItem: ListItemRecord;
    actorType?: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: ListItemRecord | null;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.listItem.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: input.action,
      targetType: "list_item",
      targetId: input.listItem.id,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify(input.listItem),
      timestamp: input.timestamp
    });
  }

  private validateCreateListInput(input: CreateListInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");
    validateNonEmptyString(input.title, "title");

    if (input.displayMode !== undefined && !isListDisplayMode(input.displayMode)) {
      throw new Error("displayMode must be checklist or pipeline.");
    }

    if (
      input.progressMode !== undefined &&
      !isListProgressMode(input.progressMode)
    ) {
      throw new Error("progressMode must be count, manual, or none.");
    }
  }

  private validateAddListItemInput(input: AddListItemInput): void {
    validateNonEmptyString(input.listId, "listId");
    validateNonEmptyString(input.title, "title");
    validateListItemStatus(input.status);
    validateDepth(input.depth);
  }

  private validateUpdateListItemInput(input: UpdateListItemInput): void {
    validateNonEmptyString(input.listItemId, "listItemId");

    if (input.title !== undefined) {
      validateNonEmptyString(input.title, "title");
    }

    validateListItemStatus(input.status);
    validateDepth(input.depth);

    if (
      input.title === undefined &&
      input.body === undefined &&
      input.status === undefined &&
      input.depth === undefined &&
      input.sortOrder === undefined &&
      input.listItemParentId === undefined &&
      input.startAt === undefined &&
      input.dueAt === undefined
    ) {
      throw new Error("At least one list item field must be provided.");
    }
  }

  private validateReorderListItemsInput(input: ReorderListItemsInput): void {
    validateNonEmptyString(input.listId, "listId");

    if (input.items.length === 0) {
      throw new Error("items must contain at least one list item.");
    }

    const ids = new Set<string>();

    for (const item of input.items) {
      validateNonEmptyString(item.id, "id");

      if (ids.has(item.id)) {
        throw new Error("items must not contain duplicate ids.");
      }

      ids.add(item.id);

      if (!Number.isInteger(item.sortOrder)) {
        throw new Error("sortOrder must be an integer.");
      }

      validateDepth(item.depth);
    }
  }
}

export const listsModuleContract = {
  module: "lists",
  purpose: "Manage checklist and structured-list application behavior.",
  owns: ["list operations", "list row ordering", "list progress rules"],
  doesNotOwn: ["project lifecycle", "general task lifecycle", "pipeline UI rendering"],
  integrationPoints: ["projects", "contacts", "tasks", "metadata", "search"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function validateListItemStatus(value: ListItemStatus | undefined): void {
  if (value !== undefined && !isListItemStatus(value)) {
    throw new Error("status must be open, done, waiting, or cancelled.");
  }
}

function validateDepth(value: number | undefined): void {
  if (value === undefined) {
    return;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("depth must be a non-negative integer.");
  }
}

function normalizeNullableString(
  value: string | null | undefined
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
