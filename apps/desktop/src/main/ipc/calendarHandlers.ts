import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import {
  CalendarFeedService,
  CalendarService,
  type CalendarMonthViewModel
} from "@local-work-os/features";
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
  type CalendarRescheduleItemInput,
  type CalendarRescheduleItemSummary,
  type ImportIcsFileInput,
  type ImportIcsSummary,
  type WorkspaceSummary
} from "../../preload/api";
import { normalizeLocalPath } from "../services/safeFileSystem";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type CalendarIpcHandlers = {
  handleGetCalendarMonth: (
    input: unknown
  ) => Promise<ApiResult<CalendarMonthViewModelSummary>>;
  handleRescheduleCalendarItem: (
    input: unknown
  ) => Promise<ApiResult<CalendarRescheduleItemSummary>>;
  handleImportIcsFile: (
    input: unknown
  ) => Promise<ApiResult<ImportIcsSummary>>;
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
    },

    async handleRescheduleCalendarItem(input) {
      if (!isCalendarRescheduleItemInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "rescheduleCalendarItem requires itemId, kind, dueAt, and optional startAt/allDay fields."
        );
      }

      return await withCalendarService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(
          input.workspaceId,
          context.workspace
        );
        const result = await context.calendarService.rescheduleCalendarItem({
          ...input,
          workspaceId
        });

        return apiOk(result);
      });
    },

    async handleImportIcsFile(input) {
      if (!isImportIcsFileInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "importIcsFile requires a filePath and optional workspaceId/sourceName fields."
        );
      }

      return await withCalendarService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const filePath = normalizeLocalPath(input.filePath);

        if (extname(filePath).toLowerCase() !== ".ics") {
          return apiError("INVALID_INPUT", "Calendar import requires a .ics file.");
        }

        const fileStats = await stat(filePath);

        if (!fileStats.isFile()) {
          return apiError("INVALID_INPUT", "Calendar import path must be a file.");
        }

        const result = await new CalendarFeedService({
          connection: context.connection
        }).importIcs({
          workspaceId,
          sourceName: input.sourceName ?? basename(filePath),
          sourcePath: filePath,
          sourceType: "file",
          icsText: await readFile(filePath, "utf8")
        });

        return apiOk({
          sourceId: result.source.id,
          sourceName: result.source.name,
          importedEventCount: result.importedEventCount,
          skippedEventCount: result.skippedEventCount
        });
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

function isCalendarRescheduleItemInput(
  input: unknown
): input is CalendarRescheduleItemInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isOptionalNullableString(input.dueAt) &&
    isOptionalNullableString(input.startAt) &&
    isNonEmptyString(input.itemId) &&
    (input.kind === "task" || input.kind === "list_item") &&
    isOptionalBoolean(input.allDay)
  );
}

function isImportIcsFileInput(input: unknown): input is ImportIcsFileInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.filePath) &&
    isOptionalString(input.workspaceId) &&
    isOptionalString(input.sourceName)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.trim().length > 0);
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || isNonEmptyString(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDateInput(value: unknown): value is string | Date {
  return typeof value === "string" || value instanceof Date;
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}
