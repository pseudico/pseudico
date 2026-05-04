import type { TaskStatus } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import { DEFAULT_SORT_ORDER_STEP } from "../services/SortOrderService";
import type { TaskWithItemRecord } from "./TaskRepository";

type DailyPlanRow = {
  id: string;
  workspace_id: string;
  plan_date: string;
  created_at: string;
  updated_at: string;
};

type DailyPlanItemRow = {
  id: string;
  workspace_id: string;
  daily_plan_id: string;
  item_type: string;
  item_id: string;
  lane: string;
  sort_order: number;
  added_manually: number;
  created_at: string;
  updated_at: string;
};

type PlannedTaskRow = {
  plan_item_id: string;
  plan_workspace_id: string;
  daily_plan_id: string;
  item_type: string;
  planned_item_id: string;
  lane: string;
  plan_sort_order: number;
  added_manually: number;
  plan_created_at: string;
  plan_updated_at: string;
  item_id: string;
  item_workspace_id: string;
  item_container_id: string;
  item_container_tab_id: string | null;
  item_type_record: string;
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

export type DailyPlanLane = "today" | "tomorrow" | "backlog";
export type DailyPlanItemType = "task" | "item" | "list_item";

export type DailyPlanRecord = {
  id: string;
  workspaceId: string;
  planDate: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyPlanItemRecord = {
  id: string;
  workspaceId: string;
  dailyPlanId: string;
  itemType: DailyPlanItemType;
  itemId: string;
  lane: DailyPlanLane;
  sortOrder: number;
  addedManually: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlannedTaskRecord = {
  planItem: DailyPlanItemRecord;
  task: TaskWithItemRecord;
};

export type CreateDailyPlanInput = {
  id: string;
  workspaceId: string;
  planDate: string;
  timestamp: string;
};

export type CreateDailyPlanItemInput = {
  id: string;
  workspaceId: string;
  dailyPlanId: string;
  itemType: DailyPlanItemType;
  itemId: string;
  lane: DailyPlanLane;
  sortOrder: number;
  addedManually?: boolean;
  timestamp: string;
};

export class DailyPlanRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  findPlanByDate(input: {
    workspaceId: string;
    planDate: string;
  }): DailyPlanRecord | null {
    const row = this.connection.sqlite
      .prepare<[string, string], DailyPlanRow>(
        `select *
         from daily_plans
         where workspace_id = ?
           and plan_date = ?
         limit 1`
      )
      .get(input.workspaceId, input.planDate);

    return row === undefined ? null : toDailyPlanRecord(row);
  }

  createPlan(input: CreateDailyPlanInput): DailyPlanRecord {
    this.connection.sqlite
      .prepare(
        `insert into daily_plans (
          id,
          workspace_id,
          plan_date,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.planDate,
        input.timestamp,
        input.timestamp
      );

    const created = this.findPlanByDate({
      workspaceId: input.workspaceId,
      planDate: input.planDate
    });

    if (created === null) {
      throw new Error(`Daily plan was not created: ${input.planDate}.`);
    }

    return created;
  }

  touchPlan(planId: string, timestamp: string): DailyPlanRecord {
    this.connection.sqlite
      .prepare(
        `update daily_plans
         set updated_at = ?
         where id = ?`
      )
      .run(timestamp, planId);

    const row = this.connection.sqlite
      .prepare<[string], DailyPlanRow>(
        `select *
         from daily_plans
         where id = ?
         limit 1`
      )
      .get(planId);

    if (row === undefined) {
      throw new Error(`Daily plan was not found: ${planId}.`);
    }

    return toDailyPlanRecord(row);
  }

  createPlanItem(input: CreateDailyPlanItemInput): DailyPlanItemRecord {
    this.connection.sqlite
      .prepare(
        `insert into daily_plan_items (
          id,
          workspace_id,
          daily_plan_id,
          item_type,
          item_id,
          lane,
          sort_order,
          added_manually,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.dailyPlanId,
        input.itemType,
        input.itemId,
        input.lane,
        input.sortOrder,
        input.addedManually === false ? 0 : 1,
        input.timestamp,
        input.timestamp
      );

    const created = this.findPlanItemById(input.id);

    if (created === null) {
      throw new Error(`Daily plan item was not created: ${input.id}.`);
    }

    return created;
  }

  findPlanItemById(id: string): DailyPlanItemRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], DailyPlanItemRow>(
        `select *
         from daily_plan_items
         where id = ?
         limit 1`
      )
      .get(id);

    return row === undefined ? null : toDailyPlanItemRecord(row);
  }

  findPlanItemsForTarget(input: {
    dailyPlanId: string;
    itemType: DailyPlanItemType;
    itemId: string;
    lane?: DailyPlanLane;
  }): DailyPlanItemRecord[] {
    const laneSql = input.lane === undefined ? "" : "and lane = ?";
    const values =
      input.lane === undefined
        ? [input.dailyPlanId, input.itemType, input.itemId]
        : [input.dailyPlanId, input.itemType, input.itemId, input.lane];
    const rows = this.connection.sqlite
      .prepare<unknown[], DailyPlanItemRow>(
        `select *
         from daily_plan_items
         where daily_plan_id = ?
           and item_type = ?
           and item_id = ?
           ${laneSql}
         order by lane asc, sort_order asc`
      )
      .all(...values);

    return rows.map(toDailyPlanItemRecord);
  }

  deletePlanItems(input: {
    dailyPlanId: string;
    itemType: DailyPlanItemType;
    itemId: string;
    lane?: DailyPlanLane;
  }): DailyPlanItemRecord[] {
    const existing = this.findPlanItemsForTarget(input);

    if (existing.length === 0) {
      return [];
    }

    const laneSql = input.lane === undefined ? "" : "and lane = ?";
    const values =
      input.lane === undefined
        ? [input.dailyPlanId, input.itemType, input.itemId]
        : [input.dailyPlanId, input.itemType, input.itemId, input.lane];

    this.connection.sqlite
      .prepare(
        `delete from daily_plan_items
         where daily_plan_id = ?
           and item_type = ?
           and item_id = ?
           ${laneSql}`
      )
      .run(...values);

    return existing;
  }

  updatePlanItemSortOrder(input: {
    dailyPlanId: string;
    itemType: DailyPlanItemType;
    itemId: string;
    lane: DailyPlanLane;
    sortOrder: number;
    timestamp: string;
  }): DailyPlanItemRecord {
    this.connection.sqlite
      .prepare(
        `update daily_plan_items
         set sort_order = ?,
             updated_at = ?
         where daily_plan_id = ?
           and item_type = ?
           and item_id = ?
           and lane = ?`
      )
      .run(
        input.sortOrder,
        input.timestamp,
        input.dailyPlanId,
        input.itemType,
        input.itemId,
        input.lane
      );

    const updated = this.findPlanItemsForTarget({
      dailyPlanId: input.dailyPlanId,
      itemType: input.itemType,
      itemId: input.itemId,
      lane: input.lane
    })[0];

    if (updated === undefined) {
      throw new Error(`Daily plan item was not found: ${input.itemId}.`);
    }

    return updated;
  }

  listPlanItems(input: {
    dailyPlanId: string;
    lane?: DailyPlanLane;
  }): DailyPlanItemRecord[] {
    const laneSql = input.lane === undefined ? "" : "where lane = ?";
    const values = input.lane === undefined ? [] : [input.lane];
    const rows = this.connection.sqlite
      .prepare<unknown[], DailyPlanItemRow>(
        `select *
         from daily_plan_items
         ${input.lane === undefined ? "where daily_plan_id = ?" : `${laneSql} and daily_plan_id = ?`}
         order by lane asc, sort_order asc, created_at asc`
      )
      .all(...values, input.dailyPlanId);

    return rows.map(toDailyPlanItemRecord);
  }

  listPlannedTasks(input: {
    workspaceId: string;
    dailyPlanId: string;
    lane?: DailyPlanLane;
  }): PlannedTaskRecord[] {
    const laneSql = input.lane === undefined ? "" : "and dpi.lane = ?";
    const values =
      input.lane === undefined
        ? [input.workspaceId, input.dailyPlanId]
        : [input.workspaceId, input.dailyPlanId, input.lane];
    const rows = this.connection.sqlite
      .prepare<unknown[], PlannedTaskRow>(
        `select
           dpi.id as plan_item_id,
           dpi.workspace_id as plan_workspace_id,
           dpi.daily_plan_id as daily_plan_id,
           dpi.item_type as item_type,
           dpi.item_id as planned_item_id,
           dpi.lane as lane,
           dpi.sort_order as plan_sort_order,
           dpi.added_manually as added_manually,
           dpi.created_at as plan_created_at,
           dpi.updated_at as plan_updated_at,
           i.id as item_id,
           i.workspace_id as item_workspace_id,
           i.container_id as item_container_id,
           i.container_tab_id as item_container_tab_id,
           i.type as item_type_record,
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
         from daily_plan_items dpi
         inner join items i on i.id = dpi.item_id
         inner join task_details td on td.item_id = i.id
         where dpi.workspace_id = ?
           and dpi.daily_plan_id = ?
           and dpi.item_type = 'task'
           and i.type = 'task'
           and i.archived_at is null
           and i.deleted_at is null
           and i.completed_at is null
           and td.completed_at is null
           and td.task_status in ('open', 'waiting')
           ${laneSql}
         order by dpi.lane asc, dpi.sort_order asc, dpi.created_at asc`
      )
      .all(...values);

    return rows.map(toPlannedTaskRecord);
  }

  getNextSortOrder(input: {
    dailyPlanId: string;
    lane: DailyPlanLane;
  }): number {
    const row = this.connection.sqlite
      .prepare<[string, string], { max_sort_order: number | null }>(
        `select max(sort_order) as max_sort_order
         from daily_plan_items
         where daily_plan_id = ?
           and lane = ?`
      )
      .get(input.dailyPlanId, input.lane);

    return row?.max_sort_order === null || row?.max_sort_order === undefined
      ? DEFAULT_SORT_ORDER_STEP
      : row.max_sort_order + DEFAULT_SORT_ORDER_STEP;
  }
}

function toDailyPlanRecord(row: DailyPlanRow): DailyPlanRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    planDate: row.plan_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toDailyPlanItemRecord(row: DailyPlanItemRow): DailyPlanItemRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    dailyPlanId: row.daily_plan_id,
    itemType: row.item_type as DailyPlanItemType,
    itemId: row.item_id,
    lane: row.lane as DailyPlanLane,
    sortOrder: row.sort_order,
    addedManually: row.added_manually === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toPlannedTaskRecord(row: PlannedTaskRow): PlannedTaskRecord {
  return {
    planItem: {
      id: row.plan_item_id,
      workspaceId: row.plan_workspace_id,
      dailyPlanId: row.daily_plan_id,
      itemType: row.item_type as DailyPlanItemType,
      itemId: row.planned_item_id,
      lane: row.lane as DailyPlanLane,
      sortOrder: row.plan_sort_order,
      addedManually: row.added_manually === 1,
      createdAt: row.plan_created_at,
      updatedAt: row.plan_updated_at
    },
    task: {
      item: {
        id: row.item_id,
        workspaceId: row.item_workspace_id,
        containerId: row.item_container_id,
        containerTabId: row.item_container_tab_id,
        type: row.item_type_record,
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
    }
  };
}
