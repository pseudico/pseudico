import { TodayService, type TodayViewModel } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type TodayViewModelInput,
  type TodayViewModelSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type TodayIpcHandlers = {
  handleGetTodayViewModel: (
    input: unknown
  ) => Promise<ApiResult<TodayViewModelSummary>>;
};

export function createTodayIpcHandlers(
  workspaceService: CurrentWorkspaceService
): TodayIpcHandlers {
  return {
    async handleGetTodayViewModel(input) {
      if (!isTodayViewModelInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "getTodayViewModel accepts optional workspaceId, date, and backlogDays fields."
        );
      }

      return await withTodayService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input?.workspaceId, context.workspace);
        const viewModel = context.todayService.getTodayViewModel({
          ...input,
          workspaceId
        });

        return apiOk(toTodayViewModelSummary(viewModel));
      });
    }
  };
}

async function withTodayService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    todayService: TodayService;
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
      todayService: new TodayService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Today operation failed."
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
    throw new Error("Today workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toTodayViewModelSummary(
  viewModel: TodayViewModel
): TodayViewModelSummary {
  return viewModel;
}

function isTodayViewModelInput(
  input: unknown
): input is TodayViewModelInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      isOptionalString(input.workspaceId) &&
      isOptionalDateInput(input.date) &&
      isOptionalBacklogDays(input.backlogDays))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.trim().length > 0);
}

function isOptionalDateInput(value: unknown): boolean {
  return value === undefined || typeof value === "string" || value instanceof Date;
}

function isOptionalBacklogDays(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 365)
  );
}
