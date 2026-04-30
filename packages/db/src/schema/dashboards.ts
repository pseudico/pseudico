import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const dashboards = sqliteTable(
  "dashboards",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isDefault: integer("is_default").notNull().default(0),
    layoutJson: text("layout_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_dashboards_workspace_default").on(
      table.workspaceId,
      table.isDefault
    ),
    check("ck_dashboards_is_default_bool", sql`${table.isDefault} in (0, 1)`)
  ]
);
