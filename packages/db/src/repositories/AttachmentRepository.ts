import type { AttachmentRecord } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type AttachmentRow = {
  id: string;
  workspace_id: string;
  item_id: string;
  original_name: string;
  stored_name: string;
  mime_type: string | null;
  size_bytes: number;
  checksum: string | null;
  storage_path: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreateAttachmentInput = {
  id: string;
  workspaceId: string;
  itemId: string;
  originalName: string;
  storedName: string;
  sizeBytes: number;
  storagePath: string;
  timestamp: string;
  checksum?: string | null;
  description?: string | null;
  mimeType?: string | null;
};

export type ListAttachmentsForItemInput = {
  workspaceId: string;
  itemId: string;
  includeDeleted?: boolean;
};

export class AttachmentRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string): AttachmentRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], AttachmentRow>(
        `select *
         from attachments
         where id = ?
           and deleted_at is null`
      )
      .get(id);

    return row === undefined ? null : toAttachmentRecord(row);
  }

  listForItem(input: ListAttachmentsForItemInput): AttachmentRecord[] {
    const where = ["workspace_id = ?", "item_id = ?"];
    const values: unknown[] = [input.workspaceId, input.itemId];

    if (input.includeDeleted !== true) {
      where.push("deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], AttachmentRow>(
        `select *
         from attachments
         where ${where.join(" and ")}
         order by created_at asc, original_name asc`
      )
      .all(...values);

    return rows.map(toAttachmentRecord);
  }

  create(input: CreateAttachmentInput): AttachmentRecord {
    this.connection.sqlite
      .prepare(
        `insert into attachments (
          id,
          workspace_id,
          item_id,
          original_name,
          stored_name,
          mime_type,
          size_bytes,
          checksum,
          storage_path,
          description,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.itemId,
        input.originalName,
        input.storedName,
        input.mimeType ?? null,
        input.sizeBytes,
        input.checksum ?? null,
        input.storagePath,
        input.description ?? null,
        input.timestamp,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Attachment row was not created: ${input.id}.`);
    }

    return created;
  }
}

function toAttachmentRecord(row: AttachmentRow): AttachmentRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    itemId: row.item_id,
    originalName: row.original_name,
    storedName: row.stored_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    checksum: row.checksum,
    storagePath: row.storage_path,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}
