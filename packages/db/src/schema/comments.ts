import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    body: text("body").notNull(),
    authorLabel: text("author_label"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    editedAt: text("edited_at"),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_comments_target_order").on(
      table.workspaceId,
      table.targetType,
      table.targetId,
      table.deletedAt,
      table.sortOrder
    ),
    index("idx_comments_workspace_updated").on(
      table.workspaceId,
      table.updatedAt
    ),
    check(
      "ck_comments_target_type",
      sql`${table.targetType} in ('container', 'item', 'list_item')`
    ),
    check("ck_comments_sort_order", sql`${table.sortOrder} >= 0`)
  ]
);
