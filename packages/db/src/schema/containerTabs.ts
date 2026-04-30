import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { containers } from "./containers";
import { workspaces } from "./workspaces";

export const containerTabs = sqliteTable(
  "container_tabs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    containerId: text("container_id")
      .notNull()
      .references(() => containers.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Main"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isDefault: integer("is_default").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    archivedAt: text("archived_at"),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_container_tabs_container").on(table.containerId, table.sortOrder),
    check("ck_container_tabs_is_default_bool", sql`${table.isDefault} in (0, 1)`)
  ]
);
