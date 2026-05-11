import type { DatabaseConnection } from "../connection/createDatabaseConnection";

export type ReminderPolicyMode = "absolute" | "relative";
export type ReminderPolicyAnchor = "due" | "start";
export type ReminderPolicyStatus = "active" | "cleared";
export type ReminderPolicyTargetType = "item" | "list_item";
export type ReminderEventStatus =
  | "scheduled"
  | "fired"
  | "dismissed"
  | "snoozed"
  | "cancelled";

type ReminderPolicyRow = {
  id: string;
  workspace_id: string;
  target_type: string;
  target_id: string;
  task_item_id: string;
  anchor: string;
  mode: string;
  lead_minutes: number | null;
  trigger_at: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ReminderEventRow = {
  id: string;
  workspace_id: string;
  policy_id: string;
  target_type: string;
  target_id: string;
  task_item_id: string;
  scheduled_for_at: string;
  fired_at: string | null;
  dismissed_at: string | null;
  snoozed_until: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ReminderPolicyRecord = {
  id: string;
  workspaceId: string;
  targetType: ReminderPolicyTargetType;
  targetId: string;
  taskItemId: string;
  anchor: ReminderPolicyAnchor;
  mode: ReminderPolicyMode;
  leadMinutes: number | null;
  triggerAt: string;
  status: ReminderPolicyStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ReminderEventRecord = {
  id: string;
  workspaceId: string;
  policyId: string;
  targetType: ReminderPolicyTargetType;
  targetId: string;
  taskItemId: string;
  scheduledForAt: string;
  firedAt: string | null;
  dismissedAt: string | null;
  snoozedUntil: string | null;
  status: ReminderEventStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateReminderPolicyInput = {
  id: string;
  workspaceId: string;
  taskItemId: string;
  mode: ReminderPolicyMode;
  triggerAt: string;
  timestamp: string;
  targetType?: ReminderPolicyTargetType;
  targetId?: string;
  anchor?: ReminderPolicyAnchor;
  leadMinutes?: number | null;
};

export type UpdateReminderPolicyPatch = {
  mode?: ReminderPolicyMode;
  anchor?: ReminderPolicyAnchor;
  leadMinutes?: number | null;
  triggerAt?: string;
  status?: ReminderPolicyStatus;
  deletedAt?: string | null;
  timestamp: string;
};

export type CreateReminderEventInput = {
  id: string;
  workspaceId: string;
  policyId: string;
  taskItemId: string;
  scheduledForAt: string;
  timestamp: string;
  targetType?: ReminderPolicyTargetType;
  targetId?: string;
  status?: ReminderEventStatus;
};

export type UpdateReminderEventPatch = {
  scheduledForAt?: string;
  firedAt?: string | null;
  dismissedAt?: string | null;
  snoozedUntil?: string | null;
  status?: ReminderEventStatus;
  timestamp: string;
};

export class ReminderRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getPolicyById(id: string): ReminderPolicyRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ReminderPolicyRow>(
        `select *
         from reminder_policies
         where id = ?`
      )
      .get(id);

    return row === undefined ? null : toReminderPolicyRecord(row);
  }

  getActivePolicyForTask(taskItemId: string): ReminderPolicyRecord | null {
    return this.getActivePolicyForTarget({
      targetType: "item",
      targetId: taskItemId
    });
  }

  getActivePolicyForListItem(listItemId: string): ReminderPolicyRecord | null {
    return this.getActivePolicyForTarget({
      targetType: "list_item",
      targetId: listItemId
    });
  }

  getActivePolicyForTarget(input: {
    targetType: ReminderPolicyTargetType;
    targetId: string;
  }): ReminderPolicyRecord | null {
    const row = this.connection.sqlite
      .prepare<[string, string], ReminderPolicyRow>(
        `select *
         from reminder_policies
         where target_type = ?
           and target_id = ?
           and status = 'active'
           and deleted_at is null
         limit 1`
      )
      .get(input.targetType, input.targetId);

    return row === undefined ? null : toReminderPolicyRecord(row);
  }

  createPolicy(input: CreateReminderPolicyInput): ReminderPolicyRecord {
    this.connection.sqlite
      .prepare(
        `insert into reminder_policies (
          id,
          workspace_id,
          target_type,
          target_id,
          task_item_id,
          anchor,
          mode,
          lead_minutes,
          trigger_at,
          status,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.targetType ?? "item",
        input.targetId ?? input.taskItemId,
        input.taskItemId,
        input.anchor ?? "due",
        input.mode,
        input.leadMinutes ?? null,
        input.triggerAt,
        input.timestamp,
        input.timestamp
      );

    const created = this.getPolicyById(input.id);

    if (created === null) {
      throw new Error(`Reminder policy row was not created: ${input.id}.`);
    }

    return created;
  }

  updatePolicy(id: string, patch: UpdateReminderPolicyPatch): ReminderPolicyRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.mode !== undefined) {
      assignments.push("mode = ?");
      values.push(patch.mode);
    }

    if (patch.anchor !== undefined) {
      assignments.push("anchor = ?");
      values.push(patch.anchor);
    }

    if (patch.leadMinutes !== undefined) {
      assignments.push("lead_minutes = ?");
      values.push(patch.leadMinutes);
    }

    if (patch.triggerAt !== undefined) {
      assignments.push("trigger_at = ?");
      values.push(patch.triggerAt);
    }

    if (patch.status !== undefined) {
      assignments.push("status = ?");
      values.push(patch.status);
    }

    if (patch.deletedAt !== undefined) {
      assignments.push("deleted_at = ?");
      values.push(patch.deletedAt);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, id);

    this.connection.sqlite
      .prepare(
        `update reminder_policies
         set ${assignments.join(", ")}
         where id = ?`
      )
      .run(...values);

    const updated = this.getPolicyById(id);

    if (updated === null) {
      throw new Error(`Reminder policy row was not found: ${id}.`);
    }

    return updated;
  }

  getEventById(id: string): ReminderEventRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ReminderEventRow>(
        `select *
         from reminder_events
         where id = ?`
      )
      .get(id);

    return row === undefined ? null : toReminderEventRecord(row);
  }

  getNextActiveEventByPolicy(policyId: string): ReminderEventRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ReminderEventRow>(
        `select *
         from reminder_events
         where policy_id = ?
           and status in ('scheduled', 'snoozed')
         order by coalesce(snoozed_until, scheduled_for_at) asc, created_at asc
         limit 1`
      )
      .get(policyId);

    return row === undefined ? null : toReminderEventRecord(row);
  }

  listEventsForPolicy(policyId: string): ReminderEventRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string], ReminderEventRow>(
        `select *
         from reminder_events
         where policy_id = ?
         order by created_at asc, id asc`
      )
      .all(policyId);

    return rows.map(toReminderEventRecord);
  }

  listDueEvents(workspaceId: string, now: string): ReminderEventRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string, string, string], ReminderEventRow>(
        `select *
         from reminder_events
         where workspace_id = ?
           and (
             (status = 'scheduled' and scheduled_for_at <= ?)
             or (status = 'snoozed' and snoozed_until is not null and snoozed_until <= ?)
           )
         order by coalesce(snoozed_until, scheduled_for_at) asc, created_at asc`
      )
      .all(workspaceId, now, now);

    return rows.map(toReminderEventRecord);
  }

  listNextScheduledEvents(workspaceId: string): ReminderEventRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string], ReminderEventRow>(
        `select *
         from reminder_events
         where workspace_id = ?
           and status in ('scheduled', 'snoozed')
         order by coalesce(snoozed_until, scheduled_for_at) asc, created_at asc`
      )
      .all(workspaceId);

    return rows.map(toReminderEventRecord);
  }

  createEvent(input: CreateReminderEventInput): ReminderEventRecord {
    this.connection.sqlite
      .prepare(
        `insert into reminder_events (
          id,
          workspace_id,
          policy_id,
          target_type,
          target_id,
          task_item_id,
          scheduled_for_at,
          status,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.policyId,
        input.targetType ?? "item",
        input.targetId ?? input.taskItemId,
        input.taskItemId,
        input.scheduledForAt,
        input.status ?? "scheduled",
        input.timestamp,
        input.timestamp
      );

    const created = this.getEventById(input.id);

    if (created === null) {
      throw new Error(`Reminder event row was not created: ${input.id}.`);
    }

    return created;
  }

  updateEvent(id: string, patch: UpdateReminderEventPatch): ReminderEventRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.scheduledForAt !== undefined) {
      assignments.push("scheduled_for_at = ?");
      values.push(patch.scheduledForAt);
    }

    if (patch.firedAt !== undefined) {
      assignments.push("fired_at = ?");
      values.push(patch.firedAt);
    }

    if (patch.dismissedAt !== undefined) {
      assignments.push("dismissed_at = ?");
      values.push(patch.dismissedAt);
    }

    if (patch.snoozedUntil !== undefined) {
      assignments.push("snoozed_until = ?");
      values.push(patch.snoozedUntil);
    }

    if (patch.status !== undefined) {
      assignments.push("status = ?");
      values.push(patch.status);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, id);

    this.connection.sqlite
      .prepare(
        `update reminder_events
         set ${assignments.join(", ")}
         where id = ?`
      )
      .run(...values);

    const updated = this.getEventById(id);

    if (updated === null) {
      throw new Error(`Reminder event row was not found: ${id}.`);
    }

    return updated;
  }

  cancelActiveEventsForPolicy(policyId: string, timestamp: string): void {
    this.connection.sqlite
      .prepare(
        `update reminder_events
         set status = 'cancelled',
             updated_at = ?
         where policy_id = ?
           and status in ('scheduled', 'snoozed')`
      )
      .run(timestamp, policyId);
  }
}

function toReminderPolicyRecord(row: ReminderPolicyRow): ReminderPolicyRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    targetType: row.target_type as ReminderPolicyTargetType,
    targetId: row.target_id,
    taskItemId: row.task_item_id,
    anchor: row.anchor as ReminderPolicyAnchor,
    mode: row.mode as ReminderPolicyMode,
    leadMinutes: row.lead_minutes,
    triggerAt: row.trigger_at,
    status: row.status as ReminderPolicyStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function toReminderEventRecord(row: ReminderEventRow): ReminderEventRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    policyId: row.policy_id,
    targetType: row.target_type as ReminderPolicyTargetType,
    targetId: row.target_id,
    taskItemId: row.task_item_id,
    scheduledForAt: row.scheduled_for_at,
    firedAt: row.fired_at,
    dismissedAt: row.dismissed_at,
    snoozedUntil: row.snoozed_until,
    status: row.status as ReminderEventStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
