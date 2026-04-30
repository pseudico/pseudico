import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color").notNull(),
    description: text("description"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    uniqueIndex("idx_categories_workspace_slug_unique").on(
      table.workspaceId,
      table.slug
    ),
    index("idx_categories_workspace_deleted").on(
      table.workspaceId,
      table.deletedAt
    )
  ]
);
