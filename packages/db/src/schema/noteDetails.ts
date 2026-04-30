import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { items } from "./items";
import { workspaces } from "./workspaces";

export const noteDetails = sqliteTable("note_details", {
  itemId: text("item_id")
    .primaryKey()
    .references(() => items.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  format: text("format").notNull().default("markdown"),
  content: text("content").notNull().default(""),
  preview: text("preview"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
