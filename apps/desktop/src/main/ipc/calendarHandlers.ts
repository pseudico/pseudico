import { CalendarService, type CalendarMonthViewModel } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type CalendarMonthInput,
  type CalendarMonthViewModelSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type CalendarIpcHandlers = {
  handleGetCalendarMonth: (
    input: unknown
  ) => Promise<ApiResult<CalendarMonthViewModelSummary>>;
};

export function createCalendarIpcHandlers(
  workspaceService: CurrentWorkspaceService
): CalendarIpcHandlers {
  return {
    async handleGetCalendarMonth(input) {
      if (!isCalendarMonthInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "getCalendarMonth requires a month and optional workspaceId and includeCompleted fields."
        );
      }

      return await withCalendarService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(
          input.workspaceId,
          context.workspace
        );
        const viewModel = context.calendarService.getCalendarMonth({
          ...input,
          workspaceId
        });

        return apiOk(toCalendarMonthSummary(viewModel));
      });
    }
  };
}

async function withCalendarService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    calendarService: CalendarService;
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
      calendarService: new CalendarService({ connection }),
      connection,
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Calendar operation failed."
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
    throw new Error("Calendar workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toCalendarMonthSummary(
  viewModel: CalendarMonthViewModel
): CalendarMonthViewModelSummary {
  return viewModel;
}

function isCalendarMonthInput(input: unknown): input is CalendarMonthInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isDateInput(input.month) &&
    isOptionalBoolean(input.includeCompleted)
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
