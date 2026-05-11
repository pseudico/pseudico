import { ViewModeService, isViewMode, type ViewModeContextType } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type SetViewModeInput,
  type ViewModePreferenceSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<WorkspaceFileSystemService, "getCurrentWorkspace">;

type ViewModeIpcHandlers = {
  handleGetViewMode: (input: unknown) => Promise<ApiResult<ViewModePreferenceSummary>>;
  handleSetViewMode: (input: unknown) => Promise<ApiResult<ViewModePreferenceSummary>>;
};

export function createViewModeIpcHandlers(
  workspaceService: CurrentWorkspaceService
): ViewModeIpcHandlers {
  return {
    async handleGetViewMode(input) {
      if (!isGetViewModeInput(input)) {
        return apiError("INVALID_INPUT", "getViewMode requires contextType and contextId.");
      }

      return await withViewModeService(workspaceService, async (context) => {
        return apiOk(context.viewModeService.getViewMode(input.contextType, input.contextId));
      });
    },

    async handleSetViewMode(input) {
      if (!isSetViewModeInput(input)) {
        return apiError("INVALID_INPUT", "setViewMode requires contextType, contextId, and mode.");
      }

      return await withViewModeService(workspaceService, async (context) => {
        const preference = await context.viewModeService.setViewMode(input);
        return apiOk(preference);
      });
    }
  };
}

async function withViewModeService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    viewModeService: ViewModeService;
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
      viewModeService: new ViewModeService({ connection }),
      connection,
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "View mode operation failed."
    );
  } finally {
    connection.close();
  }
}

function isGetViewModeInput(
  input: unknown
): input is { contextType: ViewModeContextType; contextId: string } {
  return (
    isRecord(input) &&
    isViewModeContextType(input.contextType) &&
    isNonEmptyString(input.contextId)
  );
}

function isSetViewModeInput(input: unknown): input is SetViewModeInput {
  return (
    isRecord(input) &&
    isViewModeContextType(input.contextType) &&
    isNonEmptyString(input.contextId) &&
    isViewMode(input.mode)
  );
}

function isViewModeContextType(value: unknown): value is ViewModeContextType {
  return value === "saved_view" || value === "container";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
