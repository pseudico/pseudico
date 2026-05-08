import type { DatabaseConnection } from "../connection/createDatabaseConnection";

export type RecurrenceFrequency = "daily" | "weekly";
export type RecurrenceRuleStatus = "active" | "cleared";

export type RecurrenceRuleRow = {
  id: string;
  workspace_id: string;
  task_item_id: string;
  frequency: string;
  interval: number;
  weekdays_json: string | null;
  anchor_at: string;
  next_occurrence_at: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RecurrenceRuleRecord = {
  id: string;
  workspaceId: string;
  taskItemId: string;
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays: number[] | null;
  anchorAt: string;
  nextOccurrenceAt: string;
  status: RecurrenceRuleStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateRecurrenceRuleInput = {
  id: string;
  workspaceId: string;
  taskItemId: string;
  frequency: RecurrenceFrequency;
  interval: number;
  anchorAt: string;
  nextOccurrenceAt: string;
  timestamp: string;
  weekdays?: number[] | null;
};

export type UpdateRecurrenceRulePatch = {
  frequency?: RecurrenceFrequency;
  interval?: number;
  weekdays?: number[] | null;
  anchorAt?: string;
  nextOccurrenceAt?: string;
  status?: RecurrenceRuleStatus;
  deletedAt?: string | null;
  timestamp: string;
};

export class RecurrenceRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getRuleById(id: string): RecurrenceRuleRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], RecurrenceRuleRow>(
        `select *
         from recurrence_rules
         where id = ?`
      )
      .get(id);

    return row === undefined ? null : toRecurrenceRuleRecord(row);
  }

  getActiveRuleForTask(taskItemId: string): RecurrenceRuleRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], RecurrenceRuleRow>(
        `select *
         from recurrence_rules
         where task_item_id = ?
           and status = 'active'
           and deleted_at is null
         limit 1`
      )
      .get(taskItemId);

    return row === undefined ? null : toRecurrenceRuleRecord(row);
  }

  createRule(input: CreateRecurrenceRuleInput): RecurrenceRuleRecord {
    this.connection.sqlite
      .prepare(
        `insert into recurrence_rules (
          id,
          workspace_id,
          task_item_id,
          frequency,
          interval,
          weekdays_json,
          anchor_at,
          next_occurrence_at,
          status,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.taskItemId,
        input.frequency,
        input.interval,
        stringifyWeekdays(input.weekdays ?? null),
        input.anchorAt,
        input.nextOccurrenceAt,
        input.timestamp,
        input.timestamp
      );

    const created = this.getRuleById(input.id);

    if (created === null) {
      throw new Error(`Recurrence rule row was not created: ${input.id}.`);
    }

    return created;
  }

  updateRule(id: string, patch: UpdateRecurrenceRulePatch): RecurrenceRuleRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.frequency !== undefined) {
      assignments.push("frequency = ?");
      values.push(patch.frequency);
    }

    if (patch.interval !== undefined) {
      assignments.push("interval = ?");
      values.push(patch.interval);
    }

    if (patch.weekdays !== undefined) {
      assignments.push("weekdays_json = ?");
      values.push(stringifyWeekdays(patch.weekdays));
    }

    if (patch.anchorAt !== undefined) {
      assignments.push("anchor_at = ?");
      values.push(patch.anchorAt);
    }

    if (patch.nextOccurrenceAt !== undefined) {
      assignments.push("next_occurrence_at = ?");
      values.push(patch.nextOccurrenceAt);
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
        `update recurrence_rules
         set ${assignments.join(", ")}
         where id = ?`
      )
      .run(...values);

    const updated = this.getRuleById(id);

    if (updated === null) {
      throw new Error(`Recurrence rule row was not found: ${id}.`);
    }

    return updated;
  }
}

function toRecurrenceRuleRecord(row: RecurrenceRuleRow): RecurrenceRuleRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    taskItemId: row.task_item_id,
    frequency: row.frequency as RecurrenceFrequency,
    interval: row.interval,
    weekdays: parseWeekdays(row.weekdays_json),
    anchorAt: row.anchor_at,
    nextOccurrenceAt: row.next_occurrence_at,
    status: row.status as RecurrenceRuleStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function stringifyWeekdays(weekdays: number[] | null): string | null {
  return weekdays === null ? null : JSON.stringify(weekdays);
}

function parseWeekdays(value: string | null): number[] | null {
  if (value === null) {
    return null;
  }

  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) {
    return null;
  }

  return parsed.filter((day): day is number => Number.isInteger(day));
}
