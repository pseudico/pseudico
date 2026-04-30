import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { items } from "./items";
import { workspaces } from "./workspaces";

export const listDetails = sqliteTable(
  "list_details",
  {
    itemId: text("item_id")
      .primaryKey()
      .references(() => items.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    displayMode: text("display_mode").notNull().default("checklist"),
    showCompleted: integer("show_completed").notNull().default(1),
    progressMode: text("progress_mode").notNull().default("count"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    check(
      "ck_list_details_display_mode",
      sql`${table.displayMode} in ('checklist', 'pipeline')`
    ),
    check("ck_list_details_show_completed_bool", sql`${table.showCompleted} in (0, 1)`),
    check(
      "ck_list_details_progress_mode",
      sql`${table.progressMode} in ('count', 'manual', 'none')`
    )
  ]
);
