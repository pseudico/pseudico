import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { categories } from "./categories";
import { containerTabs } from "./containerTabs";
import { containers } from "./containers";
import { workspaces } from "./workspaces";

export const items = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    containerId: text("container_id")
      .notNull()
      .references(() => containers.id, { onDelete: "cascade" }),
    containerTabId: text("container_tab_id").references(() => containerTabs.id, {
      onDelete: "set null"
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null"
    }),
    status: text("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    pinned: integer("pinned").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    completedAt: text("completed_at"),
    archivedAt: text("archived_at"),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_items_workspace_type").on(table.workspaceId, table.type),
    index("idx_items_container_order").on(
      table.containerId,
      table.containerTabId,
      table.sortOrder
    ),
    index("idx_items_status_dates").on(
      table.workspaceId,
      table.status,
      table.deletedAt
    ),
    index("idx_items_category").on(table.categoryId),
    check(
      "ck_items_type",
      sql`${table.type} in ('task', 'list', 'note', 'file', 'link', 'heading', 'location', 'comment')`
    ),
    check("ck_items_pinned_bool", sql`${table.pinned} in (0, 1)`)
  ]
);
