import { TimelineService, type TimelineViewModel } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type TimelineViewModelInput,
  type TimelineViewModelSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type TimelineIpcHandlers = {
  handleGetTimelineViewModel: (
    input: unknown
  ) => Promise<ApiResult<TimelineViewModelSummary>>;
};

export function createTimelineIpcHandlers(
  workspaceService: CurrentWorkspaceService
): TimelineIpcHandlers {
  return {
    async handleGetTimelineViewModel(input) {
      if (!isTimelineViewModelInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "getTimelineViewModel requires start/end dates and optional workspaceId, includeCompleted, and groupBy fields."
        );
      }

      return await withTimelineService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(
          input.workspaceId,
          context.workspace
        );
        const viewModel = context.timelineService.groupTimelineItems({
          ...input,
          workspaceId
        });

        return apiOk(toTimelineViewModelSummary(viewModel));
      });
    }
  };
}

async function withTimelineService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    timelineService: TimelineService;
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
      timelineService: new TimelineService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Timeline operation failed."
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
    throw new Error("Timeline workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toTimelineViewModelSummary(
  viewModel: TimelineViewModel
): TimelineViewModelSummary {
  return viewModel;
}

function isTimelineViewModelInput(
  input: unknown
): input is TimelineViewModelInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isDateInput(input.start) &&
    isDateInput(input.end) &&
    isOptionalBoolean(input.includeCompleted) &&
    (input.groupBy === undefined ||
      input.groupBy === "project" ||
      input.groupBy === "category")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.trim().length > 0);
}

function isDateInput(value: unknown): value is string | Date {
  return typeof value === "string" || value instanceof Date;
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}
