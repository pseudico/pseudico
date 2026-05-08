import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ReminderRepository,
  TaskRepository,
  TransactionService,
  type DatabaseConnection,
  type ReminderEventRecord,
  type ReminderPolicyMode,
  type ReminderPolicyRecord,
  type TaskWithItemRecord
} from "@local-work-os/db";
import { normalizeTaskDateTime } from "../tasks/TaskQueries";

export type ReminderServiceIdFactory = (prefix: string) => string;

export type SetTaskReminderInput = {
  workspaceId: string;
  taskId: string;
  actorType?: ActivityActorType;
  triggerAt?: string;
  leadMinutes?: number;
};

export type ClearTaskReminderInput = {
  taskId: string;
  actorType?: ActivityActorType;
};

export type DismissReminderInput = {
  eventId: string;
  actorType?: ActivityActorType;
};

export type SnoozeReminderInput = {
  eventId: string;
  until: string;
  actorType?: ActivityActorType;
};

export type RescheduleTaskReminderInput = {
  taskId: string;
  actorType?: ActivityActorType;
};

export type TaskReminderMutationResult = {
  policy: ReminderPolicyRecord | null;
  event: ReminderEventRecord | null;
};

export type ReminderEventMutationResult = {
  policy: ReminderPolicyRecord;
  event: ReminderEventRecord;
};

export class ReminderService {
  readonly module = "reminders";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: ReminderServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: ReminderServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({ connection: input.connection });
  }

  async setTaskReminder(input: SetTaskReminderInput): Promise<TaskReminderMutationResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.taskId, "taskId");
    validateReminderTiming(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const task = this.requireTask(input.taskId);

      if (task.item.workspaceId !== input.workspaceId) {
        throw new Error("Reminder workspaceId must match the task workspace.");
      }

      const mode: ReminderPolicyMode = input.leadMinutes === undefined ? "absolute" : "relative";
      const triggerAt = computeTriggerAt({
        task,
        mode,
        triggerAt: input.triggerAt,
        leadMinutes: input.leadMinutes
      });
      const repository = new ReminderRepository(this.connection);
      const beforePolicy = repository.getActivePolicyForTask(input.taskId);
      const beforeEvent = beforePolicy === null
        ? null
        : repository.getNextActiveEventByPolicy(beforePolicy.id);
      const policy = beforePolicy === null
        ? repository.createPolicy({
            id: this.idFactory("reminder_policy"),
            workspaceId: task.item.workspaceId,
            taskItemId: task.item.id,
            mode,
            leadMinutes: input.leadMinutes ?? null,
            triggerAt,
            timestamp
          })
        : repository.updatePolicy(beforePolicy.id, {
            mode,
            leadMinutes: input.leadMinutes ?? null,
            triggerAt,
            status: "active",
            deletedAt: null,
            timestamp
          });

      if (beforePolicy !== null) {
        repository.cancelActiveEventsForPolicy(beforePolicy.id, timestamp);
      }

      const event = repository.createEvent({
        id: this.idFactory("reminder_event"),
        workspaceId: task.item.workspaceId,
        policyId: policy.id,
        taskItemId: task.item.id,
        scheduledForAt: triggerAt,
        timestamp
      });

      new TaskRepository(this.connection).updateDetails(task.item.id, {
        reminderPolicyId: policy.id,
        timestamp
      });
      this.logReminderEvent({
        task,
        action: ActivityAction.reminderSet,
        summary: `Set reminder for task "${task.item.title}".`,
        before: { policy: beforePolicy, event: beforeEvent },
        after: { policy, event },
        actorType: input.actorType,
        timestamp
      });

      return { policy, event };
    });
  }

  async clearTaskReminder(input: ClearTaskReminderInput): Promise<TaskReminderMutationResult> {
    validateNonEmptyString(input.taskId, "taskId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const task = this.requireTask(input.taskId);
      const repository = new ReminderRepository(this.connection);
      const beforePolicy = repository.getActivePolicyForTask(input.taskId);

      if (beforePolicy === null) {
        return { policy: null, event: null };
      }

      const beforeEvent = repository.getNextActiveEventByPolicy(beforePolicy.id);
      repository.cancelActiveEventsForPolicy(beforePolicy.id, timestamp);
      const policy = repository.updatePolicy(beforePolicy.id, {
        status: "cleared",
        deletedAt: timestamp,
        timestamp
      });
      new TaskRepository(this.connection).updateDetails(task.item.id, {
        reminderPolicyId: null,
        timestamp
      });

      this.logReminderEvent({
        task,
        action: ActivityAction.reminderCleared,
        summary: `Cleared reminder for task "${task.item.title}".`,
        before: { policy: beforePolicy, event: beforeEvent },
        after: { policy, event: null },
        actorType: input.actorType,
        timestamp
      });

      return { policy, event: null };
    });
  }

  async rescheduleReminderForTaskDateChange(
    input: RescheduleTaskReminderInput
  ): Promise<TaskReminderMutationResult> {
    validateNonEmptyString(input.taskId, "taskId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const task = this.requireTask(input.taskId);
      const repository = new ReminderRepository(this.connection);
      const beforePolicy = repository.getActivePolicyForTask(input.taskId);

      if (beforePolicy === null) {
        return { policy: null, event: null };
      }

      if (beforePolicy.mode === "absolute" || beforePolicy.leadMinutes === null) {
        return { policy: beforePolicy, event: repository.getNextActiveEventByPolicy(beforePolicy.id) };
      }

      const beforeEvent = repository.getNextActiveEventByPolicy(beforePolicy.id);

      if (task.task.dueAt === null) {
        repository.cancelActiveEventsForPolicy(beforePolicy.id, timestamp);
        const policy = repository.updatePolicy(beforePolicy.id, {
          status: "cleared",
          deletedAt: timestamp,
          timestamp
        });
        new TaskRepository(this.connection).updateDetails(task.item.id, {
          reminderPolicyId: null,
          timestamp
        });
        this.logReminderEvent({
          task,
          action: ActivityAction.reminderCleared,
          summary: `Cleared reminder for task "${task.item.title}" because it no longer has a due date.`,
          before: { policy: beforePolicy, event: beforeEvent },
          after: { policy, event: null },
          actorType: input.actorType,
          timestamp
        });
        return { policy, event: null };
      }

      const triggerAt = computeRelativeTriggerAt(task.task.dueAt, beforePolicy.leadMinutes);
      repository.cancelActiveEventsForPolicy(beforePolicy.id, timestamp);
      const policy = repository.updatePolicy(beforePolicy.id, {
        triggerAt,
        timestamp
      });
      const event = repository.createEvent({
        id: this.idFactory("reminder_event"),
        workspaceId: task.item.workspaceId,
        policyId: policy.id,
        taskItemId: task.item.id,
        scheduledForAt: triggerAt,
        timestamp
      });

      this.logReminderEvent({
        task,
        action: ActivityAction.reminderRescheduled,
        summary: `Rescheduled reminder for task "${task.item.title}".`,
        before: { policy: beforePolicy, event: beforeEvent },
        after: { policy, event },
        actorType: input.actorType,
        timestamp
      });

      return { policy, event };
    });
  }

  async dismissReminder(input: DismissReminderInput): Promise<ReminderEventMutationResult> {
    validateNonEmptyString(input.eventId, "eventId");

    return await this.updateReminderEventStatus({
      eventId: input.eventId,
      status: "dismissed",
      action: ActivityAction.reminderDismissed,
      summaryVerb: "Dismissed",
      actorType: input.actorType,
      apply: (repository, event, timestamp) => repository.updateEvent(event.id, {
        status: "dismissed",
        dismissedAt: timestamp,
        timestamp
      })
    });
  }

  async snoozeReminder(input: SnoozeReminderInput): Promise<ReminderEventMutationResult> {
    validateNonEmptyString(input.eventId, "eventId");
    const snoozedUntil = normalizeTaskDateTime(input.until, "until");

    if (snoozedUntil === undefined || snoozedUntil === null) {
      throw new Error("until must be a valid reminder date/time.");
    }

    return await this.updateReminderEventStatus({
      eventId: input.eventId,
      status: "snoozed",
      action: ActivityAction.reminderSnoozed,
      summaryVerb: "Snoozed",
      actorType: input.actorType,
      apply: (repository, event, timestamp) => repository.updateEvent(event.id, {
        status: "snoozed",
        snoozedUntil,
        timestamp
      })
    });
  }

  async markReminderFired(eventId: string): Promise<ReminderEventMutationResult> {
    validateNonEmptyString(eventId, "eventId");

    return await this.updateReminderEventStatus({
      eventId,
      status: "fired",
      action: ActivityAction.reminderFired,
      summaryVerb: "Fired",
      actorType: "system",
      apply: (repository, event, timestamp) => repository.updateEvent(event.id, {
        status: "fired",
        firedAt: timestamp,
        timestamp
      })
    });
  }

  listDueReminderEvents(workspaceId: string, now: string | Date = this.now()): ReminderEventRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");
    return new ReminderRepository(this.connection).listDueEvents(
      workspaceId,
      normalizeDateTime(now, "now")
    );
  }

  listNextScheduledReminderEvents(workspaceId: string): ReminderEventRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");
    return new ReminderRepository(this.connection).listNextScheduledEvents(workspaceId);
  }

  getNextEventForPolicy(policyId: string): ReminderEventRecord | null {
    validateNonEmptyString(policyId, "policyId");
    return new ReminderRepository(this.connection).getNextActiveEventByPolicy(policyId);
  }

  private async updateReminderEventStatus(input: {
    eventId: string;
    status: ReminderEventRecord["status"];
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summaryVerb: string;
    actorType?: ActivityActorType | undefined;
    apply: (
      repository: ReminderRepository,
      event: ReminderEventRecord,
      timestamp: string
    ) => ReminderEventRecord;
  }): Promise<ReminderEventMutationResult> {
    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new ReminderRepository(this.connection);
      const beforeEvent = repository.getEventById(input.eventId);

      if (beforeEvent === null) {
        throw new Error(`Reminder event was not found: ${input.eventId}.`);
      }

      const policy = repository.getPolicyById(beforeEvent.policyId);

      if (policy === null) {
        throw new Error(`Reminder policy was not found: ${beforeEvent.policyId}.`);
      }

      const task = this.requireTask(beforeEvent.taskItemId);
      const event = input.apply(repository, beforeEvent, timestamp);
      this.logReminderEvent({
        task,
        action: input.action,
        summary: `${input.summaryVerb} reminder for task "${task.item.title}".`,
        before: { policy, event: beforeEvent },
        after: { policy, event },
        actorType: input.actorType,
        timestamp
      });

      return { policy, event };
    });
  }

  private requireTask(taskId: string): TaskWithItemRecord {
    const task = new TaskRepository(this.connection).getByItemId(taskId);

    if (task === null) {
      throw new Error(`Task was not found: ${taskId}.`);
    }

    return task;
  }

  private logReminderEvent(input: {
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

export const remindersModuleContract = {
  module: "reminders",
  purpose: "Manage local task reminder policies, reminder events, and scheduler-facing projections.",
  owns: ["task reminder policies", "reminder event state", "local notification scheduling inputs"],
  doesNotOwn: ["cloud notifications", "mobile push", "general task persistence"],
  integrationPoints: ["tasks", "activity", "desktop main notifications"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function validateReminderTiming(input: SetTaskReminderInput): void {
  const hasTriggerAt = input.triggerAt !== undefined;
  const hasLeadMinutes = input.leadMinutes !== undefined;

  if (hasTriggerAt === hasLeadMinutes) {
    throw new Error("setTaskReminder requires either triggerAt or leadMinutes, not both.");
  }

  if (input.leadMinutes !== undefined && (!Number.isInteger(input.leadMinutes) || input.leadMinutes < 0)) {
    throw new Error("leadMinutes must be a non-negative integer.");
  }
}

function computeTriggerAt(input: {
  task: TaskWithItemRecord;
  mode: ReminderPolicyMode;
  triggerAt?: string | undefined;
  leadMinutes?: number | undefined;
}): string {
  if (input.mode === "absolute") {
    const triggerAt = normalizeTaskDateTime(input.triggerAt, "triggerAt");

    if (triggerAt === undefined || triggerAt === null) {
      throw new Error("triggerAt must be a valid reminder date/time.");
    }

    return triggerAt;
  }

  if (input.task.task.dueAt === null || input.leadMinutes === undefined) {
    throw new Error("relative reminders require a task due date and leadMinutes.");
  }

  return computeRelativeTriggerAt(input.task.task.dueAt, input.leadMinutes);
}

function computeRelativeTriggerAt(dueAt: string, leadMinutes: number): string {
  const dueDate = new Date(dueAt);

  if (Number.isNaN(dueDate.getTime())) {
    throw new Error("Task dueAt must be a valid date to set a relative reminder.");
  }

  return new Date(dueDate.getTime() - leadMinutes * 60_000).toISOString();
}

function normalizeDateTime(value: string | Date, fieldName: string): string {
  if (value instanceof Date) {
    return createIsoTimestamp(value);
  }

  const normalized = normalizeTaskDateTime(value, fieldName);

  if (normalized === undefined || normalized === null) {
    throw new Error(`${fieldName} must be a valid date/time.`);
  }

  return normalized;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
