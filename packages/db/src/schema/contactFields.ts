import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { containers } from "./containers";
import { workspaces } from "./workspaces";

export const contactFields = sqliteTable(
  "contact_fields",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    containerId: text("container_id")
      .notNull()
      .references(() => containers.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    value: text("value").notNull(),
    type: text("type").notNull().default("text"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_contact_fields_container_order").on(
      table.workspaceId,
      table.containerId,
      table.deletedAt,
      table.sortOrder
    ),
    index("idx_contact_fields_workspace_deleted").on(
      table.workspaceId,
      table.deletedAt
    ),
    check(
      "ck_contact_fields_type",
      sql`${table.type} in ('text', 'email', 'phone', 'website', 'address', 'date', 'custom')`
    )
  ]
);
