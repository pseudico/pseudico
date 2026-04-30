import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { tags } from "./tags";
import { workspaces } from "./workspaces";

export const taggings = sqliteTable(
  "taggings",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    source: text("source").notNull().default("manual"),
    createdAt: text("created_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_taggings_target").on(
      table.workspaceId,
      table.targetType,
      table.targetId
    ),
    check(
      "ck_taggings_target_type",
      sql`${table.targetType} in ('container', 'item', 'list_item')`
    ),
    check(
      "ck_taggings_source",
      sql`${table.source} in ('inline', 'manual', 'imported')`
    )
  ]
);
