import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { items } from "./items";
import { workspaces } from "./workspaces";

export const reminderPolicies = sqliteTable(
  "reminder_policies",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    taskItemId: text("task_item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    leadMinutes: integer("lead_minutes"),
    triggerAt: text("trigger_at").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    uniqueIndex("idx_reminder_policies_active_task")
      .on(table.taskItemId)
      .where(sql`${table.deletedAt} is null and ${table.status} = 'active'`),
    index("idx_reminder_policies_workspace_task").on(
      table.workspaceId,
      table.taskItemId,
      table.deletedAt
    ),
    check("ck_reminder_policies_mode", sql`${table.mode} in ('absolute', 'relative')`),
    check("ck_reminder_policies_status", sql`${table.status} in ('active', 'cleared')`),
    check(
      "ck_reminder_policies_lead_minutes",
      sql`${table.leadMinutes} is null or ${table.leadMinutes} >= 0`
    )
  ]
);

export const reminderEvents = sqliteTable(
  "reminder_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    policyId: text("policy_id")
      .notNull()
      .references(() => reminderPolicies.id, { onDelete: "cascade" }),
    taskItemId: text("task_item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    scheduledForAt: text("scheduled_for_at").notNull(),
    firedAt: text("fired_at"),
    dismissedAt: text("dismissed_at"),
    snoozedUntil: text("snoozed_until"),
    status: text("status").notNull().default("scheduled"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    index("idx_reminder_events_policy_status").on(
      table.policyId,
      table.status,
      table.scheduledForAt
    ),
    index("idx_reminder_events_due").on(
      table.workspaceId,
      table.status,
      table.scheduledForAt,
      table.snoozedUntil
    ),
    check(
      "ck_reminder_events_status",
      sql`${table.status} in ('scheduled', 'fired', 'dismissed', 'snoozed', 'cancelled')`
    )
  ]
);
