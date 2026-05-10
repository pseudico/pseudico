import type { ContainerMediaRecord, ContainerMediaRole } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type ContainerMediaRow = {
  id: string; workspace_id: string; container_id: string; attachment_id: string; role: ContainerMediaRole;
  thumbnail_storage_path: string | null; alt_text: string | null; created_at: string; updated_at: string; deleted_at: string | null;
};

export type CreateContainerMediaInput = {
  id: string; workspaceId: string; containerId: string; attachmentId: string; role: ContainerMediaRole; timestamp: string;
  thumbnailStoragePath?: string | null; altText?: string | null;
};

export class ContainerMediaRepository {
  constructor(private readonly connection: DatabaseConnection) {}

  getById(id: string): ContainerMediaRecord | null {
    const row = this.connection.sqlite.prepare<[string], ContainerMediaRow>(`select * from container_media where id = ? and deleted_at is null`).get(id);
    return row === undefined ? null : toRecord(row);
  }

  getActiveForContainer(containerId: string, role: ContainerMediaRole): ContainerMediaRecord | null {
    const row = this.connection.sqlite.prepare<[string, string], ContainerMediaRow>(
      `select * from container_media where container_id = ? and role = ? and deleted_at is null limit 1`
    ).get(containerId, role);
    return row === undefined ? null : toRecord(row);
  }

  listForContainer(containerId: string, includeDeleted = false): ContainerMediaRecord[] {
    const rows = this.connection.sqlite.prepare<[string], ContainerMediaRow>(
      `select * from container_media where container_id = ? ${includeDeleted ? "" : "and deleted_at is null"} order by role asc, updated_at desc`
    ).all(containerId);
    return rows.map(toRecord);
  }

  create(input: CreateContainerMediaInput): ContainerMediaRecord {
    this.connection.sqlite.prepare(
      `insert into container_media (id, workspace_id, container_id, attachment_id, role, thumbnail_storage_path, alt_text, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(input.id, input.workspaceId, input.containerId, input.attachmentId, input.role, input.thumbnailStoragePath ?? null, input.altText ?? null, input.timestamp, input.timestamp);
    const created = this.getById(input.id);
    if (created === null) throw new Error(`Container media row was not created: ${input.id}.`);
    return created;
  }

  softDeleteActive(containerId: string, role: ContainerMediaRole, timestamp: string): ContainerMediaRecord | null {
    const current = this.getActiveForContainer(containerId, role);
    if (current === null) return null;
    this.connection.sqlite.prepare(`update container_media set deleted_at = ?, updated_at = ? where id = ? and deleted_at is null`).run(timestamp, timestamp, current.id);
    return { ...current, updatedAt: timestamp, deletedAt: timestamp };
  }
}

function toRecord(row: ContainerMediaRow): ContainerMediaRecord {
  return {
    id: row.id, workspaceId: row.workspace_id, containerId: row.container_id, attachmentId: row.attachment_id, role: row.role,
    thumbnailStoragePath: row.thumbnail_storage_path, altText: row.alt_text, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at
  };
}
