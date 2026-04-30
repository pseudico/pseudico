import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { items } from "./items";
import { workspaces } from "./workspaces";

export const taskDetails = sqliteTable(
  "task_details",
  {
    itemId: text("item_id")
      .primaryKey()
      .references(() => items.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    taskStatus: text("task_status").notNull().default("open"),
    priority: integer("priority"),
    startAt: text("start_at"),
    dueAt: text("due_at"),
    allDay: integer("all_day").notNull().default(1),
    timezone: text("timezone"),
    reminderPolicyId: text("reminder_policy_id"),
    recurrenceRuleId: text("recurrence_rule_id"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    index("idx_task_details_due").on(
      table.workspaceId,
      table.dueAt,
      table.taskStatus
    ),
    index("idx_task_details_status").on(table.workspaceId, table.taskStatus),
    check(
      "ck_task_details_status",
      sql`${table.taskStatus} in ('open', 'done', 'waiting', 'cancelled')`
    ),
    check(
      "ck_task_details_priority",
      sql`${table.priority} is null or (${table.priority} >= 0 and ${table.priority} <= 5)`
    ),
    check("ck_task_details_all_day_bool", sql`${table.allDay} in (0, 1)`)
  ]
);
