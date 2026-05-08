import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { attachments } from "./attachments";
import { workspaces } from "./workspaces";

export const attachmentVersions = sqliteTable(
  "attachment_versions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    attachmentId: text("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    originalName: text("original_name").notNull(),
    storedName: text("stored_name").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: text("checksum").notNull(),
    storagePath: text("storage_path").notNull(),
    note: text("note"),
    createdAt: text("created_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    uniqueIndex("idx_attachment_versions_number_unique").on(
      table.attachmentId,
      table.versionNumber
    ),
    uniqueIndex("idx_attachment_versions_storage_path_unique").on(
      table.workspaceId,
      table.storagePath
    ),
    index("idx_attachment_versions_attachment").on(
      table.attachmentId,
      table.versionNumber
    ),
    index("idx_attachment_versions_workspace").on(
      table.workspaceId,
      table.createdAt
    ),
    check("ck_attachment_versions_version_number", sql`${table.versionNumber} > 0`),
    check("ck_attachment_versions_size_bytes", sql`${table.sizeBytes} >= 0`)
  ]
);
