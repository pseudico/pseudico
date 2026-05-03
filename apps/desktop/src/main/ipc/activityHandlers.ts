import { ActivityService, type ActivityEventView } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ActivitySummary,
  type ApiResult,
  type ListActivityForTargetInput,
  type ListRecentActivityInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type ActivityIpcHandlers = {
  handleListRecentActivity: (
    input: unknown
  ) => Promise<ApiResult<ActivitySummary[]>>;
  handleListActivityForTarget: (
    input: unknown
  ) => Promise<ApiResult<ActivitySummary[]>>;
};

export function createActivityIpcHandlers(
  workspaceService: CurrentWorkspaceService
): ActivityIpcHandlers {
  return {
    async handleListRecentActivity(input) {
      if (!isListRecentActivityInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "listRecentActivity requires an optional workspaceId and limit."
        );
      }

      return await withActivityService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(
          input?.workspaceId,
          context.workspace
        );

        return apiOk(
          context.activityService
            .listRecentActivity(workspaceId, input?.limit)
            .map(toActivitySummary)
        );
      });
    },

    async handleListActivityForTarget(input) {
      if (!isListActivityForTargetInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "listActivityForTarget requires targetType and targetId strings."
        );
      }

      return await withActivityService(workspaceService, async (context) =>
        apiOk(
          context.activityService
            .listActivityForTarget(input.targetType, input.targetId, input.limit)
            .map(toActivitySummary)
        )
      );
    }
  };
}

async function withActivityService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    activityService: ActivityService;
    connection: DatabaseConnection;
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
      activityService: new ActivityService({ connection }),
      connection,
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Activity operation failed."
    );
  } finally {
    connection.close();
  }
}

function resolveWorkspaceId(
  requestedWorkspaceId: string | undefined,
  currentWorkspace: WorkspaceSummary
): string {
  if (
    requestedWorkspaceId !== undefined &&
    requestedWorkspaceId !== currentWorkspace.id
  ) {
    throw new Error("Activity workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toActivitySummary(activity: ActivityEventView): ActivitySummary {
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
    actionLabel: activity.actionLabel,
    actorLabel: activity.actorLabel,
    targetLabel: activity.targetLabel,
    description: activity.description
  };
}

function isListRecentActivityInput(
  input: unknown
): input is ListRecentActivityInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      isOptionalNonEmptyString(input.workspaceId) &&
      isOptionalNumber(input.limit))
  );
}

function isListActivityForTargetInput(
  input: unknown
): input is ListActivityForTargetInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.targetType) &&
    isNonEmptyString(input.targetId) &&
    isOptionalNumber(input.limit)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNonEmptyString(value: unknown): boolean {
  return value === undefined || isNonEmptyString(value);
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === "number";
}
