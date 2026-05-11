import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  AppSettingsRepository,
  ListRepository,
  ReminderRepository,
  TaskRepository,
  TransactionService,
  type AppSettingRecord,
  type DatabaseConnection,
  type ReminderEventRecord,
  type ReminderPolicyAnchor,
  type ReminderPolicyMode,
  type ReminderPolicyRecord,
  type ReminderPolicyTargetType,
  type TaskWithItemRecord
} from "@local-work-os/db";
import { normalizeTaskDateTime } from "../tasks/TaskQueries";

export const REMINDER_PREFERENCES_SETTING_KEY = "reminder_preferences";

export type ReminderServiceIdFactory = (prefix: string) => string;

export type ReminderDefaultPreferences = {
  enabled: boolean;
  anchor: ReminderPolicyAnchor;
  leadMinutes: number;
};

export type ReminderPreferences = {
  notificationsEnabled: boolean;
  tasks: ReminderDefaultPreferences;
  listItems: ReminderDefaultPreferences;
};

export type ReminderPreferencesValue = Partial<{
  notificationsEnabled: boolean;
  tasks: Partial<ReminderDefaultPreferences>;
  listItems: Partial<ReminderDefaultPreferences>;
}>;

export type UpdateReminderPreferencesInput = {
  workspaceId: string;
  preferences: ReminderPreferencesValue;
  actorType?: ActivityActorType;
};

export type ReminderPreferencesMutationResult = {
  preferences: ReminderPreferences;
  setting: AppSettingRecord;
};

export type ReminderCreationInput =
  | { mode: "default" }
  | { mode: "none" }
  | { mode: "relative"; leadMinutes: number; anchor?: ReminderPolicyAnchor }
  | { mode: "absolute"; triggerAt: string; anchor?: ReminderPolicyAnchor };

export type SetTaskReminderInput = {
  workspaceId: string;
  taskId: string;
  actorType?: ActivityActorType;
  triggerAt?: string;
  leadMinutes?: number;
  anchor?: ReminderPolicyAnchor;
};

export type SetListItemReminderInput = {
  workspaceId: string;
  listItemId: string;
  actorType?: ActivityActorType;
  triggerAt?: string;
  leadMinutes?: number;
  anchor?: ReminderPolicyAnchor;
};

export type ClearTaskReminderInput = {
  taskId: string;
  actorType?: ActivityActorType;
};

export type ClearListItemReminderInput = {
  listItemId: string;
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

export type RescheduleListItemReminderInput = {
  listItemId: string;
  actorType?: ActivityActorType;
};

export type ApplyDefaultTaskReminderInput = {
  workspaceId: string;
  taskId: string;
  actorType?: ActivityActorType;
};

export type ApplyDefaultListItemReminderInput = {
  workspaceId: string;
  listItemId: string;
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

const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  notificationsEnabled: true,
  tasks: {
    enabled: false,
    anchor: "due",
    leadMinutes: 1440
  },
  listItems: {
    enabled: false,
    anchor: "due",
    leadMinutes: 1440
  }
};

type ReminderTarget = {
  workspaceId: string;
  targetType: ReminderPolicyTargetType;
  targetId: string;
  taskItemId: string;
  activityTargetType: "item" | "list_item";
  title: string;
  label: "task" | "list item";
  startAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
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

  getPreferences(workspaceId: string): ReminderPreferences {
    validateNonEmptyString(workspaceId, "workspaceId");
    const setting = new AppSettingsRepository(this.connection).findByKey({
      workspaceId,
      settingKey: REMINDER_PREFERENCES_SETTING_KEY
    });

    return normalizeReminderPreferences(
      setting === null ? undefined : safeParseJson(setting.valueJson)
    );
  }

  async updatePreferences(
    input: UpdateReminderPreferencesInput
  ): Promise<ReminderPreferencesMutationResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new AppSettingsRepository(this.connection);
      const before = repository.findByKey({
        workspaceId: input.workspaceId,
        settingKey: REMINDER_PREFERENCES_SETTING_KEY
      });
      const preferences = normalizeReminderPreferences(input.preferences, this.getPreferences(input.workspaceId));
      const setting = repository.upsert({
        id: before?.id ?? this.idFactory("app_setting"),
        workspaceId: input.workspaceId,
        settingKey: REMINDER_PREFERENCES_SETTING_KEY,
        valueJson: JSON.stringify(preferences),
        timestamp
      });

      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId: input.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.workspacePreferencesUpdated,
        targetType: "workspace",
        targetId: input.workspaceId,
        summary: "Updated reminder defaults and notification preferences.",
        beforeJson: before?.valueJson ?? null,
        afterJson: setting.valueJson,
        timestamp
      });

      return { preferences, setting };
    });
  }

  async applyDefaultTaskReminder(
    input: ApplyDefaultTaskReminderInput
  ): Promise<TaskReminderMutationResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.taskId, "taskId");
    const preferences = this.getPreferences(input.workspaceId);

    if (!preferences.notificationsEnabled || !preferences.tasks.enabled) {
      return { policy: null, event: null };
    }

    const target = this.requireTaskTarget(input.taskId);
    if (target.workspaceId !== input.workspaceId || target.completedAt !== null) {
      return { policy: null, event: null };
    }

    if (getAnchorDate(target, preferences.tasks.anchor) === null) {
      return { policy: null, event: null };
    }

    return await this.setReminderForTarget({
      target,
      workspaceId: input.workspaceId,
      leadMinutes: preferences.tasks.leadMinutes,
      anchor: preferences.tasks.anchor,
      actorType: input.actorType,
      summaryPrefix: "Applied default reminder"
    });
  }

  async applyDefaultListItemReminder(
    input: ApplyDefaultListItemReminderInput
  ): Promise<TaskReminderMutationResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.listItemId, "listItemId");
    const preferences = this.getPreferences(input.workspaceId);

    if (!preferences.notificationsEnabled || !preferences.listItems.enabled) {
      return { policy: null, event: null };
    }

    const target = this.requireListItemTarget(input.listItemId);
    if (target.workspaceId !== input.workspaceId || target.completedAt !== null) {
      return { policy: null, event: null };
    }

    if (getAnchorDate(target, preferences.listItems.anchor) === null) {
      return { policy: null, event: null };
    }

    return await this.setReminderForTarget({
      target,
      workspaceId: input.workspaceId,
      leadMinutes: preferences.listItems.leadMinutes,
      anchor: preferences.listItems.anchor,
      actorType: input.actorType,
      summaryPrefix: "Applied default reminder"
    });
  }

  async setTaskReminder(input: SetTaskReminderInput): Promise<TaskReminderMutationResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.taskId, "taskId");
    validateReminderTiming(input);

    return await this.setReminderForTarget({
      target: this.requireTaskTarget(input.taskId),
      workspaceId: input.workspaceId,
      triggerAt: input.triggerAt,
      leadMinutes: input.leadMinutes,
      anchor: input.anchor,
      actorType: input.actorType,
      summaryPrefix: "Set reminder"
    });
  }

  async setListItemReminder(input: SetListItemReminderInput): Promise<TaskReminderMutationResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.listItemId, "listItemId");
    validateReminderTiming(input);

    return await this.setReminderForTarget({
      target: this.requireListItemTarget(input.listItemId),
      workspaceId: input.workspaceId,
      triggerAt: input.triggerAt,
      leadMinutes: input.leadMinutes,
      anchor: input.anchor,
      actorType: input.actorType,
      summaryPrefix: "Set reminder"
    });
  }

  async clearTaskReminder(input: ClearTaskReminderInput): Promise<TaskReminderMutationResult> {
    validateNonEmptyString(input.taskId, "taskId");
    return await this.clearReminderForTarget({
      target: this.requireTaskTarget(input.taskId),
      actorType: input.actorType,
      summary: undefined
    });
  }

  async clearListItemReminder(
    input: ClearListItemReminderInput
  ): Promise<TaskReminderMutationResult> {
    validateNonEmptyString(input.listItemId, "listItemId");
    return await this.clearReminderForTarget({
      target: this.requireListItemTarget(input.listItemId),
      actorType: input.actorType,
      summary: undefined
    });
  }

  async rescheduleReminderForTaskDateChange(
    input: RescheduleTaskReminderInput
  ): Promise<TaskReminderMutationResult> {
    validateNonEmptyString(input.taskId, "taskId");
    return await this.rescheduleReminderForTargetDateChange({
      target: this.requireTaskTarget(input.taskId),
      actorType: input.actorType
    });
  }

  async rescheduleReminderForListItemDateChange(
    input: RescheduleListItemReminderInput
  ): Promise<TaskReminderMutationResult> {
    validateNonEmptyString(input.listItemId, "listItemId");
    return await this.rescheduleReminderForTargetDateChange({
      target: this.requireListItemTarget(input.listItemId),
      actorType: input.actorType
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
    if (!this.getPreferences(workspaceId).notificationsEnabled) {
      return [];
    }
    return new ReminderRepository(this.connection).listDueEvents(
      workspaceId,
      normalizeDateTime(now, "now")
    );
  }

  listNextScheduledReminderEvents(workspaceId: string): ReminderEventRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");
    if (!this.getPreferences(workspaceId).notificationsEnabled) {
      return [];
    }
    return new ReminderRepository(this.connection).listNextScheduledEvents(workspaceId);
  }

  getNextEventForPolicy(policyId: string): ReminderEventRecord | null {
    validateNonEmptyString(policyId, "policyId");
    return new ReminderRepository(this.connection).getNextActiveEventByPolicy(policyId);
  }

  private async setReminderForTarget(input: {
    target: ReminderTarget;
    workspaceId: string;
    actorType?: ActivityActorType | undefined;
    triggerAt?: string | undefined;
    leadMinutes?: number | undefined;
    anchor?: ReminderPolicyAnchor | undefined;
    summaryPrefix: string;
  }): Promise<TaskReminderMutationResult> {
    validateReminderTiming(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());

      if (input.target.workspaceId !== input.workspaceId) {
        throw new Error("Reminder workspaceId must match the target workspace.");
      }

      const mode: ReminderPolicyMode = input.leadMinutes === undefined ? "absolute" : "relative";
      const anchor = input.anchor ?? "due";
      const triggerAt = computeTriggerAt({
        target: input.target,
        mode,
        anchor,
        triggerAt: input.triggerAt,
        leadMinutes: input.leadMinutes
      });
      const repository = new ReminderRepository(this.connection);
      const beforePolicy = repository.getActivePolicyForTarget({
        targetType: input.target.targetType,
        targetId: input.target.targetId
      });
      const beforeEvent = beforePolicy === null
        ? null
        : repository.getNextActiveEventByPolicy(beforePolicy.id);
      const policy = beforePolicy === null
        ? repository.createPolicy({
            id: this.idFactory("reminder_policy"),
            workspaceId: input.target.workspaceId,
            targetType: input.target.targetType,
            targetId: input.target.targetId,
            taskItemId: input.target.taskItemId,
            anchor,
            mode,
            leadMinutes: input.leadMinutes ?? null,
            triggerAt,
            timestamp
          })
        : repository.updatePolicy(beforePolicy.id, {
            anchor,
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
        workspaceId: input.target.workspaceId,
        policyId: policy.id,
        targetType: input.target.targetType,
        targetId: input.target.targetId,
        taskItemId: input.target.taskItemId,
        scheduledForAt: triggerAt,
        timestamp
      });

      if (input.target.targetType === "item") {
        new TaskRepository(this.connection).updateDetails(input.target.targetId, {
          reminderPolicyId: policy.id,
          timestamp
        });
      }

      this.logReminderEvent({
        target: input.target,
        action: ActivityAction.reminderSet,
        summary: `${input.summaryPrefix} for ${input.target.label} "${input.target.title}".`,
        before: { policy: beforePolicy, event: beforeEvent },
        after: { policy, event },
        actorType: input.actorType,
        timestamp
      });

      return { policy, event };
    });
  }

  private async clearReminderForTarget(input: {
    target: ReminderTarget;
    actorType?: ActivityActorType | undefined;
    summary?: string | undefined;
  }): Promise<TaskReminderMutationResult> {
    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new ReminderRepository(this.connection);
      const beforePolicy = repository.getActivePolicyForTarget({
        targetType: input.target.targetType,
        targetId: input.target.targetId
      });

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

      if (input.target.targetType === "item") {
        new TaskRepository(this.connection).updateDetails(input.target.targetId, {
          reminderPolicyId: null,
          timestamp
        });
      }

      this.logReminderEvent({
        target: input.target,
        action: ActivityAction.reminderCleared,
        summary: input.summary ?? `Cleared reminder for ${input.target.label} "${input.target.title}".`,
        before: { policy: beforePolicy, event: beforeEvent },
        after: { policy, event: null },
        actorType: input.actorType,
        timestamp
      });

      return { policy, event: null };
    });
  }

  private async rescheduleReminderForTargetDateChange(input: {
    target: ReminderTarget;
    actorType?: ActivityActorType | undefined;
  }): Promise<TaskReminderMutationResult> {
    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new ReminderRepository(this.connection);
      const beforePolicy = repository.getActivePolicyForTarget({
        targetType: input.target.targetType,
        targetId: input.target.targetId
      });

      if (beforePolicy === null) {
        return { policy: null, event: null };
      }

      if (input.target.completedAt !== null) {
        return this.clearReminderForTarget({
          target: input.target,
          actorType: input.actorType,
          summary: `Cleared reminder for ${input.target.label} "${input.target.title}" because it was completed.`
        });
      }

      if (beforePolicy.mode === "absolute" || beforePolicy.leadMinutes === null) {
        return { policy: beforePolicy, event: repository.getNextActiveEventByPolicy(beforePolicy.id) };
      }

      const anchorAt = getAnchorDate(input.target, beforePolicy.anchor);
      const beforeEvent = repository.getNextActiveEventByPolicy(beforePolicy.id);

      if (anchorAt === null) {
        return this.clearReminderForTarget({
          target: input.target,
          actorType: input.actorType,
          summary: `Cleared reminder for ${input.target.label} "${input.target.title}" because it no longer has a ${beforePolicy.anchor} date.`
        });
      }

      const triggerAt = computeRelativeTriggerAt(anchorAt, beforePolicy.leadMinutes);
      repository.cancelActiveEventsForPolicy(beforePolicy.id, timestamp);
      const policy = repository.updatePolicy(beforePolicy.id, {
        triggerAt,
        timestamp
      });
      const event = repository.createEvent({
        id: this.idFactory("reminder_event"),
        workspaceId: input.target.workspaceId,
        policyId: policy.id,
        targetType: input.target.targetType,
        targetId: input.target.targetId,
        taskItemId: input.target.taskItemId,
        scheduledForAt: triggerAt,
        timestamp
      });

      this.logReminderEvent({
        target: input.target,
        action: ActivityAction.reminderRescheduled,
        summary: `Rescheduled reminder for ${input.target.label} "${input.target.title}".`,
        before: { policy: beforePolicy, event: beforeEvent },
        after: { policy, event },
        actorType: input.actorType,
        timestamp
      });

      return { policy, event };
    });
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

      const target = this.requireTargetForPolicy(policy);
      const event = input.apply(repository, beforeEvent, timestamp);
      this.logReminderEvent({
        target,
        action: input.action,
        summary: `${input.summaryVerb} reminder for ${target.label} "${target.title}".`,
        before: { policy, event: beforeEvent },
        after: { policy, event },
        actorType: input.actorType,
        timestamp
      });

      return { policy, event };
    });
  }

  private requireTargetForPolicy(policy: ReminderPolicyRecord): ReminderTarget {
    if (policy.targetType === "list_item") {
      return this.requireListItemTarget(policy.targetId);
    }

    return this.requireTaskTarget(policy.targetId);
  }

  private requireTaskTarget(taskId: string): ReminderTarget {
    const task = this.requireTask(taskId);
    return {
      workspaceId: task.item.workspaceId,
      targetType: "item",
      targetId: task.item.id,
      taskItemId: task.item.id,
      activityTargetType: "item",
      title: task.item.title,
      label: "task",
      startAt: task.task.startAt,
      dueAt: task.task.dueAt,
      completedAt: task.task.completedAt ?? task.item.completedAt
    };
  }

  private requireListItemTarget(listItemId: string): ReminderTarget {
    const listItem = new ListRepository(this.connection).getListItemById(listItemId);

    if (listItem === null) {
      throw new Error(`List item was not found: ${listItemId}.`);
    }

    return {
      workspaceId: listItem.workspaceId,
      targetType: "list_item",
      targetId: listItem.id,
      taskItemId: listItem.id,
      activityTargetType: "list_item",
      title: listItem.title,
      label: "list item",
      startAt: listItem.startAt,
      dueAt: listItem.dueAt,
      completedAt: listItem.completedAt
    };
  }

  private requireTask(taskId: string): TaskWithItemRecord {
    const task = new TaskRepository(this.connection).getByItemId(taskId);

    if (task === null) {
      throw new Error(`Task was not found: ${taskId}.`);
    }

    return task;
  }

  private logReminderEvent(input: {
    target: ReminderTarget;
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
      workspaceId: input.target.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: input.action,
      targetType: input.target.activityTargetType,
      targetId: input.target.targetId,
      summary: input.summary,
      beforeJson: JSON.stringify(input.before),
      afterJson: JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }
}

export const remindersModuleContract = {
  module: "reminders",
  purpose: "Manage local reminder defaults, per-target reminder policies, reminder events, and scheduler-facing projections.",
  owns: ["task and list item reminder policies", "reminder defaults", "reminder event state", "local notification scheduling inputs"],
  doesNotOwn: ["cloud notifications", "mobile push", "general task persistence"],
  integrationPoints: ["tasks", "lists", "activity", "desktop main notifications"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function validateReminderTiming(input: {
  triggerAt?: string | undefined;
  leadMinutes?: number | undefined;
  anchor?: ReminderPolicyAnchor | undefined;
}): void {
  const hasTriggerAt = input.triggerAt !== undefined;
  const hasLeadMinutes = input.leadMinutes !== undefined;

  if (hasTriggerAt === hasLeadMinutes) {
    throw new Error("Reminder requires either triggerAt or leadMinutes, not both.");
  }

  if (input.leadMinutes !== undefined && (!Number.isInteger(input.leadMinutes) || input.leadMinutes < 0)) {
    throw new Error("leadMinutes must be a non-negative integer.");
  }

  if (input.anchor !== undefined && input.anchor !== "due" && input.anchor !== "start") {
    throw new Error("anchor must be due or start.");
  }
}

function computeTriggerAt(input: {
  target: ReminderTarget;
  mode: ReminderPolicyMode;
  anchor: ReminderPolicyAnchor;
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

  const anchorAt = getAnchorDate(input.target, input.anchor);

  if (anchorAt === null || input.leadMinutes === undefined) {
    throw new Error(`relative reminders require a ${input.anchor} date and leadMinutes.`);
  }

  return computeRelativeTriggerAt(anchorAt, input.leadMinutes);
}

function computeRelativeTriggerAt(anchorAt: string, leadMinutes: number): string {
  const anchorDate = new Date(anchorAt);

  if (Number.isNaN(anchorDate.getTime())) {
    throw new Error("Reminder anchor date must be a valid date to set a relative reminder.");
  }

  return new Date(anchorDate.getTime() - leadMinutes * 60_000).toISOString();
}

function getAnchorDate(target: ReminderTarget, anchor: ReminderPolicyAnchor): string | null {
  return anchor === "start" ? target.startAt : target.dueAt;
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

function normalizeReminderPreferences(
  value: unknown,
  fallback: ReminderPreferences = DEFAULT_REMINDER_PREFERENCES
): ReminderPreferences {
  const record = isRecord(value) ? value : {};
  return {
    notificationsEnabled:
      typeof record.notificationsEnabled === "boolean"
        ? record.notificationsEnabled
        : fallback.notificationsEnabled,
    tasks: normalizeReminderDefault(record.tasks, fallback.tasks),
    listItems: normalizeReminderDefault(record.listItems, fallback.listItems)
  };
}

function normalizeReminderDefault(
  value: unknown,
  fallback: ReminderDefaultPreferences
): ReminderDefaultPreferences {
  const record = isRecord(value) ? value : {};
  return {
    enabled: typeof record.enabled === "boolean" ? record.enabled : fallback.enabled,
    anchor: record.anchor === "start" || record.anchor === "due" ? record.anchor : fallback.anchor,
    leadMinutes:
      typeof record.leadMinutes === "number" && Number.isInteger(record.leadMinutes) && record.leadMinutes >= 0
        ? record.leadMinutes
        : fallback.leadMinutes
  };
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
