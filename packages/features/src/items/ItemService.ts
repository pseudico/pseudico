import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  isItemStatus,
  isItemType,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ItemRepository,
  SearchIndexService,
  SortOrderService,
  TransactionService,
  type DatabaseConnection,
  type ItemRecord,
  type SearchIndexRecord,
  type UpdateItemPatch
} from "@local-work-os/db";
import type {
  CreateItemInput,
  ItemMutationResult,
  ItemServiceIdFactory,
  ListItemsByContainerInput,
  ListItemsByContainerTabInput,
  MoveItemInput,
  UpdateItemInput
} from "./ItemCommands";

// Owns universal item lifecycle operations and mixed feed queries.
// Does not own type-specific task/list/note/file/link payload behavior.
export class ItemService {
  readonly module = "items";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: ItemServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: ItemServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async createItem(input: CreateItemInput): Promise<ItemMutationResult> {
    this.validateCreateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const itemRepository = new ItemRepository(this.connection);
      const sortOrderService = new SortOrderService({
        connection: this.connection
      });
      const item = itemRepository.create({
        id: this.idFactory("item"),
        workspaceId: input.workspaceId,
        containerId: input.containerId,
        containerTabId: input.containerTabId ?? null,
        type: input.type,
        title: input.title.trim(),
        body: normalizeNullableString(input.body),
        categoryId: normalizeNullableString(input.categoryId),
        status: input.status ?? "active",
        sortOrder:
          input.sortOrder ??
          sortOrderService.getNextItemSortOrder({
            containerId: input.containerId,
            containerTabId: input.containerTabId ?? null
          }),
        ...(input.pinned === undefined ? {} : { pinned: input.pinned }),
        timestamp
      });
      const searchRecord = this.upsertSearchRecord(item, timestamp);

      this.logItemEvent({
        item,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.itemCreated,
        summary: `Created ${item.type} "${item.title}".`,
        before: null,
        after: item,
        timestamp
      });

      return { item, searchRecord };
    });
  }

  async updateItem(input: UpdateItemInput): Promise<ItemMutationResult> {
    this.validateUpdateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireItem(input.itemId);
      const itemRepository = new ItemRepository(this.connection);
      const patch: UpdateItemPatch = { timestamp };

      if (input.title !== undefined) {
        patch.title = input.title.trim();
      }

      if (input.body !== undefined) {
        patch.body = normalizeNullableString(input.body);
      }

      if (input.categoryId !== undefined) {
        patch.categoryId = normalizeNullableString(input.categoryId);
      }

      if (input.status !== undefined) {
        patch.status = input.status;
      }

      if (input.sortOrder !== undefined) {
        patch.sortOrder = input.sortOrder;
      }

      if (input.pinned !== undefined) {
        patch.pinned = input.pinned;
      }

      if (input.completedAt !== undefined) {
        patch.completedAt = normalizeNullableString(input.completedAt);
      }

      if (input.containerTabId !== undefined) {
        patch.containerTabId = input.containerTabId;
      }

      const item = itemRepository.update(input.itemId, patch);
      const searchRecord = this.upsertSearchRecord(item, timestamp);

      this.logItemEvent({
        item,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.itemUpdated,
        summary: `Updated ${item.type} "${item.title}".`,
        before,
        after: item,
        timestamp
      });

      return { item, searchRecord };
    });
  }

  async moveItem(input: MoveItemInput): Promise<ItemMutationResult> {
    this.validateMoveInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireItem(input.itemId);
      const sortOrder =
        input.sortOrder ??
        new SortOrderService({ connection: this.connection }).getNextItemSortOrder({
          containerId: input.targetContainerId,
          containerTabId: input.targetContainerTabId ?? null
        });
      const item = new ItemRepository(this.connection).move({
        id: input.itemId,
        targetContainerId: input.targetContainerId,
        targetTabId: input.targetContainerTabId ?? null,
        sortOrder,
        timestamp
      });
      const searchRecord = this.upsertSearchRecord(item, timestamp);

      this.logItemEvent({
        item,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.itemMoved,
        summary: `Moved ${item.type} "${item.title}".`,
        before,
        after: item,
        timestamp
      });

      return { item, searchRecord };
    });
  }

  async archiveItem(
    itemId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ItemMutationResult> {
    validateNonEmptyString(itemId, "itemId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireItem(itemId);
      const item = new ItemRepository(this.connection).archive(itemId, timestamp);
      const searchRecord = this.upsertSearchRecord(item, timestamp);

      this.logItemEvent({
        item,
        actorType,
        action: ActivityAction.itemArchived,
        summary: `Archived ${item.type} "${item.title}".`,
        before,
        after: item,
        timestamp
      });

      return { item, searchRecord };
    });
  }

  async softDeleteItem(
    itemId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ItemMutationResult> {
    validateNonEmptyString(itemId, "itemId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireItem(itemId);
      const item = new ItemRepository(this.connection).softDelete(
        itemId,
        timestamp
      );
      const searchRecord = this.upsertSearchRecord(item, timestamp);

      this.logItemEvent({
        item,
        actorType,
        action: ActivityAction.itemDeleted,
        summary: `Soft-deleted ${item.type} "${item.title}".`,
        before,
        after: item,
        timestamp
      });

      return { item, searchRecord };
    });
  }

  listItemsByContainer(input: ListItemsByContainerInput): ItemRecord[] {
    validateNonEmptyString(input.containerId, "containerId");

    return new ItemRepository(this.connection).listByContainer(input.containerId, {
      ...buildListItemsFilter(input)
    });
  }

  listItemsByContainerTab(input: ListItemsByContainerTabInput): ItemRecord[] {
    validateNonEmptyString(input.containerId, "containerId");
    validateNonEmptyString(input.containerTabId, "containerTabId");

    return new ItemRepository(this.connection).listByContainerTab(
      input.containerId,
      input.containerTabId,
      buildListItemsFilter(input)
    );
  }

  private requireItem(itemId: string): ItemRecord {
    const item = new ItemRepository(this.connection).getById(itemId);

    if (item === null) {
      throw new Error(`Item was not found: ${itemId}.`);
    }

    return item;
  }

  private upsertSearchRecord(
    item: ItemRecord,
    timestamp: string
  ): SearchIndexRecord {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertItem(item, { timestamp });
  }

  private logItemEvent(input: {
    item: ItemRecord;
    actorType?: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: ItemRecord | null;
    after: ItemRecord;
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
      afterJson: JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }

  private validateCreateInput(input: CreateItemInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");
    validateNonEmptyString(input.title, "title");

    if (!isItemType(input.type)) {
      throw new Error("type must be a supported item type.");
    }

    if (input.status !== undefined && !isItemStatus(input.status)) {
      throw new Error("status must be active, waiting, completed, or archived.");
    }
  }

  private validateUpdateInput(input: UpdateItemInput): void {
    validateNonEmptyString(input.itemId, "itemId");

    if (input.title !== undefined) {
      validateNonEmptyString(input.title, "title");
    }

    if (input.status !== undefined && !isItemStatus(input.status)) {
      throw new Error("status must be active, waiting, completed, or archived.");
    }

    if (
      input.title === undefined &&
      input.body === undefined &&
      input.categoryId === undefined &&
      input.completedAt === undefined &&
      input.containerTabId === undefined &&
      input.pinned === undefined &&
      input.sortOrder === undefined &&
      input.status === undefined
    ) {
      throw new Error("At least one item field must be provided.");
    }
  }

  private validateMoveInput(input: MoveItemInput): void {
    validateNonEmptyString(input.itemId, "itemId");
    validateNonEmptyString(input.targetContainerId, "targetContainerId");
  }
}

export const itemsModuleContract = {
  module: "items",
  purpose: "Manage universal item lifecycle operations and mixed content feed queries.",
  owns: ["item lifecycle operations", "item feed queries", "item ordering coordination"],
  doesNotOwn: ["type-specific payload internals", "raw renderer database access", "filesystem behavior"],
  integrationPoints: ["projects", "inbox", "tasks", "lists", "notes", "files", "links", "search", "activity log"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
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

function buildListItemsFilter(
  input: ListItemsByContainerInput | ListItemsByContainerTabInput
) {
  return {
    ...(input.type === undefined ? {} : { type: input.type }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.includeArchived === undefined
      ? {}
      : { includeArchived: input.includeArchived }),
    ...(input.includeDeleted === undefined
      ? {}
      : { includeDeleted: input.includeDeleted })
  };
}
