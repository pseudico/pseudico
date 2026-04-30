import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { dashboards } from "./dashboards";
import { savedViews } from "./savedViews";
import { workspaces } from "./workspaces";

export const dashboardWidgets = sqliteTable(
  "dashboard_widgets",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    dashboardId: text("dashboard_id")
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title"),
    savedViewId: text("saved_view_id").references(() => savedViews.id, {
      onDelete: "set null"
    }),
    configJson: text("config_json").notNull().default("{}"),
    positionJson: text("position_json").notNull().default("{}"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_dashboard_widgets_dashboard_order").on(
      table.dashboardId,
      table.sortOrder
    ),
    check(
      "ck_dashboard_widgets_type",
      sql`${table.type} in ('saved_view', 'today', 'upcoming', 'overdue', 'favorites', 'recent_activity', 'project_health')`
    )
  ]
);
