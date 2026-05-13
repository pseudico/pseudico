import type { DatabaseConnection } from "../connection/createDatabaseConnection";

export type ImapImportJobStatus = "running" | "completed" | "failed";

type ImapImportJobRow = {
  id: string;
  workspace_id: string;
  account_key: string;
  mailbox: string;
  filter_json: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  imported_count: number;
  skipped_duplicate_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type ImapImportedMessageRow = {
  id: string;
  workspace_id: string;
  account_key: string;
  mailbox: string;
  message_uid: string;
  message_id: string | null;
  item_id: string | null;
  imported_at: string;
  created_at: string;
  updated_at: string;
};

export type ImapImportJobRecord = {
  id: string;
  workspaceId: string;
  accountKey: string;
  mailbox: string;
  filterJson: string;
  status: ImapImportJobStatus;
  startedAt: string;
  finishedAt: string | null;
  importedCount: number;
  skippedDuplicateCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImapImportedMessageRecord = {
  id: string;
  workspaceId: string;
  accountKey: string;
  mailbox: string;
  messageUid: string;
  messageId: string | null;
  itemId: string | null;
  importedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateImapImportJobInput = {
  id: string;
  workspaceId: string;
  accountKey: string;
  mailbox: string;
  filterJson?: string;
  startedAt: string;
  timestamp: string;
};

export type CompleteImapImportJobInput = {
  jobId: string;
  status: Exclude<ImapImportJobStatus, "running">;
  finishedAt: string;
  importedCount: number;
  skippedDuplicateCount: number;
  errorMessage?: string | null;
};

export type CreateImapImportedMessageInput = {
  id: string;
  workspaceId: string;
  accountKey: string;
  mailbox: string;
  messageUid: string;
  messageId?: string | null;
  itemId?: string | null;
  importedAt: string;
  timestamp: string;
};

export class ImapImportRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  createJob(input: CreateImapImportJobInput): ImapImportJobRecord {
    this.connection.sqlite
      .prepare(
        `insert into imap_import_jobs (
          id, workspace_id, account_key, mailbox, filter_json, status,
          started_at, finished_at, imported_count, skipped_duplicate_count,
          error_message, created_at, updated_at
        ) values (?, ?, ?, ?, ?, 'running', ?, null, 0, 0, null, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.accountKey,
        input.mailbox,
        input.filterJson ?? "{}",
        input.startedAt,
        input.timestamp,
        input.timestamp
      );

    const created = this.getJob(input.id);
    if (created === null) {
      throw new Error(`IMAP import job was not created: ${input.id}.`);
    }
    return created;
  }

  completeJob(input: CompleteImapImportJobInput): ImapImportJobRecord {
    this.connection.sqlite
      .prepare(
        `update imap_import_jobs
         set status = ?,
             finished_at = ?,
             imported_count = ?,
             skipped_duplicate_count = ?,
             error_message = ?,
             updated_at = ?
         where id = ?`
      )
      .run(
        input.status,
        input.finishedAt,
        input.importedCount,
        input.skippedDuplicateCount,
        input.errorMessage ?? null,
        input.finishedAt,
        input.jobId
      );

    const updated = this.getJob(input.jobId);
    if (updated === null) {
      throw new Error(`IMAP import job was not found: ${input.jobId}.`);
    }
    return updated;
  }

  getJob(jobId: string): ImapImportJobRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ImapImportJobRow>(
        `select * from imap_import_jobs where id = ? limit 1`
      )
      .get(jobId);

    return row === undefined ? null : toImapImportJobRecord(row);
  }

  listJobs(input: { workspaceId: string; limit?: number }): ImapImportJobRecord[] {
    const limit = Math.max(1, Math.min(input.limit ?? 20, 100));
    return this.connection.sqlite
      .prepare<[string, number], ImapImportJobRow>(
        `select * from imap_import_jobs
         where workspace_id = ?
         order by created_at desc, id desc
         limit ?`
      )
      .all(input.workspaceId, limit)
      .map(toImapImportJobRecord);
  }

  findImportedMessage(input: {
    workspaceId: string;
    accountKey: string;
    mailbox: string;
    messageUid: string;
    messageId?: string | null;
  }): ImapImportedMessageRecord | null {
    const byUid = this.connection.sqlite
      .prepare<[string, string, string, string], ImapImportedMessageRow>(
        `select * from imap_imported_messages
         where workspace_id = ?
           and account_key = ?
           and mailbox = ?
           and message_uid = ?
         limit 1`
      )
      .get(input.workspaceId, input.accountKey, input.mailbox, input.messageUid);

    if (byUid !== undefined) {
      return toImapImportedMessageRecord(byUid);
    }

    if (input.messageId === undefined || input.messageId === null) {
      return null;
    }

    const byMessageId = this.connection.sqlite
      .prepare<[string, string, string, string], ImapImportedMessageRow>(
        `select * from imap_imported_messages
         where workspace_id = ?
           and account_key = ?
           and mailbox = ?
           and message_id = ?
         limit 1`
      )
      .get(input.workspaceId, input.accountKey, input.mailbox, input.messageId);

    return byMessageId === undefined ? null : toImapImportedMessageRecord(byMessageId);
  }

  createImportedMessage(input: CreateImapImportedMessageInput): ImapImportedMessageRecord {
    this.connection.sqlite
      .prepare(
        `insert into imap_imported_messages (
          id, workspace_id, account_key, mailbox, message_uid, message_id,
          item_id, imported_at, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(workspace_id, account_key, mailbox, message_uid)
        do update set
          message_id = excluded.message_id,
          item_id = excluded.item_id,
          imported_at = excluded.imported_at,
          updated_at = excluded.updated_at`
      )
      .run(
        input.id,
        input.workspaceId,
        input.accountKey,
        input.mailbox,
        input.messageUid,
        input.messageId ?? null,
        input.itemId ?? null,
        input.importedAt,
        input.timestamp,
        input.timestamp
      );

    const record = this.findImportedMessage({
      workspaceId: input.workspaceId,
      accountKey: input.accountKey,
      mailbox: input.mailbox,
      messageUid: input.messageUid,
      messageId: input.messageId ?? null
    });

    if (record === null) {
      throw new Error(`IMAP imported message was not saved: ${input.messageUid}.`);
    }
    return record;
  }
}

function toImapImportJobRecord(row: ImapImportJobRow): ImapImportJobRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    accountKey: row.account_key,
    mailbox: row.mailbox,
    filterJson: row.filter_json,
    status: row.status as ImapImportJobStatus,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    importedCount: row.imported_count,
    skippedDuplicateCount: row.skipped_duplicate_count,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toImapImportedMessageRecord(row: ImapImportedMessageRow): ImapImportedMessageRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    accountKey: row.account_key,
    mailbox: row.mailbox,
    messageUid: row.message_uid,
    messageId: row.message_id,
    itemId: row.item_id,
    importedAt: row.imported_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
