import {
  AppSettingsRepository,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  NavigationHistoryService,
  type NavigationRecentTarget,
  type RecordNavigationTargetInput
} from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type NavigationRecentTargetSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type NavigationIpcHandlers = {
  handleListRecentTargets: (
    input: unknown
  ) => Promise<ApiResult<NavigationRecentTargetSummary[]>>;
  handleRecordTarget: (
    input: unknown
  ) => Promise<ApiResult<NavigationRecentTargetSummary[]>>;
};

export function createNavigationIpcHandlers(
  workspaceService: CurrentWorkspaceService
): NavigationIpcHandlers {
  return {
    async handleListRecentTargets(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listRecentTargets requires an optional workspaceId string."
        );
      }

      return await withNavigationService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(
          context.navigationHistoryService
            .listRecentTargets(workspaceId)
            .map(toNavigationRecentTargetSummary)
        );
      });
    },

    async handleRecordTarget(input) {
      if (!isRecordNavigationTargetInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "recordTarget requires a target type, path, and label."
        );
      }

      return await withNavigationService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);

        return apiOk(
          context.navigationHistoryService
            .recordTarget({
              ...input,
              workspaceId
            })
            .map(toNavigationRecentTargetSummary)
        );
      });
    }
  };
}

async function withNavigationService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    navigationHistoryService: NavigationHistoryService;
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
      navigationHistoryService: new NavigationHistoryService({
        appSettingsRepository: new AppSettingsRepository(connection)
      }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Navigation operation failed."
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
    throw new Error("Navigation workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toNavigationRecentTargetSummary(
  target: NavigationRecentTarget
): NavigationRecentTargetSummary {
  return { ...target };
}

function isRecordNavigationTargetInput(
  input: unknown
): input is RecordNavigationTargetInput {
  return (
    isRecord(input) &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
    isRecord(input.target) &&
    isNavigationTargetType(input.target.targetType) &&
    (input.target.targetId === undefined ||
      input.target.targetId === null ||
      isNonEmptyString(input.target.targetId)) &&
    isNonEmptyString(input.target.path) &&
    input.target.path.startsWith("/") &&
    isNonEmptyString(input.target.label) &&
    (input.target.subtitle === undefined ||
      input.target.subtitle === null ||
      typeof input.target.subtitle === "string")
  );
}

function isNavigationTargetType(value: unknown): boolean {
  return (
    value === "view" ||
    value === "container" ||
    value === "item" ||
    value === "saved_view"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
