import type { AttachmentVersionRecord } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type AttachmentVersionRow = {
  id: string;
  workspace_id: string;
  attachment_id: string;
  version_number: number;
  original_name: string;
  stored_name: string;
  size_bytes: number;
  checksum: string;
  storage_path: string;
  note: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type CreateAttachmentVersionInput = {
  id: string;
  workspaceId: string;
  attachmentId: string;
  versionNumber: number;
  originalName: string;
  storedName: string;
  sizeBytes: number;
  checksum: string;
  storagePath: string;
  timestamp: string;
  note?: string | null;
};

export class AttachmentVersionRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string): AttachmentVersionRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], AttachmentVersionRow>(
        `select *
         from attachment_versions
         where id = ?
           and deleted_at is null`
      )
      .get(id);

    return row === undefined ? null : toAttachmentVersionRecord(row);
  }

  listForAttachment(attachmentId: string): AttachmentVersionRecord[] {
    return this.connection.sqlite
      .prepare<[string], AttachmentVersionRow>(
        `select *
         from attachment_versions
         where attachment_id = ?
           and deleted_at is null
         order by version_number desc`
      )
      .all(attachmentId)
      .map(toAttachmentVersionRecord);
  }

  getLatestVersionNumber(attachmentId: string): number {
    const row = this.connection.sqlite
      .prepare<[string], { version_number: number | null }>(
        `select max(version_number) as version_number
         from attachment_versions
         where attachment_id = ?
           and deleted_at is null`
      )
      .get(attachmentId);

    return row?.version_number ?? 0;
  }

  create(input: CreateAttachmentVersionInput): AttachmentVersionRecord {
    this.connection.sqlite
      .prepare(
        `insert into attachment_versions (
          id,
          workspace_id,
          attachment_id,
          version_number,
          original_name,
          stored_name,
          size_bytes,
          checksum,
          storage_path,
          note,
          created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.attachmentId,
        input.versionNumber,
        input.originalName,
        input.storedName,
        input.sizeBytes,
        input.checksum,
        input.storagePath,
        input.note ?? null,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Attachment version row was not created: ${input.id}.`);
    }

    return created;
  }
}

function toAttachmentVersionRecord(
  row: AttachmentVersionRow
): AttachmentVersionRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    attachmentId: row.attachment_id,
    versionNumber: row.version_number,
    originalName: row.original_name,
    storedName: row.stored_name,
    sizeBytes: row.size_bytes,
    checksum: row.checksum,
    storagePath: row.storage_path,
    note: row.note,
    createdAt: row.created_at,
    deletedAt: row.deleted_at
  };
}
