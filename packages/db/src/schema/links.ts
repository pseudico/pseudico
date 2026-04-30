import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { items } from "./items";
import { workspaces } from "./workspaces";

export const links = sqliteTable(
  "links",
  {
    itemId: text("item_id")
      .primaryKey()
      .references(() => items.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url"),
    title: text("title"),
    description: text("description"),
    domain: text("domain"),
    faviconPath: text("favicon_path"),
    previewImagePath: text("preview_image_path"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [index("idx_links_workspace_domain").on(table.workspaceId, table.domain)]
);
