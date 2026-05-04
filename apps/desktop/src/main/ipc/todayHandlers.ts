import {
  DailyPlanService,
  TodayService,
  type TodayViewModel
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
  type DailyPlanDateInput,
  type DailyPlanItemSummary,
  type DailyPlanSummary,
  type GetPlannedTasksInput,
  type PlannedTaskSummary,
  type PlanTaskInput,
  type ReorderPlannedTaskInput,
  type UnplanTaskInput,
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
  handleGetOrCreateDailyPlan: (
    input: unknown
  ) => Promise<ApiResult<DailyPlanSummary>>;
  handlePlanTask: (input: unknown) => Promise<ApiResult<DailyPlanItemSummary>>;
  handleUnplanTask: (
    input: unknown
  ) => Promise<ApiResult<DailyPlanItemSummary[]>>;
  handleReorderPlannedTask: (
    input: unknown
  ) => Promise<ApiResult<DailyPlanItemSummary>>;
  handleGetPlannedTasks: (
    input: unknown
  ) => Promise<ApiResult<PlannedTaskSummary[]>>;
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
        await context.dailyPlanService.rolloverTomorrowToToday({
          workspaceId,
          ...(input?.date === undefined ? {} : { date: input.date })
        });
        const viewModel = context.todayService.getTodayViewModel({
          ...input,
          workspaceId
        });

        return apiOk(toTodayViewModelSummary(viewModel));
      });
    },

    async handleGetOrCreateDailyPlan(input) {
      if (!isDailyPlanDateInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "getOrCreateDailyPlan accepts optional workspaceId and date fields."
        );
      }

      return await withTodayService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input?.workspaceId, context.workspace);
        const plan = await context.dailyPlanService.getOrCreateDailyPlan({
          ...input,
          workspaceId
        });

        return apiOk(plan);
      });
    },

    async handlePlanTask(input) {
      if (!isPlanTaskInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "planTask requires itemId, lane, and optional workspaceId, date, and sortOrder fields."
        );
      }

      return await withTodayService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const planItem = await context.dailyPlanService.planTask({
          ...input,
          workspaceId
        });

        return apiOk(planItem);
      });
    },

    async handleUnplanTask(input) {
      if (!isUnplanTaskInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "unplanTask requires itemId and optional workspaceId, date, and lane fields."
        );
      }

      return await withTodayService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const removed = await context.dailyPlanService.unplanTask({
          ...input,
          workspaceId
        });

        return apiOk(removed);
      });
    },

    async handleReorderPlannedTask(input) {
      if (!isReorderPlannedTaskInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "reorderPlannedTask requires itemId, lane, sortOrder, and optional workspaceId and date fields."
        );
      }

      return await withTodayService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const planItem = await context.dailyPlanService.reorderPlannedTask({
          ...input,
          workspaceId
        });

        return apiOk(planItem);
      });
    },

    async handleGetPlannedTasks(input) {
      if (!isGetPlannedTasksInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "getPlannedTasks accepts optional workspaceId, date, and lane fields."
        );
      }

      return await withTodayService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input?.workspaceId, context.workspace);
        const tasks = context.dailyPlanService.getPlannedTasks({
          ...input,
          workspaceId
        });

        return apiOk(tasks);
      });
    }
  };
}

async function withTodayService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    dailyPlanService: DailyPlanService;
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
      dailyPlanService: new DailyPlanService({ connection }),
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

function isDailyPlanDateInput(
  input: unknown
): input is DailyPlanDateInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      isOptionalString(input.workspaceId) &&
      isOptionalDateInput(input.date))
  );
}

function isPlanTaskInput(input: unknown): input is PlanTaskInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isOptionalDateInput(input.date) &&
    isRequiredString(input.itemId) &&
    isDailyPlanLane(input.lane) &&
    isOptionalSortOrder(input.sortOrder)
  );
}

function isUnplanTaskInput(input: unknown): input is UnplanTaskInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isOptionalDateInput(input.date) &&
    isRequiredString(input.itemId) &&
    (input.lane === undefined || isDailyPlanLane(input.lane))
  );
}

function isReorderPlannedTaskInput(
  input: unknown
): input is ReorderPlannedTaskInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isOptionalDateInput(input.date) &&
    isRequiredString(input.itemId) &&
    isDailyPlanLane(input.lane) &&
    isRequiredSortOrder(input.sortOrder)
  );
}

function isGetPlannedTasksInput(
  input: unknown
): input is GetPlannedTasksInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      isOptionalString(input.workspaceId) &&
      isOptionalDateInput(input.date) &&
      (input.lane === undefined || isDailyPlanLane(input.lane)))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.trim().length > 0);
}

function isRequiredString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
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

function isDailyPlanLane(value: unknown): boolean {
  return value === "today" || value === "tomorrow" || value === "backlog";
}

function isOptionalSortOrder(value: unknown): boolean {
  return value === undefined || isRequiredSortOrder(value);
}

function isRequiredSortOrder(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
