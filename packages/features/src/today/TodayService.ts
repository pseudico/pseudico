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
  TaskRepository,
  type DatabaseConnection,
  type TaskWithItemRecord
} from "@local-work-os/db";
import {
  toTodayTaskView,
  type TodayTaskView,
  type TodayViewModel
} from "./TodayViewModel";

// Owns Today/Tomorrow planning application contracts.
// Does not own task persistence internals or calendar rendering.
export const DEFAULT_TODAY_BACKLOG_DAYS = 14;
export const TODAY_BACKLOG_DAYS_SETTING_KEY = "today_backlog_days";

export type TodayQueryInput = {
  workspaceId: string;
  date?: LocalDateInput;
  backlogDays?: number;
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
    const backlogDays = this.resolveBacklogDays(input);
    const normalizedInput = { ...input, date, backlogDays };
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
      dueToday: this.listDueToday(normalizedInput),
      overdueBacklog: this.listOverdueBacklog(normalizedInput),
      tomorrowPreview: this.listTomorrowPreview(normalizedInput)
    };
  }

  listDueToday(input: TodayQueryInput): TodayTaskView[] {
    this.validateInput(input);

    const range = createLocalDayRange(input.date ?? this.now());
    return this.listTasks(input.workspaceId, (repository) =>
      repository.listDueBetween(input.workspaceId, range)
    );
  }

  listOverdueBacklog(input: TodayQueryInput): TodayTaskView[] {
    this.validateInput(input);

    const range = createLocalDayWindowRange({
      date: input.date ?? this.now(),
      startOffsetDays: -this.resolveBacklogDays(input),
      endOffsetDays: 0
    });

    return this.listTasks(input.workspaceId, (repository) =>
      repository.listOverdueBetween(input.workspaceId, range)
    );
  }

  listTomorrowPreview(input: TodayQueryInput): TodayTaskView[] {
    this.validateInput(input);

    const range = createRelativeLocalDayRange(input.date ?? this.now(), 1);
    return this.listTasks(input.workspaceId, (repository) =>
      repository.listDueBetween(input.workspaceId, range)
    );
  }

  private listTasks(
    workspaceId: string,
    query: (repository: TaskRepository) => TaskWithItemRecord[]
  ): TodayTaskView[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return query(new TaskRepository(this.connection)).map(toTodayTaskView);
  }

  private resolveBacklogDays(input: TodayQueryInput): number {
    if (input.backlogDays !== undefined) {
      return validateBacklogDays(input.backlogDays);
    }

    const setting = new AppSettingsRepository(this.connection).findByKey({
      workspaceId: input.workspaceId,
      settingKey: TODAY_BACKLOG_DAYS_SETTING_KEY
    });

    if (setting === null) {
      return DEFAULT_TODAY_BACKLOG_DAYS;
    }

    try {
      return validateBacklogDays(JSON.parse(setting.valueJson));
    } catch {
      return DEFAULT_TODAY_BACKLOG_DAYS;
    }
  }

  private validateInput(input: TodayQueryInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    if (input.backlogDays !== undefined) {
      validateBacklogDays(input.backlogDays);
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
