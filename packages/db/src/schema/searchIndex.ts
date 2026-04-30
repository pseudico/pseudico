import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const searchIndex = sqliteTable(
  "search_index",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    tags: text("tags").notNull().default(""),
    category: text("category"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    isDeleted: integer("is_deleted").notNull().default(0),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    uniqueIndex("idx_search_index_workspace_target_unique").on(
      table.workspaceId,
      table.targetType,
      table.targetId
    ),
    index("idx_search_index_workspace_updated").on(
      table.workspaceId,
      table.updatedAt
    ),
    index("idx_search_index_target").on(
      table.workspaceId,
      table.targetType,
      table.targetId
    ),
    check(
      "ck_search_index_target_type",
      sql`${table.targetType} in ('workspace', 'container', 'item', 'list_item', 'attachment', 'saved_view', 'dashboard')`
    ),
    check("ck_search_index_is_deleted_bool", sql`${table.isDeleted} in (0, 1)`)
  ]
);
