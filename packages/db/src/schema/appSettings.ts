import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const appSettings = sqliteTable(
  "app_settings",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    settingKey: text("setting_key").notNull(),
    valueJson: text("value_json").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    uniqueIndex("idx_app_settings_workspace_key_unique").on(
      table.workspaceId,
      table.settingKey
    ),
    index("idx_app_settings_workspace").on(table.workspaceId)
  ]
);
