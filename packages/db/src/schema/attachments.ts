import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { items } from "./items";
import { workspaces } from "./workspaces";

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    storedName: text("stored_name").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: text("checksum"),
    storagePath: text("storage_path").notNull(),
    description: text("description"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    uniqueIndex("idx_attachments_workspace_storage_path_unique").on(
      table.workspaceId,
      table.storagePath
    ),
    index("idx_attachments_workspace_item").on(table.workspaceId, table.itemId),
    index("idx_attachments_checksum").on(table.workspaceId, table.checksum),
    check("ck_attachments_size_bytes", sql`${table.sizeBytes} >= 0`)
  ]
);
