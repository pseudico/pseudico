import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  createSequentialSortOrders,
  parseDateRangeInput,
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
  SearchIndexRepository,
  SortOrderService,
  TransactionService,
  type DatabaseConnection,
  type ItemRecord,
  type ListDetailsRecord,
  type ListItemRecord,
  type ListWithItemRecord,
  type SearchIndexRecord,
  type UpdateItemPatch,
  type UpdateListDetailsPatch,
  type UpdateListItemPatch
} from "@local-work-os/db";
import {
  assertTaskDateOrder,
  normalizeTaskDateTime
} from "../tasks/TaskQueries";
import {
  PipelineService,
  type MovePipelineCardInput,
  type MovePipelineCardResult,
  type PipelineViewModel
} from "../pipelines";
import { parseBulkListItems } from "./BulkListParser";
import {
  ReminderService,
  type ReminderCreationInput
} from "../reminders/ReminderService";

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
  reminder?: ReminderCreationInput;
};

export type UpdateListInput = {
  itemId: string;
  actorType?: ActivityActorType;
  title?: string;
  body?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  displayMode?: ListDisplayMode;
  showCompleted?: boolean;
  progressMode?: ListProgressMode;
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

export type UpdateListItemDateRangeInput = {
  listItemId: string;
  dateRange: string;
  actorType?: ActivityActorType;
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

export type MoveListItemInput = {
  listItemId: string;
  direction: "up" | "down";
  actorType?: ActivityActorType;
};

export type MoveListItemToListInput = {
  listItemId: string;
  targetListId: string;
  actorType?: ActivityActorType;
  beforeListItemId?: string | null;
  targetListItemParentId?: string | null;
};

export type IndentListItemInput = {
  listItemId: string;
  actorType?: ActivityActorType;
};

export type BulkCreateListItemsInput = {
  listId: string;
  text: string;
  actorType?: ActivityActorType;
  startSortOrder?: number;
};

export type BulkUpdateListItemsOperation =
  | "complete"
  | "delete"
  | "move_up"
  | "move_down"
  | "indent"
  | "outdent";

export type BulkUpdateListItemsInput = {
  listId: string;
  listItemIds: readonly string[];
  operation: BulkUpdateListItemsOperation;
  actorType?: ActivityActorType;
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

export type BulkUpdateListItemResult = {
  listItemId: string;
  ok: boolean;
  listItem?: ListItemRecord;
  searchRecord?: SearchIndexRecord;
  reason?: string;
};

export type BulkUpdateListItemsResult = {
  listId: string;
  operation: BulkUpdateListItemsOperation;
  requestedCount: number;
  changedCount: number;
  skippedCount: number;
  items: BulkUpdateListItemResult[];
  activityId: string | null;
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

    return await this.transactionService.runInTransaction(async () => {
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

  async updateList(input: UpdateListInput): Promise<ListMutationResult> {
    this.validateUpdateListInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireList(input.itemId);

      if (!hasListChanges(input, before)) {
        const searchRecord =
          new SearchIndexRepository(this.connection).getByTarget({
            workspaceId: before.item.workspaceId,
            targetType: "item",
            targetId: before.item.id
          }) ?? this.upsertListSearchRecord(before.item, before.list, before.list.updatedAt);

        return {
          item: before.item,
          list: before.list,
          searchRecord
        };
      }

      const itemPatch: UpdateItemPatch = { timestamp };
      const listPatch: UpdateListDetailsPatch = { timestamp };

      if (input.title !== undefined) {
        itemPatch.title = input.title.trim();
      }

      if (input.body !== undefined) {
        itemPatch.body = normalizeNullableString(input.body);
      }

      if (input.categoryId !== undefined) {
        itemPatch.categoryId = normalizeNullableString(input.categoryId);
      }

      if (input.containerTabId !== undefined) {
        itemPatch.containerTabId = input.containerTabId;
      }

      if (input.displayMode !== undefined) {
        listPatch.displayMode = input.displayMode;
      }

      if (input.showCompleted !== undefined) {
        listPatch.showCompleted = input.showCompleted;
      }

      if (input.progressMode !== undefined) {
        listPatch.progressMode = input.progressMode;
      }

      const item = new ItemRepository(this.connection).update(
        input.itemId,
        itemPatch
      );
      const list = new ListRepository(this.connection).updateDetails(
        input.itemId,
        listPatch
      );

      this.logListEvent({
        item,
        list,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.listUpdated,
        summary: `Updated list "${item.title}".`,
        before,
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

    return await this.transactionService.runInTransaction(async () =>
      await this.createListItemInCurrentTransaction(input)
    );
  }

  async updateListItem(
    input: UpdateListItemInput
  ): Promise<ListItemMutationResult> {
    this.validateUpdateListItemInput(input);

    return await this.transactionService.runInTransaction(async () => {
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
      if (input.status === "done") {
        await this.clearReminderForListItemCompletion({
          listItemId: listItem.id,
          ...(input.actorType === undefined ? {} : { actorType: input.actorType })
        });
      } else if (input.dueAt !== undefined || input.startAt !== undefined) {
        await this.rescheduleReminderForListItemDateChange({
          listItemId: listItem.id,
          ...(input.actorType === undefined ? {} : { actorType: input.actorType })
        });
      }

      return { listItem, searchRecord };
    });
  }

  async updateListItemDateRange(
    input: UpdateListItemDateRangeInput
  ): Promise<ListItemMutationResult> {
    validateNonEmptyString(input.listItemId, "listItemId");

    const parsed = parseDateRangeInput(input.dateRange, {
      referenceDate: this.now()
    });

    return await this.updateListItem({
      listItemId: input.listItemId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      startAt: parsed.startAt,
      dueAt: parsed.dueAt
    });
  }

  async completeListItem(
    id: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ListItemMutationResult> {
    validateNonEmptyString(id, "id");

    return await this.transactionService.runInTransaction(async () => {
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
      await this.clearReminderForListItemCompletion({ listItemId: listItem.id, actorType });

      return { listItem, searchRecord };
    });
  }

  async reopenListItem(
    id: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ListItemMutationResult> {
    validateNonEmptyString(id, "id");

    return await this.transactionService.runInTransaction(async () => {
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

  async indentListItem(
    input: IndentListItemInput
  ): Promise<ListItemMutationResult> {
    validateNonEmptyString(input.listItemId, "listItemId");

    const current = this.requireListItem(input.listItemId);
    const orderedItems = this.listItems(current.listId);
    const currentIndex = orderedItems.findIndex((item) => item.id === current.id);
    const previousItem = currentIndex > 0 ? orderedItems[currentIndex - 1] : undefined;

    if (previousItem === undefined) {
      return this.createUnchangedListItemResult(current);
    }

    const [result] = await this.reorderListItems({
      listId: current.listId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      items: [
        {
          id: current.id,
          sortOrder: current.sortOrder,
          depth: previousItem.depth + 1,
          listItemParentId: previousItem.id
        }
      ]
    });

    return result ?? this.createUnchangedListItemResult(current);
  }

  async outdentListItem(
    input: IndentListItemInput
  ): Promise<ListItemMutationResult> {
    validateNonEmptyString(input.listItemId, "listItemId");

    const current = this.requireListItem(input.listItemId);

    if (current.listItemParentId === null || current.depth <= 0) {
      return this.createUnchangedListItemResult(current);
    }

    const parent = this.requireListItem(current.listItemParentId);
    const grandparent =
      parent.listItemParentId === null ? null : this.requireListItem(parent.listItemParentId);
    const [result] = await this.reorderListItems({
      listId: current.listId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      items: [
        {
          id: current.id,
          sortOrder: current.sortOrder,
          depth: grandparent === null ? 0 : grandparent.depth + 1,
          listItemParentId: grandparent?.id ?? null
        }
      ]
    });

    return result ?? this.createUnchangedListItemResult(current);
  }

  async moveListItem(
    input: MoveListItemInput
  ): Promise<ListItemMutationResult> {
    validateNonEmptyString(input.listItemId, "listItemId");

    if (input.direction !== "up" && input.direction !== "down") {
      throw new Error("direction must be up or down.");
    }

    const current = this.requireListItem(input.listItemId);
    const orderedItems = this.listItems(current.listId);
    const currentIndex = orderedItems.findIndex((item) => item.id === current.id);
    const targetIndex =
      input.direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const target = orderedItems[targetIndex];

    if (currentIndex === -1 || target === undefined) {
      return this.createUnchangedListItemResult(current);
    }

    const results = await this.reorderListItems({
      listId: current.listId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      items: [
        {
          id: current.id,
          sortOrder: target.sortOrder
        },
        {
          id: target.id,
          sortOrder: current.sortOrder
        }
      ]
    });

    return (
      results.find((result) => result.listItem.id === current.id) ??
      this.createUnchangedListItemResult(current)
    );
  }

  async moveListItemToList(
    input: MoveListItemToListInput
  ): Promise<ListItemMutationResult[]> {
    this.validateMoveListItemToListInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const current = this.requireListItem(input.listItemId);
      const targetList = this.requireList(input.targetListId);

      if (targetList.list.workspaceId !== current.workspaceId) {
        throw new Error("targetListId must belong to the same workspace.");
      }

      if (current.listId === input.targetListId) {
        throw new Error("targetListId must be different from the source list.");
      }

      const repository = new ListRepository(this.connection);
      const sourceItems = this.listItems(current.listId);
      const movingItems = collectListItemSubtree(sourceItems, current.id);
      const movingIds = new Set(movingItems.map((item) => item.id));
      const targetItems = this.listItems(input.targetListId).filter(
        (item) => !movingIds.has(item.id)
      );
      const beforeItem =
        input.beforeListItemId === undefined || input.beforeListItemId === null
          ? null
          : this.requireListItem(input.beforeListItemId);

      if (beforeItem !== null && beforeItem.listId !== input.targetListId) {
        throw new Error("beforeListItemId must belong to targetListId.");
      }

      const targetParentId = this.resolveMoveTargetParentId(input, beforeItem);
      const targetParent =
        targetParentId === null
          ? null
          : this.validateParent(input.targetListId, current.id, targetParentId);
      const rootDepth =
        targetParent === null ? beforeItem?.depth ?? 0 : targetParent.depth + 1;
      const movedItems = movingItems.map((item) => ({
        ...item,
        listId: input.targetListId,
        listItemParentId:
          item.id === current.id ? targetParentId : item.listItemParentId,
        depth: rootDepth + Math.max(0, item.depth - current.depth)
      }));
      const movedById = new Map(movedItems.map((item) => [item.id, item]));
      const movingBeforeById = new Map(movingItems.map((item) => [item.id, item]));
      const insertIndex =
        beforeItem === null
          ? targetItems.length
          : Math.max(
              0,
              targetItems.findIndex((item) => item.id === beforeItem.id)
            );
      const targetSequence = [
        ...targetItems.slice(0, insertIndex),
        ...movedItems,
        ...targetItems.slice(insertIndex)
      ];
      const sourceSequence = sourceItems.filter((item) => !movingIds.has(item.id));
      const results: ListItemMutationResult[] = [];

      for (const order of createSequentialSortOrders(
        sourceSequence.map((item) => item.id)
      )) {
        const item = sourceSequence.find((candidate) => candidate.id === order.id);

        if (item !== undefined && item.sortOrder !== order.sortOrder) {
          results.push(
            this.updateMovedListItem({
              before: item,
              patch: { sortOrder: order.sortOrder, timestamp },
              repository,
              summary: `Repaired source list ordering for "${item.title}".`,
              timestamp,
              ...(input.actorType === undefined ? {} : { actorType: input.actorType })
            })
          );
        }
      }

      for (const order of createSequentialSortOrders(
        targetSequence.map((item) => item.id)
      )) {
        const item = targetSequence.find((candidate) => candidate.id === order.id);

        if (item === undefined) {
          continue;
        }

        const movedItem = movedById.get(item.id) ?? item;
        const before = movingBeforeById.get(item.id) ?? item;
        const patch: UpdateListItemPatch = {
          listId: movedItem.listId,
          listItemParentId: movedItem.listItemParentId,
          depth: movedItem.depth,
          sortOrder: order.sortOrder,
          timestamp
        };

        if (!hasListItemMovePatchChanged(before, patch)) {
          continue;
        }

        results.push(
          this.updateMovedListItem({
            before,
            patch,
            repository,
            summary:
              item.id === current.id
                ? `Moved list item "${item.title}" to "${targetList.item.title}".`
                : `Moved child list item "${item.title}" with its parent.`,
            timestamp,
            ...(input.actorType === undefined ? {} : { actorType: input.actorType })
          })
        );
      }

      return sortMoveResults(results, movingItems.map((item) => item.id));
    });
  }

  async bulkCreateListItems(
    input: BulkCreateListItemsInput
  ): Promise<ListItemMutationResult[]> {
    validateNonEmptyString(input.listId, "listId");
    validateNonEmptyString(input.text, "text");

    return await this.transactionService.runInTransaction(async () => {
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
        const result = await this.createListItemInCurrentTransaction({
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

  async bulkUpdateListItems(
    input: BulkUpdateListItemsInput
  ): Promise<BulkUpdateListItemsResult> {
    this.validateBulkUpdateListItemsInput(input);

    return await this.transactionService.runInTransaction(async () => {
      this.requireList(input.listId);
      const timestamp = createIsoTimestamp(this.now());
      const uniqueListItemIds = uniqueIds(input.listItemIds);
      const beforeItems = this.listItems(input.listId, { includeDeleted: false });
      const selectedIds = new Set(uniqueListItemIds);
      const repository = new ListRepository(this.connection);
      const results: BulkUpdateListItemResult[] = [];

      switch (input.operation) {
        case "complete":
          for (const listItemId of uniqueListItemIds) {
            const before = this.requireBulkListItem(input.listId, listItemId);

            if (before.status === "done") {
              results.push({
                listItemId,
                ok: false,
                listItem: before,
                reason: "List item is already complete.",
                searchRecord: this.upsertListItemSearchRecord(before, timestamp)
              });
              continue;
            }

            const listItem = repository.updateListItem(listItemId, {
              status: "done",
              completedAt: timestamp,
              timestamp
            });
            results.push(this.toBulkListItemResult(listItem, timestamp));
            await this.clearReminderForListItemCompletion({
              listItemId: listItem.id,
              ...(input.actorType === undefined ? {} : { actorType: input.actorType })
            });
          }
          break;
        case "delete":
          for (const listItemId of uniqueListItemIds) {
            this.requireBulkListItem(input.listId, listItemId);
            const listItem = repository.softDeleteListItem(listItemId, timestamp);
            results.push(this.toBulkListItemResult(listItem, timestamp));
          }
          break;
        case "indent":
          for (const before of beforeItems) {
            if (!selectedIds.has(before.id)) {
              continue;
            }

            const previousItem = beforeItems[beforeItems.indexOf(before) - 1];
            if (previousItem === undefined) {
              results.push({
                listItemId: before.id,
                ok: false,
                listItem: before,
                reason: "First list item cannot be indented.",
                searchRecord: this.upsertListItemSearchRecord(before, timestamp)
              });
              continue;
            }

            const listItem = repository.updateListItem(before.id, {
              depth: previousItem.depth + 1,
              listItemParentId: previousItem.id,
              timestamp
            });
            results.push(this.toBulkListItemResult(listItem, timestamp));
          }
          break;
        case "outdent":
          for (const before of beforeItems) {
            if (!selectedIds.has(before.id)) {
              continue;
            }

            if (before.listItemParentId === null || before.depth <= 0) {
              results.push({
                listItemId: before.id,
                ok: false,
                listItem: before,
                reason: "List item is already at the top indentation level.",
                searchRecord: this.upsertListItemSearchRecord(before, timestamp)
              });
              continue;
            }

            const parent = this.requireListItem(before.listItemParentId);
            const grandparent =
              parent.listItemParentId === null
                ? null
                : this.requireListItem(parent.listItemParentId);
            const listItem = repository.updateListItem(before.id, {
              depth: grandparent === null ? 0 : grandparent.depth + 1,
              listItemParentId: grandparent?.id ?? null,
              timestamp
            });
            results.push(this.toBulkListItemResult(listItem, timestamp));
          }
          break;
        case "move_up":
        case "move_down":
          results.push(
            ...this.bulkMoveListItems({
              listId: input.listId,
              selectedIds,
              direction: input.operation === "move_up" ? "up" : "down",
              timestamp
            })
          );
          break;
      }

      return this.finishBulkListItemOperation(input, {
        results,
        timestamp
      });
    });
  }

  async enablePipelineMode(
    listId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ListMutationResult> {
    const result = await new PipelineService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).enablePipelineMode(listId, actorType);

    return result;
  }

  async disablePipelineMode(
    listId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ListMutationResult> {
    const result = await new PipelineService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).disablePipelineMode(listId, actorType);

    return result;
  }

  getPipelineViewModel(listId: string): PipelineViewModel {
    return new PipelineService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).getPipelineViewModel(listId);
  }

  async movePipelineCard(
    input: MovePipelineCardInput
  ): Promise<MovePipelineCardResult> {
    return await new PipelineService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).movePipelineCard(input);
  }

  listItems(
    listId: string,
    filters: { includeDeleted?: boolean; includeArchived?: boolean } = {}
  ): ListItemRecord[] {
    validateNonEmptyString(listId, "listId");

    return new ListRepository(this.connection).listItems(listId, filters);
  }

  listListsByContainer(containerId: string): ListWithItemRecord[] {
    validateNonEmptyString(containerId, "containerId");

    return new ListRepository(this.connection).listByContainer(containerId);
  }

  private bulkMoveListItems(input: {
    listId: string;
    selectedIds: Set<string>;
    direction: "up" | "down";
    timestamp: string;
  }): BulkUpdateListItemResult[] {
    const repository = new ListRepository(this.connection);
    const orderedItems = this.listItems(input.listId);
    const targetOrder = [...orderedItems];
    const indexes =
      input.direction === "up"
        ? orderedItems.map((_, index) => index)
        : orderedItems.map((_, index) => index).reverse();

    for (const index of indexes) {
      const item = targetOrder[index];
      const swapIndex = input.direction === "up" ? index - 1 : index + 1;
      const swapItem = targetOrder[swapIndex];

      if (
        item === undefined ||
        swapItem === undefined ||
        !input.selectedIds.has(item.id) ||
        input.selectedIds.has(swapItem.id)
      ) {
        continue;
      }

      targetOrder[swapIndex] = item;
      targetOrder[index] = swapItem;
    }

    const originalById = new Map(orderedItems.map((item) => [item.id, item]));
    const sortOrders = orderedItems.map((item) => item.sortOrder);
    const changedIds = new Set<string>();
    const results: BulkUpdateListItemResult[] = [];

    targetOrder.forEach((item, index) => {
      const before = originalById.get(item.id);
      const nextSortOrder = sortOrders[index] ?? item.sortOrder;

      if (before === undefined || before.sortOrder === nextSortOrder) {
        return;
      }

      const listItem = repository.updateListItem(item.id, {
        sortOrder: nextSortOrder,
        timestamp: input.timestamp
      });
      changedIds.add(item.id);

      if (input.selectedIds.has(item.id)) {
        results.push(this.toBulkListItemResult(listItem, input.timestamp));
      }
    });

    for (const itemId of input.selectedIds) {
      if (!orderedItems.some((item) => item.id === itemId)) {
        throw new Error(`List item does not belong to list: ${itemId}.`);
      }

      if (!changedIds.has(itemId)) {
        const listItem = this.requireListItem(itemId);
        results.push({
          listItemId: itemId,
          ok: false,
          listItem,
          reason:
            input.direction === "up"
              ? "List item cannot move above the first row."
              : "List item cannot move below the last row.",
          searchRecord: this.upsertListItemSearchRecord(listItem, input.timestamp)
        });
      }
    }

    return sortResultsByRequestedOrder(results, Array.from(input.selectedIds));
  }

  private toBulkListItemResult(
    listItem: ListItemRecord,
    timestamp: string
  ): BulkUpdateListItemResult {
    return {
      listItemId: listItem.id,
      ok: true,
      listItem,
      searchRecord: this.upsertListItemSearchRecord(listItem, timestamp)
    };
  }

  private finishBulkListItemOperation(
    input: BulkUpdateListItemsInput,
    details: {
      results: BulkUpdateListItemResult[];
      timestamp: string;
    }
  ): BulkUpdateListItemsResult {
    const changedCount = countBulkListItemChanges(details.results);
    const activityId =
      details.results.length === 0
        ? null
        : this.logBulkListItemEvent({
            listId: input.listId,
            actorType: input.actorType ?? "local_user",
            operation: input.operation,
            summary: summarizeBulkListItemOperation(input.operation, changedCount),
            results: details.results,
            timestamp: details.timestamp
          });

    return {
      listId: input.listId,
      operation: input.operation,
      requestedCount: uniqueIds(input.listItemIds).length,
      changedCount,
      skippedCount: details.results.length - changedCount,
      items: sortResultsByRequestedOrder(details.results, uniqueIds(input.listItemIds)),
      activityId
    };
  }

  private logBulkListItemEvent(input: {
    listId: string;
    actorType: ActivityActorType;
    operation: BulkUpdateListItemsOperation;
    summary: string;
    results: BulkUpdateListItemResult[];
    timestamp: string;
  }): string {
    const list = this.requireList(input.listId);
    const event = new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: list.list.workspaceId,
      actorType: input.actorType,
      action: actionForBulkListItemOperation(input.operation),
      targetType: "item",
      targetId: input.listId,
      summary: input.summary,
      beforeJson: null,
      afterJson: JSON.stringify({
        operation: input.operation,
        changedCount: countBulkListItemChanges(input.results),
        skippedCount:
          input.results.length - countBulkListItemChanges(input.results),
        targets: input.results.map((result) => ({
          listItemId: result.listItemId,
          ok: result.ok,
          reason: result.reason ?? null,
          title: result.listItem?.title ?? null
        }))
      }),
      timestamp: input.timestamp
    });

    return event.id;
  }

  private resolveMoveTargetParentId(
    input: MoveListItemToListInput,
    beforeItem: ListItemRecord | null
  ): string | null {
    if (input.targetListItemParentId !== undefined) {
      return input.targetListItemParentId;
    }

    return beforeItem?.listItemParentId ?? null;
  }

  private updateMovedListItem(input: {
    before: ListItemRecord;
    patch: UpdateListItemPatch;
    repository: ListRepository;
    summary: string;
    timestamp: string;
    actorType?: ActivityActorType;
  }): ListItemMutationResult {
    const listItem = input.repository.updateListItem(input.before.id, input.patch);

    this.logListItemEvent({
      listItem,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      action: ActivityAction.listItemReordered,
      summary: input.summary,
      before: input.before,
      timestamp: input.timestamp
    });

    return {
      listItem,
      searchRecord: this.upsertListItemSearchRecord(listItem, input.timestamp)
    };
  }

  private async createListItemInCurrentTransaction(
    input: AddListItemInput
  ): Promise<ListItemMutationResult> {
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
    await this.applyCreationReminder({
      workspaceId: list.list.workspaceId,
      listItemId: listItem.id,
      ...(input.reminder === undefined ? {} : { reminder: input.reminder }),
      ...(input.actorType === undefined ? {} : { actorType: input.actorType })
    });

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

  private requireBulkListItem(listId: string, listItemId: string): ListItemRecord {
    const listItem = this.requireListItem(listItemId);

    if (listItem.listId !== listId) {
      throw new Error(`List item does not belong to list: ${listItemId}.`);
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

  private createUnchangedListItemResult(
    listItem: ListItemRecord
  ): ListItemMutationResult {
    const searchRecord = new SearchIndexRepository(this.connection).getByTarget({
      workspaceId: listItem.workspaceId,
      targetType: "list_item",
      targetId: listItem.id
    });

    if (searchRecord !== null) {
      return { listItem, searchRecord };
    }

    return {
      listItem,
      searchRecord: this.upsertListItemSearchRecord(
        listItem,
        createIsoTimestamp(this.now())
      )
    };
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

  private async rescheduleReminderForListItemDateChange(input: {
    listItemId: string;
    actorType?: ActivityActorType;
  }): Promise<void> {
    await new ReminderService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).rescheduleReminderForListItemDateChange({
      listItemId: input.listItemId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType })
    });
  }

  private async clearReminderForListItemCompletion(input: {
    listItemId: string;
    actorType?: ActivityActorType;
  }): Promise<void> {
    await new ReminderService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).clearListItemReminder({
      listItemId: input.listItemId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType })
    });
  }

  private async applyCreationReminder(input: {
    workspaceId: string;
    listItemId: string;
    reminder?: ReminderCreationInput;
    actorType?: ActivityActorType;
  }): Promise<void> {
    if (input.reminder?.mode === "none") {
      return;
    }

    const reminderService = new ReminderService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });

    if (input.reminder === undefined || input.reminder.mode === "default") {
      await reminderService.applyDefaultListItemReminder({
        workspaceId: input.workspaceId,
        listItemId: input.listItemId,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });
      return;
    }

    await reminderService.setListItemReminder({
      workspaceId: input.workspaceId,
      listItemId: input.listItemId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      ...(input.reminder.mode === "absolute"
        ? {
            triggerAt: input.reminder.triggerAt,
            ...(input.reminder.anchor === undefined ? {} : { anchor: input.reminder.anchor })
          }
        : {
            leadMinutes: input.reminder.leadMinutes,
            ...(input.reminder.anchor === undefined ? {} : { anchor: input.reminder.anchor })
          })
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

  private validateUpdateListInput(input: UpdateListInput): void {
    validateNonEmptyString(input.itemId, "itemId");

    if (input.title !== undefined) {
      validateNonEmptyString(input.title, "title");
    }

    if (input.displayMode !== undefined && !isListDisplayMode(input.displayMode)) {
      throw new Error("displayMode must be checklist or pipeline.");
    }

    if (
      input.progressMode !== undefined &&
      !isListProgressMode(input.progressMode)
    ) {
      throw new Error("progressMode must be count, manual, or none.");
    }

    if (
      input.title === undefined &&
      input.body === undefined &&
      input.categoryId === undefined &&
      input.containerTabId === undefined &&
      input.displayMode === undefined &&
      input.showCompleted === undefined &&
      input.progressMode === undefined
    ) {
      throw new Error("At least one list field must be provided.");
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

  private validateMoveListItemToListInput(input: MoveListItemToListInput): void {
    validateNonEmptyString(input.listItemId, "listItemId");
    validateNonEmptyString(input.targetListId, "targetListId");

    if (input.beforeListItemId !== undefined && input.beforeListItemId !== null) {
      validateNonEmptyString(input.beforeListItemId, "beforeListItemId");
    }

    if (
      input.targetListItemParentId !== undefined &&
      input.targetListItemParentId !== null
    ) {
      validateNonEmptyString(
        input.targetListItemParentId,
        "targetListItemParentId"
      );
    }

  }

  private validateBulkUpdateListItemsInput(input: BulkUpdateListItemsInput): void {
    validateNonEmptyString(input.listId, "listId");

    if (uniqueIds(input.listItemIds).length === 0) {
      throw new Error("listItemIds must include at least one list item.");
    }

    if (!isBulkUpdateListItemsOperation(input.operation)) {
      throw new Error("operation must be complete, delete, move_up, move_down, indent, or outdent.");
    }

    for (const listItemId of uniqueIds(input.listItemIds)) {
      validateNonEmptyString(listItemId, "listItemId");
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

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function countBulkListItemChanges(
  results: readonly BulkUpdateListItemResult[]
): number {
  return results.filter((result) => result.ok).length;
}

function sortResultsByRequestedOrder(
  results: readonly BulkUpdateListItemResult[],
  requestedIds: readonly string[]
): BulkUpdateListItemResult[] {
  const order = new Map(requestedIds.map((id, index) => [id, index]));

  return [...results].sort(
    (left, right) =>
      (order.get(left.listItemId) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.listItemId) ?? Number.MAX_SAFE_INTEGER)
  );
}

function collectListItemSubtree(
  items: readonly ListItemRecord[],
  rootId: string
): ListItemRecord[] {
  const root = items.find((item) => item.id === rootId);

  if (root === undefined) {
    throw new Error(`List item was not found in source list: ${rootId}.`);
  }

  const childrenByParent = new Map<string, ListItemRecord[]>();

  for (const item of items) {
    if (item.listItemParentId === null) {
      continue;
    }

    const children = childrenByParent.get(item.listItemParentId) ?? [];
    children.push(item);
    childrenByParent.set(item.listItemParentId, children);
  }

  const subtree: ListItemRecord[] = [];
  const visit = (item: ListItemRecord): void => {
    subtree.push(item);

    for (const child of childrenByParent.get(item.id) ?? []) {
      visit(child);
    }
  };

  visit(root);

  return subtree;
}

function hasListItemMovePatchChanged(
  before: ListItemRecord,
  patch: UpdateListItemPatch
): boolean {
  return (
    (patch.listId !== undefined && patch.listId !== before.listId) ||
    (patch.listItemParentId !== undefined &&
      patch.listItemParentId !== before.listItemParentId) ||
    (patch.depth !== undefined && patch.depth !== before.depth) ||
    (patch.sortOrder !== undefined && patch.sortOrder !== before.sortOrder)
  );
}

function hasListChanges(input: UpdateListInput, before: ListWithItemRecord): boolean {
  return (
    (input.title !== undefined && input.title.trim() !== before.item.title) ||
    (input.body !== undefined &&
      normalizeNullableString(input.body) !== before.item.body) ||
    (input.categoryId !== undefined &&
      normalizeNullableString(input.categoryId) !== before.item.categoryId) ||
    (input.containerTabId !== undefined &&
      input.containerTabId !== before.item.containerTabId) ||
    (input.displayMode !== undefined &&
      input.displayMode !== before.list.displayMode) ||
    (input.showCompleted !== undefined &&
      input.showCompleted !== before.list.showCompleted) ||
    (input.progressMode !== undefined &&
      input.progressMode !== before.list.progressMode)
  );
}

function sortMoveResults(
  results: readonly ListItemMutationResult[],
  movedIds: readonly string[]
): ListItemMutationResult[] {
  const order = new Map(movedIds.map((id, index) => [id, index]));

  return [...results].sort((left, right) => {
    const leftOrder = order.get(left.listItem.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right.listItem.id) ?? Number.MAX_SAFE_INTEGER;

    return leftOrder - rightOrder;
  });
}

function isBulkUpdateListItemsOperation(
  value: string
): value is BulkUpdateListItemsOperation {
  return (
    value === "complete" ||
    value === "delete" ||
    value === "move_up" ||
    value === "move_down" ||
    value === "indent" ||
    value === "outdent"
  );
}

function actionForBulkListItemOperation(
  operation: BulkUpdateListItemsOperation
): typeof ActivityAction[keyof typeof ActivityAction] {
  switch (operation) {
    case "complete":
      return ActivityAction.bulkListItemsCompleted;
    case "delete":
      return ActivityAction.bulkListItemsDeleted;
    case "move_up":
    case "move_down":
      return ActivityAction.bulkListItemsMoved;
    case "indent":
      return ActivityAction.bulkListItemsIndented;
    case "outdent":
      return ActivityAction.bulkListItemsOutdented;
  }
}

function summarizeBulkListItemOperation(
  operation: BulkUpdateListItemsOperation,
  changedCount: number
): string {
  const suffix = changedCount === 1 ? "list item" : "list items";

  switch (operation) {
    case "complete":
      return `Completed ${changedCount} selected ${suffix}.`;
    case "delete":
      return `Soft-deleted ${changedCount} selected ${suffix}.`;
    case "move_up":
      return `Moved ${changedCount} selected ${suffix} up.`;
    case "move_down":
      return `Moved ${changedCount} selected ${suffix} down.`;
    case "indent":
      return `Indented ${changedCount} selected ${suffix}.`;
    case "outdent":
      return `Outdented ${changedCount} selected ${suffix}.`;
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
