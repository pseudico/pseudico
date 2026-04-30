import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  type AnySQLiteColumn
} from "drizzle-orm/sqlite-core";
import { listDetails } from "./listDetails";
import { workspaces } from "./workspaces";

export const listItems = sqliteTable(
  "list_items",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    listItemParentId: text("list_item_parent_id").references(
      (): AnySQLiteColumn => listItems.id,
      { onDelete: "set null" }
    ),
    listId: text("list_id")
      .notNull()
      .references(() => listDetails.itemId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    status: text("status").notNull().default("open"),
    depth: integer("depth").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    startAt: text("start_at"),
    dueAt: text("due_at"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    archivedAt: text("archived_at"),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_list_items_list_order").on(table.listId, table.sortOrder),
    index("idx_list_items_due").on(table.workspaceId, table.dueAt, table.status),
    check(
      "ck_list_items_status",
      sql`${table.status} in ('open', 'done', 'waiting', 'cancelled')`
    ),
    check("ck_list_items_depth", sql`${table.depth} >= 0`)
  ]
);
