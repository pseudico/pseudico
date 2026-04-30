import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";
import { categories } from "./categories";
import { workspaces } from "./workspaces";

export const containers = sqliteTable(
  "containers",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null"
    }),
    color: text("color"),
    isFavorite: integer("is_favorite").notNull().default(0),
    isSystem: integer("is_system").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    archivedAt: text("archived_at"),
    deletedAt: text("deleted_at")
  },
  (table) => [
    uniqueIndex("idx_containers_workspace_slug_unique").on(
      table.workspaceId,
      table.slug
    ),
    index("idx_containers_workspace_type").on(table.workspaceId, table.type),
    index("idx_containers_workspace_status").on(
      table.workspaceId,
      table.status,
      table.deletedAt
    ),
    index("idx_containers_category").on(table.categoryId),
    check("ck_containers_type", sql`${table.type} in ('inbox', 'project', 'contact')`),
    check(
      "ck_containers_status",
      sql`${table.status} in ('active', 'waiting', 'completed', 'archived')`
    ),
    check("ck_containers_is_favorite_bool", sql`${table.isFavorite} in (0, 1)`),
    check("ck_containers_is_system_bool", sql`${table.isSystem} in (0, 1)`)
  ]
);
