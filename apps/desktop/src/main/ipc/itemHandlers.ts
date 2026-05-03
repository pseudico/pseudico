import { formatActivityEvent, ItemService } from "@local-work-os/features";
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
    }
  };
}

async function withItemService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
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

function isMoveItemInput(input: unknown): input is MoveItemInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    isNonEmptyString(input.targetContainerId) &&
    isOptionalNullableString(input.targetContainerTabId) &&
    (input.sortOrder === undefined || typeof input.sortOrder === "number")
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
