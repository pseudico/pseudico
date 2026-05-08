import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ItemRepository,
  RecurrenceRepository,
  SearchIndexService,
  TagRepository,
  TaskRepository,
  TransactionService,
  type DatabaseConnection,
  type ItemRecord,
  type RecurrenceFrequency,
  type RecurrenceRuleRecord,
  type SearchIndexRecord,
  type TaskRecord,
  type TaskWithItemRecord
} from "@local-work-os/db";
import { ReminderService } from "../reminders";
import { normalizeTaskDateTime } from "../tasks/TaskQueries";

export type RecurrenceServiceIdFactory = (prefix: string) => string;
export type RecurrenceWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type SetRecurrenceRuleInput = {
  taskId: string;
  actorType?: ActivityActorType;
  frequency: RecurrenceFrequency;
  interval?: number;
  weekdays?: RecurrenceWeekday[] | null;
  anchorAt?: string;
};

export type ClearRecurrenceRuleInput = {
  taskId: string;
  actorType?: ActivityActorType;
};

export type CompleteRecurringTaskInput = {
  taskId: string;
  actorType?: ActivityActorType;
};

export type RecurrenceRuleMutationResult = {
  rule: RecurrenceRuleRecord | null;
  task: TaskRecord;
};

export type RecurringTaskCompletionResult = TaskWithItemRecord & {
  rule: RecurrenceRuleRecord;
  searchRecord: SearchIndexRecord;
  inlineTags: string[];
};

export class RecurrenceService {
  readonly module = "recurrence";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: RecurrenceServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: RecurrenceServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({ connection: input.connection });
  }

  async setRecurrenceRule(input: SetRecurrenceRuleInput): Promise<RecurrenceRuleMutationResult> {
    validateNonEmptyString(input.taskId, "taskId");
    validateRuleFields(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const taskWithItem = this.requireTask(input.taskId);
      const repository = new RecurrenceRepository(this.connection);
      const beforeRule = repository.getActiveRuleForTask(input.taskId);
      const interval = input.interval ?? 1;
      const anchorAt = normalizeTaskDateTime(input.anchorAt ?? taskWithItem.task.dueAt ?? timestamp, "anchorAt");

      if (anchorAt === undefined || anchorAt === null) {
        throw new Error("anchorAt must be a valid date/time.");
      }

      const normalizedWeekdays = normalizeWeekdays(input.frequency, input.weekdays, anchorAt);
      const nextOccurrenceAt = this.calculateNextOccurrence(
        {
          frequency: input.frequency,
          interval,
          weekdays: normalizedWeekdays,
          anchorAt
        },
        taskWithItem.task.dueAt ?? timestamp
      );
      const rule = beforeRule === null
        ? repository.createRule({
            id: this.idFactory("recurrence_rule"),
            workspaceId: taskWithItem.item.workspaceId,
            taskItemId: taskWithItem.item.id,
            frequency: input.frequency,
            interval,
            weekdays: normalizedWeekdays,
            anchorAt,
            nextOccurrenceAt,
            timestamp
          })
        : repository.updateRule(beforeRule.id, {
            frequency: input.frequency,
            interval,
            weekdays: normalizedWeekdays,
            anchorAt,
            nextOccurrenceAt,
            status: "active",
            deletedAt: null,
            timestamp
          });
      const task = new TaskRepository(this.connection).updateDetails(taskWithItem.item.id, {
        recurrenceRuleId: rule.id,
        timestamp
      });

      this.logRecurrenceEvent({
        task: taskWithItem,
        action: ActivityAction.recurrenceSet,
        summary: `Set recurrence for task "${taskWithItem.item.title}".`,
        before: { rule: beforeRule },
        after: { rule },
        actorType: input.actorType,
        timestamp
      });

      return { rule, task };
    });
  }

  async clearRecurrenceRule(input: ClearRecurrenceRuleInput): Promise<RecurrenceRuleMutationResult> {
    validateNonEmptyString(input.taskId, "taskId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const taskWithItem = this.requireTask(input.taskId);
      const repository = new RecurrenceRepository(this.connection);
      const beforeRule = repository.getActiveRuleForTask(input.taskId);

      if (beforeRule === null) {
        return { rule: null, task: taskWithItem.task };
      }

      const rule = repository.updateRule(beforeRule.id, {
        status: "cleared",
        deletedAt: timestamp,
        timestamp
      });
      const task = new TaskRepository(this.connection).updateDetails(taskWithItem.item.id, {
        recurrenceRuleId: null,
        timestamp
      });

      this.logRecurrenceEvent({
        task: taskWithItem,
        action: ActivityAction.recurrenceCleared,
        summary: `Cleared recurrence for task "${taskWithItem.item.title}".`,
        before: { rule: beforeRule },
        after: { rule: null },
        actorType: input.actorType,
        timestamp
      });

      return { rule, task };
    });
  }

  async completeRecurringTask(input: CompleteRecurringTaskInput): Promise<RecurringTaskCompletionResult> {
    validateNonEmptyString(input.taskId, "taskId");

    return await this.transactionService.runInTransaction(async () => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireTask(input.taskId);
      const repository = new RecurrenceRepository(this.connection);
      const beforeRule = repository.getActiveRuleForTask(input.taskId);

      if (beforeRule === null) {
        throw new Error(`Task does not have an active recurrence rule: ${input.taskId}.`);
      }

      const fromDate = before.task.dueAt ?? beforeRule.nextOccurrenceAt ?? timestamp;
      const nextOccurrenceAt = this.calculateNextOccurrence(beforeRule, fromDate);
      const shiftedStartAt = shiftStartDate({
        startAt: before.task.startAt,
        dueAt: before.task.dueAt,
        nextDueAt: nextOccurrenceAt
      });
      const item = new ItemRepository(this.connection).update(input.taskId, {
        status: "active",
        completedAt: null,
        timestamp
      });
      const task = new TaskRepository(this.connection).updateDetails(input.taskId, {
        taskStatus: before.task.taskStatus === "waiting" ? "waiting" : "open",
        startAt: shiftedStartAt,
        dueAt: nextOccurrenceAt,
        completedAt: null,
        timestamp
      });
      const rule = repository.updateRule(beforeRule.id, {
        nextOccurrenceAt,
        timestamp
      });

      this.logRecurrenceEvent({
        task: before,
        action: ActivityAction.recurrenceAdvanced,
        summary: `Completed recurring task "${item.title}" and advanced the next occurrence.`,
        before: { task: before, rule: beforeRule },
        after: { item, task, rule },
        actorType: input.actorType,
        timestamp
      });

      await new ReminderService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).rescheduleReminderForTaskDateChange({
        taskId: item.id,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });

      const searchRecord = this.upsertSearchRecord(item, task, timestamp);

      return {
        item,
        task,
        rule,
        searchRecord,
        inlineTags: this.getInlineTagSlugs(item)
      };
    });
  }

  calculateNextOccurrence(
    rule: Pick<RecurrenceRuleRecord, "frequency" | "interval" | "weekdays" | "anchorAt">,
    fromDate: string | Date
  ): string {
    const anchor = normalizeDate(rule.anchorAt, "rule.anchorAt");
    const from = normalizeDate(fromDate, "fromDate");
    const interval = rule.interval;

    if (!Number.isInteger(interval) || interval < 1) {
      throw new Error("Recurrence interval must be a positive integer.");
    }

    if (rule.frequency === "daily") {
      return calculateNextDaily(anchor, from, interval).toISOString();
    }

    if (rule.frequency === "weekly") {
      return calculateNextWeekly(anchor, from, interval, rule.weekdays).toISOString();
    }

    throw new Error("Recurrence frequency must be daily or weekly.");
  }

  private requireTask(taskId: string): TaskWithItemRecord {
    const task = new TaskRepository(this.connection).getByItemId(taskId);

    if (task === null) {
      throw new Error(`Task was not found: ${taskId}.`);
    }

    return task;
  }

  private upsertSearchRecord(
    item: ItemRecord,
    task: TaskRecord,
    timestamp: string
  ): SearchIndexRecord {
    const tags = new TagRepository(this.connection).listTagsForTarget({
      workspaceId: item.workspaceId,
      targetType: "item",
      targetId: item.id
    });
    const tagSlugs = tags.map((tag) => tag.slug);
    const inlineTagSlugs = tags
      .filter((tag) => tag.taggingSource === "inline")
      .map((tag) => tag.slug);

    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertItem(item, {
      timestamp,
      tags: tagSlugs,
      metadata: {
        taskStatus: task.taskStatus,
        priority: task.priority,
        startAt: task.startAt,
        dueAt: task.dueAt,
        allDay: task.allDay,
        timezone: task.timezone,
        completedAt: task.completedAt,
        recurrenceRuleId: task.recurrenceRuleId,
        tagIds: tags.map((tag) => tag.id),
        tagSlugs,
        inlineTags: inlineTagSlugs,
        inlineTagSlugs
      }
    });
  }

  private getInlineTagSlugs(item: ItemRecord): string[] {
    return new TagRepository(this.connection)
      .listTagsForTarget({
        workspaceId: item.workspaceId,
        targetType: "item",
        targetId: item.id,
        source: "inline"
      })
      .map((tag) => tag.slug);
  }

  private logRecurrenceEvent(input: {
    task: TaskWithItemRecord;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: unknown;
    after: unknown;
    actorType?: ActivityActorType | undefined;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.task.item.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: input.action,
      targetType: "item",
      targetId: input.task.item.id,
      summary: input.summary,
      beforeJson: JSON.stringify(input.before),
      afterJson: JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }
}

export const recurrenceModuleContract = {
  module: "recurrence",
  purpose: "Manage narrow local task recurrence rules and recurring task roll-forward behavior.",
  owns: ["task recurrence rules", "daily and weekly next occurrence calculation", "recurring task completion roll-forward"],
  doesNotOwn: ["monthly/yearly RRULEs", "cloud calendars", "calendar rendering"],
  integrationPoints: ["tasks", "activity", "search", "reminders"],
  priority: "V2"
} as const satisfies FeatureModuleContract;

function calculateNextDaily(anchor: Date, from: Date, intervalDays: number): Date {
  const candidate = cloneWithAnchorTime(anchor, anchor);

  if (candidate.getTime() <= from.getTime()) {
    const elapsedDays = Math.floor((startOfUtcDay(from).getTime() - startOfUtcDay(anchor).getTime()) / DAY_MS);
    const intervals = Math.floor(elapsedDays / intervalDays) + 1;
    candidate.setUTCDate(anchor.getUTCDate() + intervals * intervalDays);
  }

  while (candidate.getTime() <= from.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + intervalDays);
  }

  return candidate;
}

function calculateNextWeekly(
  anchor: Date,
  from: Date,
  intervalWeeks: number,
  weekdays: number[] | null
): Date {
  const selectedWeekdays = weekdays === null || weekdays.length === 0
    ? [anchor.getUTCDay()]
    : [...new Set(weekdays)].sort((a, b) => a - b);
  const cursor = startOfUtcDay(anchor);
  const end = new Date(from.getTime() + 371 * DAY_MS * Math.max(intervalWeeks, 1));

  while (cursor.getTime() <= end.getTime()) {
    const candidate = cloneWithAnchorTime(cursor, anchor);
    const weeksSinceAnchor = Math.floor(
      (startOfUtcWeek(candidate).getTime() - startOfUtcWeek(anchor).getTime()) / WEEK_MS
    );

    if (
      candidate.getTime() > from.getTime() &&
      weeksSinceAnchor >= 0 &&
      weeksSinceAnchor % intervalWeeks === 0 &&
      selectedWeekdays.includes(candidate.getUTCDay())
    ) {
      return candidate;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  throw new Error("Unable to calculate the next weekly recurrence occurrence.");
}

function normalizeWeekdays(
  frequency: RecurrenceFrequency,
  weekdays: RecurrenceWeekday[] | null | undefined,
  anchorAt: string
): number[] | null {
  if (frequency === "daily") {
    return null;
  }

  if (weekdays === undefined || weekdays === null || weekdays.length === 0) {
    return [new Date(anchorAt).getUTCDay()];
  }

  return [...new Set(weekdays)].sort((a, b) => a - b);
}

function validateRuleFields(input: Pick<SetRecurrenceRuleInput, "frequency" | "interval" | "weekdays">): void {
  if (input.frequency !== "daily" && input.frequency !== "weekly") {
    throw new Error("frequency must be daily or weekly.");
  }

  if (input.interval !== undefined && (!Number.isInteger(input.interval) || input.interval < 1)) {
    throw new Error("interval must be a positive integer.");
  }

  if (input.weekdays !== undefined && input.weekdays !== null) {
    for (const weekday of input.weekdays) {
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        throw new Error("weekdays must contain integers from 0 through 6.");
      }
    }
  }
}

function normalizeDate(value: string | Date, fieldName: string): Date {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date/time.`);
  }

  return date;
}

function shiftStartDate(input: {
  startAt: string | null;
  dueAt: string | null;
  nextDueAt: string;
}): string | null {
  if (input.startAt === null || input.dueAt === null) {
    return input.startAt;
  }

  const start = normalizeDate(input.startAt, "startAt");
  const due = normalizeDate(input.dueAt, "dueAt");
  const nextDue = normalizeDate(input.nextDueAt, "nextDueAt");
  return new Date(start.getTime() + (nextDue.getTime() - due.getTime())).toISOString();
}

function cloneWithAnchorTime(date: Date, anchor: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    anchor.getUTCHours(),
    anchor.getUTCMinutes(),
    anchor.getUTCSeconds(),
    anchor.getUTCMilliseconds()
  ));
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  day.setUTCDate(day.getUTCDate() - day.getUTCDay());
  return day;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
