import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { taskDetails } from "./taskDetails";
import { workspaces } from "./workspaces";

export const recurrenceRules = sqliteTable(
  "recurrence_rules",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    taskItemId: text("task_item_id")
      .notNull()
      .references(() => taskDetails.itemId, { onDelete: "cascade" }),
    frequency: text("frequency").notNull(),
    interval: integer("interval").notNull().default(1),
    weekdaysJson: text("weekdays_json"),
    anchorAt: text("anchor_at").notNull(),
    nextOccurrenceAt: text("next_occurrence_at").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    uniqueIndex("idx_recurrence_rules_active_task")
      .on(table.taskItemId)
      .where(sql`${table.deletedAt} is null and ${table.status} = 'active'`),
    index("idx_recurrence_rules_workspace_next").on(
      table.workspaceId,
      table.status,
      table.nextOccurrenceAt,
      table.deletedAt
    ),
    check("ck_recurrence_rules_frequency", sql`${table.frequency} in ('daily', 'weekly')`),
    check("ck_recurrence_rules_interval", sql`${table.interval} >= 1`),
    check("ck_recurrence_rules_status", sql`${table.status} in ('active', 'cleared')`)
  ]
);
