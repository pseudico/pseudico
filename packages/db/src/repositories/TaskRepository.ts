import type { TaskDateRange, TaskStatus } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import type { ItemRecord } from "./ItemRepository";

type TaskDetailsRow = {
  item_id: string;
  workspace_id: string;
  task_status: string;
  priority: number | null;
  start_at: string | null;
  due_at: string | null;
  all_day: number;
  timezone: string | null;
  reminder_policy_id: string | null;
  recurrence_rule_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TaskWithItemRow = {
  item_id: string;
  item_workspace_id: string;
  item_container_id: string;
  item_container_tab_id: string | null;
  item_type: string;
  item_title: string;
  item_body: string | null;
  item_category_id: string | null;
  item_status: string;
  item_sort_order: number;
  item_pinned: number;
  item_created_at: string;
  item_updated_at: string;
  item_completed_at: string | null;
  item_archived_at: string | null;
  item_deleted_at: string | null;
  task_item_id: string;
  task_workspace_id: string;
  task_status: string;
  task_priority: number | null;
  task_start_at: string | null;
  task_due_at: string | null;
  task_all_day: number;
  task_timezone: string | null;
  task_reminder_policy_id: string | null;
  task_recurrence_rule_id: string | null;
  task_completed_at: string | null;
  task_created_at: string;
  task_updated_at: string;
};

export type TaskRecord = {
  itemId: string;
  workspaceId: string;
  taskStatus: TaskStatus;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  timezone: string | null;
  reminderPolicyId: string | null;
  recurrenceRuleId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskWithItemRecord = {
  item: ItemRecord;
  task: TaskRecord;
};

export type CreateTaskDetailsInput = {
  itemId: string;
  workspaceId: string;
  timestamp: string;
  taskStatus?: TaskStatus;
  priority?: number | null;
  startAt?: string | null;
  dueAt?: string | null;
  allDay?: boolean;
  timezone?: string | null;
  completedAt?: string | null;
};

export type UpdateTaskDetailsPatch = {
  taskStatus?: TaskStatus;
  priority?: number | null;
  startAt?: string | null;
  dueAt?: string | null;
  allDay?: boolean;
  timezone?: string | null;
  completedAt?: string | null;
  timestamp: string;
};

const TASK_WITH_ITEM_SELECT = `
  select
    i.id as item_id,
    i.workspace_id as item_workspace_id,
    i.container_id as item_container_id,
    i.container_tab_id as item_container_tab_id,
    i.type as item_type,
    i.title as item_title,
    i.body as item_body,
    i.category_id as item_category_id,
    i.status as item_status,
    i.sort_order as item_sort_order,
    i.pinned as item_pinned,
    i.created_at as item_created_at,
    i.updated_at as item_updated_at,
    i.completed_at as item_completed_at,
    i.archived_at as item_archived_at,
    i.deleted_at as item_deleted_at,
    td.item_id as task_item_id,
    td.workspace_id as task_workspace_id,
    td.task_status as task_status,
    td.priority as task_priority,
    td.start_at as task_start_at,
    td.due_at as task_due_at,
    td.all_day as task_all_day,
    td.timezone as task_timezone,
    td.reminder_policy_id as task_reminder_policy_id,
    td.recurrence_rule_id as task_recurrence_rule_id,
    td.completed_at as task_completed_at,
    td.created_at as task_created_at,
    td.updated_at as task_updated_at
  from task_details td
  inner join items i on i.id = td.item_id
`;

export class TaskRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getDetailsByItemId(itemId: string): TaskRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], TaskDetailsRow>(
        `select *
         from task_details
         where item_id = ?`
      )
      .get(itemId);

    return row === undefined ? null : toTaskRecord(row);
  }

  getByItemId(itemId: string): TaskWithItemRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], TaskWithItemRow>(
        `${TASK_WITH_ITEM_SELECT}
         where i.id = ?
           and i.type = 'task'
           and i.deleted_at is null
         limit 1`
      )
      .get(itemId);

    return row === undefined ? null : toTaskWithItemRecord(row);
  }

  createDetails(input: CreateTaskDetailsInput): TaskRecord {
    this.connection.sqlite
      .prepare(
        `insert into task_details (
          item_id,
          workspace_id,
          task_status,
          priority,
          start_at,
          due_at,
          all_day,
          timezone,
          completed_at,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.itemId,
        input.workspaceId,
        input.taskStatus ?? "open",
        input.priority ?? null,
        input.startAt ?? null,
        input.dueAt ?? null,
        input.allDay === false ? 0 : 1,
        input.timezone ?? null,
        input.completedAt ?? null,
        input.timestamp,
        input.timestamp
      );

    const created = this.getDetailsByItemId(input.itemId);

    if (created === null) {
      throw new Error(`Task details row was not created: ${input.itemId}.`);
    }

    return created;
  }

  updateDetails(itemId: string, patch: UpdateTaskDetailsPatch): TaskRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.taskStatus !== undefined) {
      assignments.push("task_status = ?");
      values.push(patch.taskStatus);
    }

    if (patch.priority !== undefined) {
      assignments.push("priority = ?");
      values.push(patch.priority);
    }

    if (patch.startAt !== undefined) {
      assignments.push("start_at = ?");
      values.push(patch.startAt);
    }

    if (patch.dueAt !== undefined) {
      assignments.push("due_at = ?");
      values.push(patch.dueAt);
    }

    if (patch.allDay !== undefined) {
      assignments.push("all_day = ?");
      values.push(patch.allDay ? 1 : 0);
    }

    if (patch.timezone !== undefined) {
      assignments.push("timezone = ?");
      values.push(patch.timezone);
    }

    if (patch.completedAt !== undefined) {
      assignments.push("completed_at = ?");
      values.push(patch.completedAt);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, itemId);

    this.connection.sqlite
      .prepare(
        `update task_details
         set ${assignments.join(", ")}
         where item_id = ?`
      )
      .run(...values);

    const updated = this.getDetailsByItemId(itemId);

    if (updated === null) {
      throw new Error(`Task details row was not found: ${itemId}.`);
    }

    return updated;
  }

  listDueBetween(
    workspaceId: string,
    range: TaskDateRange
  ): TaskWithItemRecord[] {
    return this.listActiveDatedTasks({
      workspaceId,
      whereSql: "td.due_at >= ? and td.due_at < ?",
      values: [range.startInclusive, range.endExclusive]
    });
  }

  listOverdue(workspaceId: string, before: string): TaskWithItemRecord[] {
    return this.listActiveDatedTasks({
      workspaceId,
      whereSql: "td.due_at < ?",
      values: [before]
    });
  }

  listUpcoming(
    workspaceId: string,
    range: TaskDateRange
  ): TaskWithItemRecord[] {
    return this.listDueBetween(workspaceId, range);
  }

  listByContainer(containerId: string): TaskWithItemRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string], TaskWithItemRow>(
        `${TASK_WITH_ITEM_SELECT}
         where i.container_id = ?
           and i.type = 'task'
           and i.archived_at is null
           and i.deleted_at is null
         order by i.pinned desc, i.sort_order asc, i.created_at asc`
      )
      .all(containerId);

    return rows.map(toTaskWithItemRecord);
  }

  private listActiveDatedTasks(input: {
    workspaceId: string;
    whereSql: string;
    values: unknown[];
  }): TaskWithItemRecord[] {
    const rows = this.connection.sqlite
      .prepare<unknown[], TaskWithItemRow>(
        `${TASK_WITH_ITEM_SELECT}
         where td.workspace_id = ?
           and i.type = 'task'
           and i.archived_at is null
           and i.deleted_at is null
           and td.due_at is not null
           and td.task_status in ('open', 'waiting')
           and ${input.whereSql}
         order by td.due_at asc, i.sort_order asc, i.created_at asc`
      )
      .all(input.workspaceId, ...input.values);

    return rows.map(toTaskWithItemRecord);
  }
}

function toTaskRecord(row: TaskDetailsRow): TaskRecord {
  return {
    itemId: row.item_id,
    workspaceId: row.workspace_id,
    taskStatus: row.task_status as TaskStatus,
    priority: row.priority,
    startAt: row.start_at,
    dueAt: row.due_at,
    allDay: row.all_day === 1,
    timezone: row.timezone,
    reminderPolicyId: row.reminder_policy_id,
    recurrenceRuleId: row.recurrence_rule_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toTaskWithItemRecord(row: TaskWithItemRow): TaskWithItemRecord {
  return {
    item: {
      id: row.item_id,
      workspaceId: row.item_workspace_id,
      containerId: row.item_container_id,
      containerTabId: row.item_container_tab_id,
      type: row.item_type,
      title: row.item_title,
      body: row.item_body,
      categoryId: row.item_category_id,
      status: row.item_status,
      sortOrder: row.item_sort_order,
      pinned: row.item_pinned === 1,
      createdAt: row.item_created_at,
      updatedAt: row.item_updated_at,
      completedAt: row.item_completed_at,
      archivedAt: row.item_archived_at,
      deletedAt: row.item_deleted_at
    },
    task: {
      itemId: row.task_item_id,
      workspaceId: row.task_workspace_id,
      taskStatus: row.task_status as TaskStatus,
      priority: row.task_priority,
      startAt: row.task_start_at,
      dueAt: row.task_due_at,
      allDay: row.task_all_day === 1,
      timezone: row.task_timezone,
      reminderPolicyId: row.task_reminder_policy_id,
      recurrenceRuleId: row.task_recurrence_rule_id,
      completedAt: row.task_completed_at,
      createdAt: row.task_created_at,
      updatedAt: row.task_updated_at
    }
  };
}
