import type { ContactFieldType } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type ContactFieldRow = {
  id: string;
  workspace_id: string;
  container_id: string;
  label: string;
  value: string;
  type: ContactFieldType;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ContactFieldRecord = {
  id: string;
  workspaceId: string;
  containerId: string;
  label: string;
  value: string;
  type: ContactFieldType;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateContactFieldInput = {
  id: string;
  workspaceId: string;
  containerId: string;
  label: string;
  value: string;
  type: ContactFieldType;
  sortOrder?: number;
  timestamp: string;
};

export type UpdateContactFieldPatch = {
  label?: string;
  value?: string;
  type?: ContactFieldType;
  sortOrder?: number;
  timestamp: string;
};

export type ListContactFieldsInput = {
  workspaceId: string;
  containerId: string;
  includeDeleted?: boolean;
};

export class ContactFieldRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string): ContactFieldRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ContactFieldRow>(
        `select *
         from contact_fields
         where id = ?
           and deleted_at is null`
      )
      .get(id);

    return row === undefined ? null : toContactFieldRecord(row);
  }

  listForContact(input: ListContactFieldsInput): ContactFieldRecord[] {
    const where = ["workspace_id = ?", "container_id = ?"];
    const values: unknown[] = [input.workspaceId, input.containerId];

    if (input.includeDeleted !== true) {
      where.push("deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], ContactFieldRow>(
        `select *
         from contact_fields
         where ${where.join(" and ")}
         order by sort_order asc, created_at asc, id asc`
      )
      .all(...values);

    return rows.map(toContactFieldRecord);
  }

  create(input: CreateContactFieldInput): ContactFieldRecord {
    this.connection.sqlite
      .prepare(
        `insert into contact_fields (
          id,
          workspace_id,
          container_id,
          label,
          value,
          type,
          sort_order,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.containerId,
        input.label,
        input.value,
        input.type,
        input.sortOrder ?? 0,
        input.timestamp,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Contact field row was not created: ${input.id}.`);
    }

    return created;
  }

  update(id: string, patch: UpdateContactFieldPatch): ContactFieldRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.label !== undefined) {
      assignments.push("label = ?");
      values.push(patch.label);
    }

    if (patch.value !== undefined) {
      assignments.push("value = ?");
      values.push(patch.value);
    }

    if (patch.type !== undefined) {
      assignments.push("type = ?");
      values.push(patch.type);
    }

    if (patch.sortOrder !== undefined) {
      assignments.push("sort_order = ?");
      values.push(patch.sortOrder);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, id);

    this.connection.sqlite
      .prepare(
        `update contact_fields
         set ${assignments.join(", ")}
         where id = ?
           and deleted_at is null`
      )
      .run(...values);

    const updated = this.getById(id);

    if (updated === null) {
      throw new Error(`Contact field row was not found: ${id}.`);
    }

    return updated;
  }

  softDelete(id: string, timestamp: string): ContactFieldRecord {
    this.connection.sqlite
      .prepare(
        `update contact_fields
         set deleted_at = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, timestamp, id);

    const deleted = this.connection.sqlite
      .prepare<[string], ContactFieldRow>(
        `select *
         from contact_fields
         where id = ?`
      )
      .get(id);

    if (deleted === undefined) {
      throw new Error(`Contact field row was not found: ${id}.`);
    }

    return toContactFieldRecord(deleted);
  }
}

function toContactFieldRecord(row: ContactFieldRow): ContactFieldRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    containerId: row.container_id,
    label: row.label,
    value: row.value,
    type: row.type,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}
