import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const templates = sqliteTable(
  "templates",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("list"),
    name: text("name").notNull(),
    description: text("description"),
    sourceType: text("source_type").notNull().default("list"),
    sourceId: text("source_id"),
    templateJson: text("template_json").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_templates_workspace_kind").on(
      table.workspaceId,
      table.kind,
      table.deletedAt,
      table.updatedAt
    ),
    index("idx_templates_source").on(
      table.workspaceId,
      table.sourceType,
      table.sourceId
    ),
    check("ck_templates_kind", sql`${table.kind} in ('list')`),
    check("ck_templates_source_type", sql`${table.sourceType} in ('list')`)
  ]
);
