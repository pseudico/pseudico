import type { FeatureModuleContract } from "../featureModuleContract";
import {
  createIsoTimestamp,
  createLocalDayRange,
  createLocalDayWindowRange,
  createRelativeLocalDayRange,
  type Clock,
  type LocalDateInput
} from "@local-work-os/core";
import {
  AppSettingsRepository,
  ContainerRepository,
  DailyPlanRepository,
  ListRepository,
  TaskRepository,
  type DatabaseConnection,
  type ListItemWithListRecord,
  type TaskWithItemRecord
} from "@local-work-os/db";
import {
  toTodayListItemView,
  toTodayTaskView,
  type TodayTaskView,
  type TodayViewModel
} from "./TodayViewModel";
import {
  DEFAULT_TODAY_PREFERENCES,
  TodayPreferencesService,
  type TodayPreferences
} from "./TodayPreferencesService";
import { PlanningSummaryService } from "./PlanningSummaryService";

// Owns Today/Tomorrow planning application contracts.
// Does not own task persistence internals or calendar rendering.
export const DEFAULT_TODAY_BACKLOG_DAYS = DEFAULT_TODAY_PREFERENCES.backlogDays;
export const TODAY_BACKLOG_DAYS_SETTING_KEY = "today_backlog_days";
export const DEFAULT_TODAY_LANE_LIMIT = 50;
export const MAX_TODAY_LANE_LIMIT = 500;

export type TodayQueryInput = {
  workspaceId: string;
  date?: LocalDateInput;
  backlogDays?: number;
  laneLimit?: number;
};

type TodayQueryContext = TodayQueryInput & {
  preferences?: TodayPreferences;
};

export class TodayService {
  readonly module = "today";

  private readonly connection: DatabaseConnection;
  private readonly now: Clock;

  constructor(input: { connection: DatabaseConnection; now?: Clock }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
  }

  getTodayViewModel(input: TodayQueryInput): TodayViewModel {
    this.validateInput(input);

    const date = input.date ?? this.now();
    const todayRange = createLocalDayRange(date);
    const preferences = this.resolvePreferences(input);
    const backlogDays = input.backlogDays ?? preferences.backlogDays;
    const normalizedInput = { ...input, date, backlogDays, preferences };
    const dueToday = this.listDueToday(normalizedInput);
    const overdueBacklog = this.listOverdueBacklog(normalizedInput);
    const tomorrowPreview = this.listTomorrowPreview(normalizedInput);
    const laneLimit = normalizeLaneLimit(input.laneLimit);
    const overdueBacklogRange = createLocalDayWindowRange({
      date,
      startOffsetDays: -backlogDays,
      endOffsetDays: 0
    });
    const tomorrowRange = createRelativeLocalDayRange(date, 1);

    return {
      workspaceId: input.workspaceId,
      generatedAt: createIsoTimestamp(this.now()),
      localDate: todayRange.localDate,
      backlogDays,
      preferences: {
        maxFocusTasks: preferences.maxFocusTasks,
        planningMode: preferences.planningMode,
        backlogDays: preferences.backlogDays,
        showWaiting: preferences.showWaiting,
        showDeferred: preferences.showDeferred,
        showDailyCompletionSummary: preferences.showDailyCompletionSummary
      },
      focusSummary: this.buildFocusSummary({
        plannedTodayCount: this.countPlannedToday({
          workspaceId: input.workspaceId,
          date,
          dueToday
        }),
        preferences
      }),
      completionSummary: this.buildCompletionSummary({
        workspaceId: input.workspaceId,
        date,
        preferences
      }),
      planningSummary: new PlanningSummaryService({
        connection: this.connection,
        now: this.now
      }).getSummary({ workspaceId: input.workspaceId, date }),
      ranges: {
        today: {
          startInclusive: todayRange.startInclusive,
          endExclusive: todayRange.endExclusive
        },
        overdueBacklog: overdueBacklogRange,
        tomorrow: {
          startInclusive: tomorrowRange.startInclusive,
          endExclusive: tomorrowRange.endExclusive
        }
      },
      dueToday: this.withContainerTitles(applyLaneLimit(dueToday, laneLimit)),
      overdueBacklog: this.withContainerTitles(applyLaneLimit(overdueBacklog, laneLimit)),
      tomorrowPreview: this.withContainerTitles(applyLaneLimit(tomorrowPreview, laneLimit)),
      laneSummaries: {
        dueToday: summarizeLane(dueToday, laneLimit),
        overdueBacklog: summarizeLane(overdueBacklog, laneLimit),
        tomorrowPreview: summarizeLane(tomorrowPreview, laneLimit)
      }
    };
  }

  listDueToday(input: TodayQueryContext): TodayTaskView[] {
    this.validateInput(input);

    const date = input.date ?? this.now();
    const range = createLocalDayRange(date);
    const automaticTasks = this.applyVisibilityPreferences([
      ...this.listTasks(input.workspaceId, (repository) =>
        repository.listDueBetween(input.workspaceId, range)
      ),
      ...this.listReviewTasksForRange(input.workspaceId, range, input.preferences),
      ...this.listListItems(input.workspaceId, (repository) =>
        repository.listDatedItemsBetween({
          workspaceId: input.workspaceId,
          range
        })
      )
    ], input.preferences).sort(compareTodayTasks);

    return this.listTasksForLane({
      workspaceId: input.workspaceId,
      date,
      lane: "today",
      automaticTasks
    });
  }

  listOverdueBacklog(input: TodayQueryContext): TodayTaskView[] {
    this.validateInput(input);

    const date = input.date ?? this.now();
    const range = createLocalDayWindowRange({
      date,
      startOffsetDays: -(input.preferences?.backlogDays ?? this.resolvePreferences(input).backlogDays),
      endOffsetDays: 0
    });
    const automaticTasks = this.applyVisibilityPreferences([
      ...this.listTasks(input.workspaceId, (repository) =>
        repository.listOverdueBetween(input.workspaceId, range)
      ),
      ...this.listReviewTasksForRange(input.workspaceId, range, input.preferences),
      ...this.listListItems(input.workspaceId, (repository) =>
        repository.listDatedItemsBetween({
          workspaceId: input.workspaceId,
          range
        }).filter(
          (record) =>
            record.listItem.dueAt !== null &&
            record.listItem.dueAt >= range.startInclusive &&
            record.listItem.dueAt < range.endExclusive
        )
      )
    ], input.preferences).sort(compareTodayTasks);

    return this.listTasksForLane({
      workspaceId: input.workspaceId,
      date,
      lane: "backlog",
      automaticTasks
    });
  }

  listTomorrowPreview(input: TodayQueryContext): TodayTaskView[] {
    this.validateInput(input);

    const date = input.date ?? this.now();
    const range = createRelativeLocalDayRange(date, 1);
    const automaticTasks = this.applyVisibilityPreferences([
      ...this.listTasks(input.workspaceId, (repository) =>
        repository.listDueBetween(input.workspaceId, range)
      ),
      ...this.listReviewTasksForRange(input.workspaceId, range, input.preferences),
      ...this.listListItems(input.workspaceId, (repository) =>
        repository.listDatedItemsBetween({
          workspaceId: input.workspaceId,
          range
        })
      )
    ], input.preferences).sort(compareTodayTasks);

    return this.listTasksForLane({
      workspaceId: input.workspaceId,
      date,
      lane: "tomorrow",
      automaticTasks
    });
  }

  private listTasks(
    workspaceId: string,
    query: (repository: TaskRepository) => TaskWithItemRecord[]
  ): TodayTaskView[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return query(new TaskRepository(this.connection)).map(toTodayTaskView);
  }

  private listListItems(
    workspaceId: string,
    query: (repository: ListRepository) => ListItemWithListRecord[]
  ): TodayTaskView[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return query(new ListRepository(this.connection)).map(toTodayListItemView);
  }

  private listTasksForLane(input: {
    workspaceId: string;
    date: LocalDateInput;
    lane: "today" | "tomorrow" | "backlog";
    automaticTasks: TodayTaskView[];
  }): TodayTaskView[] {
    const repository = new DailyPlanRepository(this.connection);
    const plan = repository.findPlanByDate({
      workspaceId: input.workspaceId,
      planDate: createLocalDayRange(input.date).localDate
    });

    if (plan === null) {
      return input.automaticTasks;
    }

    const plannedTasks = repository.listPlannedTasks({
      workspaceId: input.workspaceId,
      dailyPlanId: plan.id
    });
    const plannedIds = new Set(
      plannedTasks.map((record) => `task:${record.task.item.id}`)
    );
    const laneTasks = plannedTasks
      .filter((record) => record.planItem.lane === input.lane)
      .map((record) => ({
        ...toTodayTaskView(record.task),
        sortOrder: record.planItem.sortOrder,
        plannedLane: record.planItem.lane,
        plannedSortOrder: record.planItem.sortOrder,
        addedManually: record.planItem.addedManually
      }));

    return [
      ...laneTasks,
      ...input.automaticTasks.filter((task) => !plannedIds.has(`${task.itemType}:${task.itemId}`))
    ];
  }

  private resolvePreferences(input: TodayQueryInput): TodayPreferences {
    const preferences = new TodayPreferencesService({
      connection: this.connection,
      logActivity: false
    }).getPreferences(input.workspaceId);

    if (input.backlogDays !== undefined) {
      return {
        ...preferences,
        backlogDays: validateBacklogDays(input.backlogDays)
      };
    }

    const legacyBacklogDays = this.resolveLegacyBacklogDays(input);

    return legacyBacklogDays === null
      ? preferences
      : { ...preferences, backlogDays: legacyBacklogDays };
  }

  private resolveLegacyBacklogDays(input: TodayQueryInput): number | null {
    const setting = new AppSettingsRepository(this.connection).findByKey({
      workspaceId: input.workspaceId,
      settingKey: TODAY_BACKLOG_DAYS_SETTING_KEY
    });

    if (setting === null) {
      return null;
    }

    try {
      return validateBacklogDays(JSON.parse(setting.valueJson));
    } catch {
      return null;
    }
  }

  private listReviewTasksForRange(
    workspaceId: string,
    range: { startInclusive: string; endExclusive: string },
    preferences: TodayPreferences | undefined
  ): TodayTaskView[] {
    const statuses = [
      ...(preferences?.showWaiting === true ? ["waiting" as const] : []),
      ...(preferences?.showDeferred === true ? ["deferred" as const] : [])
    ];

    if (statuses.length === 0) {
      return [];
    }

    return this.listTasks(workspaceId, (repository) =>
      repository.listReviewTasks(workspaceId, statuses).filter((record) => {
        const dueAt = record.task.dueAt;
        return dueAt !== null && dueAt >= range.startInclusive && dueAt < range.endExclusive;
      })
    );
  }

  private applyVisibilityPreferences(
    tasks: TodayTaskView[],
    preferences: TodayPreferences | undefined
  ): TodayTaskView[] {
    return tasks.filter((task) => {
      if (task.taskStatus === "waiting") {
        return preferences?.showWaiting === true;
      }

      if (task.taskStatus === "deferred") {
        return preferences?.showDeferred === true;
      }

      return true;
    });
  }

  private countPlannedToday(input: {
    workspaceId: string;
    date: LocalDateInput;
    dueToday: TodayTaskView[];
  }): number {
    const plannedIds = new Set(
      this.listTasksForLane({
        workspaceId: input.workspaceId,
        date: input.date,
        lane: "today",
        automaticTasks: []
      }).map((task) => `${task.itemType}:${task.itemId}`)
    );

    for (const task of input.dueToday) {
      if (task.plannedLane === "today") {
        plannedIds.add(`${task.itemType}:${task.itemId}`);
      }
    }

    return plannedIds.size;
  }

  private buildFocusSummary(input: {
    plannedTodayCount: number;
    preferences: TodayPreferences;
  }) {
    const limitExceeded = input.plannedTodayCount > input.preferences.maxFocusTasks;

    return {
      plannedTodayCount: input.plannedTodayCount,
      maxFocusTasks: input.preferences.maxFocusTasks,
      limitExceeded,
      warning: limitExceeded
        ? `Today has ${input.plannedTodayCount} focus tasks, above the ${input.preferences.maxFocusTasks}-task limit.`
        : null
    };
  }

  private buildCompletionSummary(input: {
    workspaceId: string;
    date: LocalDateInput;
    preferences: TodayPreferences;
  }) {
    const range = createLocalDayRange(input.date);
    const completedTasks = [
      ...new TaskRepository(this.connection).listTimelineBetween({
        workspaceId: input.workspaceId,
        range,
        includeCompleted: true
      }).filter((record) => record.task.taskStatus === "done"),
      ...new ListRepository(this.connection).listDatedItemsBetween({
        workspaceId: input.workspaceId,
        range,
        includeCompleted: true
      }).filter((record) => record.listItem.status === "done")
    ];

    return {
      completedTodayCount: completedTasks.length,
      plannedTodayCompletedCount: completedTasks.length,
      show: input.preferences.showDailyCompletionSummary
    };
  }

  private withContainerTitles(tasks: TodayTaskView[]): TodayTaskView[] {
    const repository = new ContainerRepository(this.connection);
    const cache = new Map<string, string | null>();

    return tasks.map((task) => {
      if (!cache.has(task.containerId)) {
        cache.set(task.containerId, repository.getById(task.containerId)?.name ?? null);
      }

      return {
        ...task,
        containerTitle: cache.get(task.containerId) ?? null
      };
    });
  }

  private validateInput(input: TodayQueryInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    if (input.backlogDays !== undefined) {
      validateBacklogDays(input.backlogDays);
    }

    if (input.laneLimit !== undefined) {
      validateLaneLimit(input.laneLimit);
    }
  }
}

export const todayModuleContract = {
  module: "today",
  purpose: "Coordinate daily planning, due/overdue projections, ordering, and rollover.",
  owns: ["daily planning operations", "due/overdue projections", "rollover coordination"],
  doesNotOwn: ["task persistence internals", "calendar rendering", "reminder scheduling internals"],
  integrationPoints: ["tasks", "metadata", "saved views", "dashboard", "timeline", "calendar"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function validateBacklogDays(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 365
  ) {
    throw new Error("backlogDays must be an integer between 1 and 365.");
  }

  return value;
}

function normalizeLaneLimit(value: number | undefined): number | null {
  return value === undefined ? null : validateLaneLimit(value);
}

function validateLaneLimit(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_TODAY_LANE_LIMIT
  ) {
    throw new Error(`laneLimit must be an integer between 1 and ${MAX_TODAY_LANE_LIMIT}.`);
  }

  return value;
}

function applyLaneLimit<T>(tasks: T[], laneLimit: number | null): T[] {
  return laneLimit === null ? tasks : tasks.slice(0, laneLimit);
}

function summarizeLane(tasks: TodayTaskView[], laneLimit: number | null) {
  const returnedCount = laneLimit === null ? tasks.length : Math.min(tasks.length, laneLimit);

  return {
    totalCount: tasks.length,
    returnedCount,
    limit: laneLimit,
    hasMore: returnedCount < tasks.length
  };
}

function compareTodayTasks(left: TodayTaskView, right: TodayTaskView): number {
  const leftDate = left.dueAt ?? left.startAt ?? "";
  const rightDate = right.dueAt ?? right.startAt ?? "";
  const dateDelta = leftDate.localeCompare(rightDate);

  if (dateDelta !== 0) {
    return dateDelta;
  }

  const sortDelta = left.sortOrder - right.sortOrder;

  if (sortDelta !== 0) {
    return sortDelta;
  }

  return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
}
