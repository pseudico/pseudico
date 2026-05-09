import {
  TrashService,
  type ClearTrashResult,
  type RestoreTrashResult
} from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type TrashEntryRecord,
  type TrashTargetType
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type ClearTrashSummary,
  type RestoreTrashInput,
  type RestoreTrashSummary,
  type TrashEntrySummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createBackupIpcHandlers } from "./backupHandlers";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

export type TrashIpcHandlers = {
  handleListTrash: (input: unknown) => Promise<ApiResult<TrashEntrySummary[]>>;
  handleRestoreTrash: (input: unknown) => Promise<ApiResult<RestoreTrashSummary>>;
  handleClearTrash: (input: unknown) => Promise<ApiResult<ClearTrashSummary>>;
};

export function createTrashIpcHandlers(
  workspaceService: CurrentWorkspaceService
): TrashIpcHandlers {
  return {
    async handleListTrash(input) {
      if (!isOptionalWorkspaceInput(input)) {
        return apiError("INVALID_INPUT", "listTrash accepts an optional workspaceId string.");
      }

      return await withTrashService(workspaceService, async ({ service, workspace }) => {
        const workspaceId = input?.workspaceId ?? workspace.id;
        if (workspaceId !== workspace.id) {
          return apiError("WORKSPACE_ERROR", "Trash workspaceId must match the current workspace.");
        }

        return apiOk(service.listTrash({ workspaceId }).map(toTrashEntrySummary));
      });
    },

    async handleRestoreTrash(input) {
      if (!isRestoreTrashInput(input)) {
        return apiError("INVALID_INPUT", "restoreTrash requires targetType and targetId.");
      }

      return await withTrashService(workspaceService, async ({ service, workspace }) => {
        const workspaceId = input.workspaceId ?? workspace.id;
        if (workspaceId !== workspace.id) {
          return apiError("WORKSPACE_ERROR", "Trash workspaceId must match the current workspace.");
        }

        return apiOk(toRestoreTrashSummary(await service.restore({
          workspaceId,
          targetType: input.targetType,
          targetId: input.targetId
        })));
      });
    },

    async handleClearTrash(input) {
      if (!isClearTrashInput(input)) {
        return apiError("INVALID_INPUT", "clearTrash requires confirmed: true.");
      }

      const workspace = workspaceService.getCurrentWorkspace();
      if (workspace === null) {
        return apiError("WORKSPACE_ERROR", "No workspace is open.");
      }

      const workspaceId = input.workspaceId ?? workspace.id;
      if (workspaceId !== workspace.id) {
        return apiError("WORKSPACE_ERROR", "Trash workspaceId must match the current workspace.");
      }

      const backupResult = await createBackupIpcHandlers(
        workspaceService
      ).handleCreateManualBackup({ workspaceId });

      if (!backupResult.ok) {
        return backupResult;
      }

      return await withTrashService(workspaceService, async ({ service }) =>
        apiOk(toClearTrashSummary(await service.clearTrash({
          workspaceId,
          backupSnapshotId: backupResult.data.id
        })))
      );
    }
  };
}

async function withTrashService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    service: TrashService;
    workspace: NonNullable<ReturnType<CurrentWorkspaceService["getCurrentWorkspace"]>>;
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
      service: new TrashService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Trash operation failed."
    );
  } finally {
    connection.close();
  }
}

function toTrashEntrySummary(entry: TrashEntryRecord): TrashEntrySummary {
  return {
    id: entry.id,
    workspaceId: entry.workspaceId,
    targetType: entry.targetType,
    title: entry.title,
    subtitle: entry.subtitle,
    deletedAt: entry.deletedAt,
    originalContainerId: entry.originalContainerId,
    originalContainerName: entry.originalContainerName,
    parentItemId: entry.parentItemId,
    parentItemTitle: entry.parentItemTitle
  };
}

function toRestoreTrashSummary(result: RestoreTrashResult): RestoreTrashSummary {
  return {
    entry: toTrashEntrySummary(result.entry),
    searchIndex: result.searchIndex
  };
}

function toClearTrashSummary(result: ClearTrashResult): ClearTrashSummary {
  return {
    workspaceId: result.workspaceId,
    backupSnapshotId: result.backupSnapshotId,
    counts: result.counts,
    clearedCount: result.clearedCount,
    searchIndex: result.searchIndex
  };
}

function isOptionalWorkspaceInput(input: unknown): input is { workspaceId?: string } | undefined {
  return input === undefined || (isRecord(input) && (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)));
}

function isRestoreTrashInput(input: unknown): input is RestoreTrashInput {
  return (
    isRecord(input) &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
    isTrashTargetType(input.targetType) &&
    isNonEmptyString(input.targetId)
  );
}

function isClearTrashInput(input: unknown): input is { workspaceId?: string; confirmed: true } {
  return (
    isRecord(input) &&
    input.confirmed === true &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId))
  );
}

function isTrashTargetType(value: unknown): value is TrashTargetType {
  return value === "container" || value === "item" || value === "list_item" || value === "attachment";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
