import {
  BulkActionService,
  formatActivityEvent,
  ItemService,
  type BulkActionResult
} from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type ActivityLogRecord,
  type DatabaseConnection,
  type ItemRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ActivitySummary,
  type ApiResult,
  type BulkActionSummary,
  type BulkBaseItemsInput,
  type BulkCategorizeItemsInput,
  type BulkMoveItemsInput,
  type BulkTagItemsInput,
  type ItemInspectorSummary,
  type ItemSummary,
  type MoveItemInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type ItemIpcHandlers = {
  handleMoveItem: (input: unknown) => Promise<ApiResult<ItemSummary>>;
  handleArchiveItem: (input: unknown) => Promise<ApiResult<ItemSummary>>;
  handleSoftDeleteItem: (input: unknown) => Promise<ApiResult<ItemSummary>>;
  handleGetItemActivity: (
    input: unknown
  ) => Promise<ApiResult<ActivitySummary[]>>;
  handleOpenItemInspector: (
    input: unknown
  ) => Promise<ApiResult<ItemInspectorSummary>>;
  handleBulkMoveItems: (input: unknown) => Promise<ApiResult<BulkActionSummary>>;
  handleBulkTagItems: (input: unknown) => Promise<ApiResult<BulkActionSummary>>;
  handleBulkCategorizeItems: (
    input: unknown
  ) => Promise<ApiResult<BulkActionSummary>>;
  handleBulkArchiveItems: (
    input: unknown
  ) => Promise<ApiResult<BulkActionSummary>>;
  handleBulkDeleteItems: (
    input: unknown
  ) => Promise<ApiResult<BulkActionSummary>>;
  handleBulkCompleteTasks: (
    input: unknown
  ) => Promise<ApiResult<BulkActionSummary>>;
  handleBulkExportItems: (
    input: unknown
  ) => Promise<ApiResult<BulkActionSummary>>;
};

export function createItemIpcHandlers(
  workspaceService: CurrentWorkspaceService
): ItemIpcHandlers {
  return {
    async handleMoveItem(input) {
      if (!isMoveItemInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "moveItem requires itemId and targetContainerId strings."
        );
      }

      return await withItemService(workspaceService, async (context) =>
        apiOk(toItemSummary((await context.itemService.moveItem(input)).item))
      );
    },

    async handleArchiveItem(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "archiveItem requires an itemId string."
        );
      }

      return await withItemService(workspaceService, async (context) =>
        apiOk(toItemSummary((await context.itemService.archiveItem(input)).item))
      );
    },

    async handleSoftDeleteItem(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "softDeleteItem requires an itemId string."
        );
      }

      return await withItemService(workspaceService, async (context) =>
        apiOk(toItemSummary((await context.itemService.softDeleteItem(input)).item))
      );
    },

    async handleGetItemActivity(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "getItemActivity requires an itemId string."
        );
      }

      return await withItemService(workspaceService, async (context) =>
        apiOk(context.itemService.getItemActivity(input).map(toActivitySummary))
      );
    },

    async handleOpenItemInspector(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "openItemInspector requires an itemId string."
        );
      }

      return await withItemService(workspaceService, async (context) => {
        const snapshot = context.itemService.openItemInspector(input);

        return apiOk({
          item: toItemSummary(snapshot.item),
          activity: snapshot.activity.map(toActivitySummary)
        });
      });
    },

    async handleBulkMoveItems(input) {
      if (!isBulkMoveItemsInput(input)) {
        return apiError("INVALID_INPUT", "bulkMoveItems requires itemIds and targetContainerId.");
      }

      return await withItemService(workspaceService, async (context) =>
        apiOk(toBulkActionSummary(await context.bulkActionService.moveItems({
          ...input,
          workspaceId: input.workspaceId ?? context.workspace.id
        })))
      );
    },

    async handleBulkTagItems(input) {
      if (!isBulkTagItemsInput(input)) {
        return apiError("INVALID_INPUT", "bulkTagItems requires itemIds and tagName.");
      }

      return await withItemService(workspaceService, async (context) =>
        apiOk(toBulkActionSummary(await context.bulkActionService.tagItems({
          ...input,
          workspaceId: input.workspaceId ?? context.workspace.id
        })))
      );
    },

    async handleBulkCategorizeItems(input) {
      if (!isBulkCategorizeItemsInput(input)) {
        return apiError("INVALID_INPUT", "bulkCategorizeItems requires itemIds and categoryId.");
      }

      return await withItemService(workspaceService, async (context) =>
        apiOk(toBulkActionSummary(await context.bulkActionService.categorizeItems({
          ...input,
          workspaceId: input.workspaceId ?? context.workspace.id
        })))
      );
    },

    async handleBulkArchiveItems(input) {
      if (!isBulkBaseItemsInput(input)) {
        return apiError("INVALID_INPUT", "bulkArchiveItems requires itemIds.");
      }

      return await withItemService(workspaceService, async (context) =>
        apiOk(toBulkActionSummary(await context.bulkActionService.archiveItems({
          ...input,
          workspaceId: input.workspaceId ?? context.workspace.id
        })))
      );
    },

    async handleBulkDeleteItems(input) {
      if (!isBulkBaseItemsInput(input)) {
        return apiError("INVALID_INPUT", "bulkDeleteItems requires itemIds.");
      }

      return await withItemService(workspaceService, async (context) =>
        apiOk(toBulkActionSummary(await context.bulkActionService.deleteItems({
          ...input,
          workspaceId: input.workspaceId ?? context.workspace.id
        })))
      );
    },

    async handleBulkCompleteTasks(input) {
      if (!isBulkBaseItemsInput(input)) {
        return apiError("INVALID_INPUT", "bulkCompleteTasks requires itemIds.");
      }

      return await withItemService(workspaceService, async (context) =>
        apiOk(toBulkActionSummary(await context.bulkActionService.completeTasks({
          ...input,
          workspaceId: input.workspaceId ?? context.workspace.id
        })))
      );
    },

    async handleBulkExportItems(input) {
      if (!isBulkBaseItemsInput(input)) {
        return apiError("INVALID_INPUT", "bulkExportItems requires itemIds.");
      }

      return await withItemService(workspaceService, async (context) =>
        apiOk(toBulkActionSummary(await context.bulkActionService.exportItems({
          ...input,
          workspaceId: input.workspaceId ?? context.workspace.id
        })))
      );
    }
  };
}

async function withItemService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    bulkActionService: BulkActionService;
    itemService: ItemService;
    workspace: WorkspaceSummary;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiError("WORKSPACE_ERROR", "No workspace is open.");
  }

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
    fileMustExist: true
  });

  try {
    return await operation({
      connection,
      bulkActionService: new BulkActionService({ connection }),
      itemService: new ItemService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Item operation failed."
    );
  } finally {
    connection.close();
  }
}

function toItemSummary(item: ItemRecord): ItemSummary {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    containerId: item.containerId,
    containerTabId: item.containerTabId,
    type: item.type,
    title: item.title,
    body: item.body,
    categoryId: item.categoryId,
    status: item.status,
    sortOrder: item.sortOrder,
    pinned: item.pinned,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt,
    archivedAt: item.archivedAt,
    deletedAt: item.deletedAt
  };
}

function toActivitySummary(activity: ActivityLogRecord): ActivitySummary {
  const formatted = formatActivityEvent(activity);

  return {
    id: activity.id,
    workspaceId: activity.workspaceId,
    actorType: activity.actorType,
    action: activity.action,
    targetType: activity.targetType,
    targetId: activity.targetId,
    summary: activity.summary,
    beforeJson: activity.beforeJson,
    afterJson: activity.afterJson,
    createdAt: activity.createdAt,
    actionLabel: formatted.actionLabel,
    actorLabel: formatted.actorLabel,
    targetLabel: formatted.targetLabel,
    description: formatted.description
  };
}

function toBulkActionSummary(result: BulkActionResult): BulkActionSummary {
  return {
    workspaceId: result.workspaceId,
    operation: result.operation,
    requestedCount: result.requestedCount,
    changedCount: result.changedCount,
    skippedCount: result.skippedCount,
    items: result.items.map((item) => ({
      itemId: item.itemId,
      ok: item.ok,
      ...(item.item === undefined ? {} : { item: toItemSummary(item.item) }),
      ...(item.reason === undefined ? {} : { reason: item.reason })
    })),
    activityId: result.activityId,
    ...(result.export === undefined ? {} : { export: result.export })
  };
}

function isMoveItemInput(input: unknown): input is MoveItemInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    isNonEmptyString(input.targetContainerId) &&
    isOptionalNullableString(input.targetContainerTabId) &&
    (input.sortOrder === undefined || typeof input.sortOrder === "number")
  );
}

function isBulkBaseItemsInput(input: unknown): input is BulkBaseItemsInput {
  return (
    isRecord(input) &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
    Array.isArray(input.itemIds) &&
    input.itemIds.every(isNonEmptyString)
  );
}

function isBulkMoveItemsInput(input: unknown): input is BulkMoveItemsInput {
  const record = input as Record<string, unknown>;
  return (
    isBulkBaseItemsInput(input) &&
    isNonEmptyString(record.targetContainerId) &&
    isOptionalNullableString(record.targetContainerTabId)
  );
}

function isBulkTagItemsInput(input: unknown): input is BulkTagItemsInput {
  const record = input as Record<string, unknown>;
  return isBulkBaseItemsInput(input) && isNonEmptyString(record.tagName);
}

function isBulkCategorizeItemsInput(
  input: unknown
): input is BulkCategorizeItemsInput {
  const record = input as Record<string, unknown>;
  return (
    isBulkBaseItemsInput(input) &&
    (record.categoryId === null || isNonEmptyString(record.categoryId))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}
