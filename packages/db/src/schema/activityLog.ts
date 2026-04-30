import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const activityLog = sqliteTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorType: text("actor_type").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    summary: text("summary"),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    createdAt: text("created_at").notNull()
  },
  (table) => [
    index("idx_activity_log_workspace_created").on(
      table.workspaceId,
      table.createdAt
    ),
    index("idx_activity_log_target").on(
      table.workspaceId,
      table.targetType,
      table.targetId
    ),
    check(
      "ck_activity_log_actor_type",
      sql`${table.actorType} in ('local_user', 'system', 'importer')`
    )
  ]
);
