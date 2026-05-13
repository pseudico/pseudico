import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { items } from "./items";
import { workspaces } from "./workspaces";

export const imapImportJobs = sqliteTable(
  "imap_import_jobs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    accountKey: text("account_key").notNull(),
    mailbox: text("mailbox").notNull(),
    filterJson: text("filter_json").notNull().default("{}"),
    status: text("status").notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    importedCount: integer("imported_count").notNull().default(0),
    skippedDuplicateCount: integer("skipped_duplicate_count").notNull().default(0),
    errorMessage: text("error_message"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [index("idx_imap_import_jobs_workspace").on(table.workspaceId, table.createdAt)]
);

export const imapImportedMessages = sqliteTable(
  "imap_imported_messages",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    accountKey: text("account_key").notNull(),
    mailbox: text("mailbox").notNull(),
    messageUid: text("message_uid").notNull(),
    messageId: text("message_id"),
    itemId: text("item_id").references(() => items.id, { onDelete: "set null" }),
    importedAt: text("imported_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    uniqueIndex("idx_imap_imported_messages_unique_uid").on(
      table.workspaceId,
      table.accountKey,
      table.mailbox,
      table.messageUid
    ),
    index("idx_imap_imported_messages_workspace").on(table.workspaceId, table.importedAt)
  ]
);
