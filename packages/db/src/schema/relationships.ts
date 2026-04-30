import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const relationships = sqliteTable(
  "relationships",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    relationType: text("relation_type").notNull(),
    label: text("label"),
    createdAt: text("created_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_relationships_source").on(
      table.workspaceId,
      table.sourceType,
      table.sourceId
    ),
    index("idx_relationships_target").on(
      table.workspaceId,
      table.targetType,
      table.targetId
    ),
    check(
      "ck_relationships_source_type",
      sql`${table.sourceType} in ('container', 'item', 'list_item')`
    ),
    check(
      "ck_relationships_target_type",
      sql`${table.targetType} in ('container', 'item', 'list_item', 'url', 'file')`
    ),
    check(
      "ck_relationships_relation_type",
      sql`${table.relationType} in ('related', 'depends_on', 'blocked_by', 'references', 'belongs_to', 'follow_up_for')`
    )
  ]
);
