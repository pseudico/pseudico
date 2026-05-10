import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { attachments } from "./attachments";
import { containers } from "./containers";
import { workspaces } from "./workspaces";

export const containerMedia = sqliteTable(
  "container_media",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    containerId: text("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
    attachmentId: text("attachment_id").notNull().references(() => attachments.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    thumbnailStoragePath: text("thumbnail_storage_path"),
    altText: text("alt_text"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_container_media_container").on(table.containerId, table.role, table.deletedAt),
    index("idx_container_media_attachment").on(table.attachmentId),
    uniqueIndex("idx_container_media_active_role").on(table.containerId, table.role).where(sql`${table.deletedAt} is null`),
    check("ck_container_media_role", sql`${table.role} in ('project_banner', 'contact_avatar')`)
  ]
);
