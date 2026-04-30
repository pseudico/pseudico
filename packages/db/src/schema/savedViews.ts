import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const savedViews = sqliteTable(
  "saved_views",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    queryJson: text("query_json").notNull().default("{}"),
    displayJson: text("display_json").notNull().default("{}"),
    isFavorite: integer("is_favorite").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_saved_views_workspace_type").on(
      table.workspaceId,
      table.type,
      table.deletedAt
    ),
    check(
      "ck_saved_views_type",
      sql`${table.type} in ('collection', 'smart_list', 'dashboard_widget', 'search')`
    ),
    check("ck_saved_views_is_favorite_bool", sql`${table.isFavorite} in (0, 1)`)
  ]
);
