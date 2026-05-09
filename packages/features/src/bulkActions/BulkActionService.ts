import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  slugifyTagName,
  taskStatusToItemStatus,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  CategoryRepository,
  ItemRepository,
  SearchIndexService,
  SortOrderService,
  TagRepository,
  TaskRepository,
  TransactionService,
  type CategoryRecord,
  type DatabaseConnection,
  type ItemRecord,
  type SearchIndexRecord,
  type TagRecord
} from "@local-work-os/db";

export type BulkActionServiceIdFactory = (prefix: string) => string;

export type BulkActionItemResult = {
  itemId: string;
  ok: boolean;
  item?: ItemRecord;
  searchRecord?: SearchIndexRecord;
  reason?: string;
};

export type BulkActionResult = {
  workspaceId: string;
  operation: BulkActionOperation;
  requestedCount: number;
  changedCount: number;
  skippedCount: number;
  items: BulkActionItemResult[];
  activityId: string | null;
  export?: BulkExportResult;
};

export type BulkActionOperation =
  | "move"
  | "tag"
  | "category"
  | "archive"
  | "delete"
  | "complete"
  | "export";

export type BulkMoveItemsInput = BulkBaseInput & {
  targetContainerId: string;
  targetContainerTabId?: string | null;
};

export type BulkTagItemsInput = BulkBaseInput & {
  tagName: string;
};

export type BulkCategorizeItemsInput = BulkBaseInput & {
  categoryId: string | null;
};

export type BulkExportItemsInput = BulkBaseInput & {
  format?: "markdown";
};

export type BulkBaseInput = {
  workspaceId: string;
  itemIds: readonly string[];
  actorType?: ActivityActorType;
};

export type BulkExportResult = {
  format: "markdown";
  contents: string;
  itemCount: number;
};

// Owns service-layer bulk item operations. UI selection state is handled by
// SelectionStore; persistence stays in existing repositories/services.
export class BulkActionService {
  readonly module = "bulkActions";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: BulkActionServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: BulkActionServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async moveItems(input: BulkMoveItemsInput): Promise<BulkActionResult> {
    validateRunInput(input);
    validateNonEmptyString(input.targetContainerId, "targetContainerId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new ItemRepository(this.connection);
      const search = this.createSearchService();
      const results: BulkActionItemResult[] = [];
      const sortOrderService = new SortOrderService({
        connection: this.connection
      });

      for (const itemId of uniqueIds(input.itemIds)) {
        const item = this.requireWorkspaceItem(input.workspaceId, itemId);
        const sortOrder = sortOrderService.getNextItemSortOrder({
          containerId: input.targetContainerId,
          containerTabId: input.targetContainerTabId ?? null
        });
        const moved = repository.move({
          id: item.id,
          targetContainerId: input.targetContainerId,
          targetTabId: input.targetContainerTabId ?? null,
          sortOrder,
          timestamp
        });

        results.push({
          itemId,
          ok: true,
          item: moved,
          searchRecord: search.upsertItem(moved, { timestamp })
        });
      }

      return this.finishBulkOperation(input, {
        operation: "move",
        results,
        timestamp,
        summary: `Moved ${results.length} selected item${results.length === 1 ? "" : "s"}.`,
        after: {
          targetContainerId: input.targetContainerId,
          targetContainerTabId: input.targetContainerTabId ?? null
        }
      });
    });
  }

  async tagItems(input: BulkTagItemsInput): Promise<BulkActionResult> {
    validateRunInput(input);
    validateNonEmptyString(input.tagName, "tagName");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const tag = this.findOrCreateTag(input, timestamp);
      const repository = new TagRepository(this.connection);
      const search = this.createSearchService();
      const results: BulkActionItemResult[] = [];

      for (const itemId of uniqueIds(input.itemIds)) {
        const item = this.requireWorkspaceItem(input.workspaceId, itemId);
        const before = repository.findActiveTagging({
          workspaceId: input.workspaceId,
          tagId: tag.id,
          targetType: "item",
          targetId: item.id
        });

        repository.createTagging({
          id: this.idFactory("tagging"),
          workspaceId: input.workspaceId,
          tagId: tag.id,
          targetType: "item",
          targetId: item.id,
          source: "manual",
          timestamp
        });

        results.push({
          itemId,
          ok: before === null,
          item,
          searchRecord: search.upsertItem(item, { timestamp }),
          ...(before === null ? {} : { reason: "Tag already assigned." })
        });
      }

      return this.finishBulkOperation(input, {
        operation: "tag",
        results,
        timestamp,
        summary: `Added @${tag.slug} to ${countChanged(results)} selected item${countChanged(results) === 1 ? "" : "s"}.`,
        after: { tag }
      });
    });
  }

  async categorizeItems(
    input: BulkCategorizeItemsInput
  ): Promise<BulkActionResult> {
    validateRunInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const category = this.resolveCategory(input.workspaceId, input.categoryId);
      const repository = new ItemRepository(this.connection);
      const search = this.createSearchService();
      const results: BulkActionItemResult[] = [];

      for (const itemId of uniqueIds(input.itemIds)) {
        const item = this.requireWorkspaceItem(input.workspaceId, itemId);
        const updated = repository.update(item.id, {
          categoryId: category?.id ?? null,
          timestamp
        });

        results.push({
          itemId,
          ok: item.categoryId !== updated.categoryId,
          item: updated,
          searchRecord: search.upsertItem(updated, { timestamp }),
          ...(item.categoryId === updated.categoryId
            ? { reason: "Category already matched." }
            : {})
        });
      }

      return this.finishBulkOperation(input, {
        operation: "category",
        results,
        timestamp,
        summary:
          category === null
            ? `Cleared category from ${countChanged(results)} selected item${countChanged(results) === 1 ? "" : "s"}.`
            : `Assigned category "${category.name}" to ${countChanged(results)} selected item${countChanged(results) === 1 ? "" : "s"}.`,
        after: { category }
      });
    });
  }

  async archiveItems(input: BulkBaseInput): Promise<BulkActionResult> {
    validateRunInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new ItemRepository(this.connection);
      const search = this.createSearchService();
      const results = uniqueIds(input.itemIds).map((itemId) => {
        this.requireWorkspaceItem(input.workspaceId, itemId);
        const item = repository.archive(itemId, timestamp);

        return {
          itemId,
          ok: true,
          item,
          searchRecord: search.upsertItem(item, { timestamp })
        };
      });

      return this.finishBulkOperation(input, {
        operation: "archive",
        results,
        timestamp,
        summary: `Archived ${results.length} selected item${results.length === 1 ? "" : "s"}.`
      });
    });
  }

  async deleteItems(input: BulkBaseInput): Promise<BulkActionResult> {
    validateRunInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new ItemRepository(this.connection);
      const search = this.createSearchService();
      const results = uniqueIds(input.itemIds).map((itemId) => {
        this.requireWorkspaceItem(input.workspaceId, itemId);
        const item = repository.softDelete(itemId, timestamp);

        return {
          itemId,
          ok: true,
          item,
          searchRecord: search.upsertItem(item, { timestamp })
        };
      });

      return this.finishBulkOperation(input, {
        operation: "delete",
        results,
        timestamp,
        summary: `Soft-deleted ${results.length} selected item${results.length === 1 ? "" : "s"}.`
      });
    });
  }

  async completeTasks(input: BulkBaseInput): Promise<BulkActionResult> {
    validateRunInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const itemRepository = new ItemRepository(this.connection);
      const taskRepository = new TaskRepository(this.connection);
      const search = this.createSearchService();
      const results: BulkActionItemResult[] = [];

      for (const itemId of uniqueIds(input.itemIds)) {
        const before = this.requireWorkspaceItem(input.workspaceId, itemId);
        const task = taskRepository.getDetailsByItemId(itemId);

        if (before.type !== "task" || task === null) {
          results.push({
            itemId,
            ok: false,
            item: before,
            reason: "Only task items can be completed in bulk."
          });
          continue;
        }

        if (task.taskStatus === "done") {
          results.push({
            itemId,
            ok: false,
            item: before,
            reason: "Task is already complete.",
            searchRecord: search.upsertItem(before, { timestamp })
          });
          continue;
        }

        const item = itemRepository.update(itemId, {
          status: taskStatusToItemStatus("done"),
          completedAt: timestamp,
          timestamp
        });
        taskRepository.updateDetails(itemId, {
          taskStatus: "done",
          completedAt: timestamp,
          timestamp
        });

        results.push({
          itemId,
          ok: true,
          item,
          searchRecord: search.upsertItem(item, { timestamp })
        });
      }

      return this.finishBulkOperation(input, {
        operation: "complete",
        results,
        timestamp,
        summary: `Completed ${countChanged(results)} selected task${countChanged(results) === 1 ? "" : "s"}.`
      });
    });
  }

  async exportItems(input: BulkExportItemsInput): Promise<BulkActionResult> {
    validateRunInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const results: BulkActionItemResult[] = [];
      const exportedItems: ItemRecord[] = [];

      for (const itemId of uniqueIds(input.itemIds)) {
        const item = this.requireWorkspaceItem(input.workspaceId, itemId);
        results.push({ itemId, ok: true, item });
        exportedItems.push(item);
      }

      const exportResult = {
        format: "markdown" as const,
        contents: buildMarkdownExport(exportedItems, timestamp),
        itemCount: exportedItems.length
      };

      return this.finishBulkOperation(input, {
        operation: "export",
        results,
        timestamp,
        summary: `Prepared Markdown export for ${exportedItems.length} selected item${exportedItems.length === 1 ? "" : "s"}.`,
        after: { export: { format: exportResult.format, itemCount: exportResult.itemCount } },
        export: exportResult
      });
    });
  }

  private finishBulkOperation(
    input: BulkBaseInput,
    details: {
      operation: BulkActionOperation;
      results: BulkActionItemResult[];
      timestamp: string;
      summary: string;
      after?: Record<string, unknown>;
      export?: BulkExportResult;
    }
  ): BulkActionResult {
    const changedCount = countChanged(details.results);
    const activityId =
      details.results.length === 0
        ? null
        : this.logBulkEvent({
            workspaceId: input.workspaceId,
            actorType: input.actorType ?? "local_user",
            operation: details.operation,
            summary: details.summary,
            results: details.results,
            timestamp: details.timestamp,
            ...(details.after === undefined ? {} : { after: details.after })
          });

    return {
      workspaceId: input.workspaceId,
      operation: details.operation,
      requestedCount: uniqueIds(input.itemIds).length,
      changedCount,
      skippedCount: details.results.length - changedCount,
      items: details.results,
      activityId,
      ...(details.export === undefined ? {} : { export: details.export })
    };
  }

  private logBulkEvent(input: {
    workspaceId: string;
    actorType: ActivityActorType;
    operation: BulkActionOperation;
    summary: string;
    results: BulkActionItemResult[];
    timestamp: string;
    after?: Record<string, unknown>;
  }): string {
    const event = new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: actionForOperation(input.operation),
      targetType: "workspace",
      targetId: input.workspaceId,
      summary: input.summary,
      beforeJson: null,
      afterJson: JSON.stringify({
        operation: input.operation,
        changedCount: countChanged(input.results),
        skippedCount: input.results.length - countChanged(input.results),
        targets: input.results.map((result) => ({
          itemId: result.itemId,
          ok: result.ok,
          reason: result.reason ?? null,
          title: result.item?.title ?? null,
          type: result.item?.type ?? null
        })),
        ...input.after
      }),
      timestamp: input.timestamp
    });

    return event.id;
  }

  private requireWorkspaceItem(workspaceId: string, itemId: string): ItemRecord {
    validateNonEmptyString(itemId, "itemId");
    const item = new ItemRepository(this.connection).getById(itemId);

    if (item === null) {
      throw new Error(`Item was not found: ${itemId}.`);
    }

    if (item.workspaceId !== workspaceId) {
      throw new Error(`Item ${itemId} does not belong to workspace ${workspaceId}.`);
    }

    return item;
  }

  private resolveCategory(
    workspaceId: string,
    categoryId: string | null
  ): CategoryRecord | null {
    if (categoryId === null) {
      return null;
    }

    validateNonEmptyString(categoryId, "categoryId");
    const category = new CategoryRepository(this.connection).getById(categoryId);

    if (category === null) {
      throw new Error(`Category was not found: ${categoryId}.`);
    }

    if (category.workspaceId !== workspaceId) {
      throw new Error("Category workspaceId must match the target workspace.");
    }

    return category;
  }

  private findOrCreateTag(input: BulkTagItemsInput, timestamp: string): TagRecord {
    const slug = slugifyTagName(input.tagName);

    if (slug === null || slug.length === 0) {
      throw new Error("tagName must contain at least one tag character.");
    }

    const repository = new TagRepository(this.connection);
    const existing = repository.findBySlug({
      workspaceId: input.workspaceId,
      slug,
      includeDeleted: true
    });

    if (existing !== null && existing.deletedAt === null) {
      return existing;
    }

    if (existing !== null) {
      return repository.restoreTag(existing.id, timestamp);
    }

    const tag = repository.create({
      id: this.idFactory("tag"),
      workspaceId: input.workspaceId,
      name: input.tagName.replace(/^@+/, "").trim(),
      slug,
      timestamp
    });

    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.tagCreated,
      targetType: "tag",
      targetId: tag.id,
      summary: `Created tag @${tag.slug}.`,
      beforeJson: null,
      afterJson: JSON.stringify(tag),
      timestamp
    });

    return tag;
  }

  private createSearchService(): SearchIndexService {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
  }
}

export const bulkActionsModuleContract = {
  module: "bulkActions",
  purpose: "Coordinate local bulk item selection operations and batch mutations.",
  owns: ["bulk item operation orchestration", "selection-operation contracts", "grouped bulk activity"],
  doesNotOwn: ["raw renderer database access", "cloud export", "unscoped destructive deletion"],
  integrationPoints: ["items", "tasks", "metadata", "search", "activity log", "export"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function validateRunInput(input: BulkBaseInput): void {
  validateNonEmptyString(input.workspaceId, "workspaceId");

  if (uniqueIds(input.itemIds).length === 0) {
    throw new Error("itemIds must include at least one item.");
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function countChanged(results: readonly BulkActionItemResult[]): number {
  return results.filter((result) => result.ok).length;
}

function actionForOperation(
  operation: BulkActionOperation
): typeof ActivityAction[keyof typeof ActivityAction] {
  switch (operation) {
    case "move":
      return ActivityAction.bulkItemsMoved;
    case "tag":
      return ActivityAction.bulkItemsTagged;
    case "category":
      return ActivityAction.bulkItemsCategorized;
    case "archive":
      return ActivityAction.bulkItemsArchived;
    case "delete":
      return ActivityAction.bulkItemsDeleted;
    case "complete":
      return ActivityAction.bulkTasksCompleted;
    case "export":
      return ActivityAction.bulkItemsExported;
  }
}

function buildMarkdownExport(items: readonly ItemRecord[], timestamp: string): string {
  const lines = ["# Selected Local Work OS items", "", `Exported: ${timestamp}`, ""];

  for (const item of items) {
    lines.push(`## ${item.title}`, "");
    lines.push(`- Type: ${item.type}`);
    lines.push(`- Status: ${item.status}`);
    lines.push(`- Container: ${item.containerId}`);

    if (item.categoryId !== null) {
      lines.push(`- Category ID: ${item.categoryId}`);
    }

    if (item.body !== null && item.body.trim().length > 0) {
      lines.push("", item.body.trim());
    }

    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
