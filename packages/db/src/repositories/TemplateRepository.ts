import type { DatabaseConnection } from "../connection/createDatabaseConnection";

export type TemplateKind = "list" | "project" | "contact";
export type TemplateSourceType = "list" | "project" | "contact";

type TemplateRow = {
  id: string;
  workspace_id: string;
  kind: string;
  name: string;
  description: string | null;
  source_type: string;
  source_id: string | null;
  template_json: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TemplateRecord = {
  id: string;
  workspaceId: string;
  kind: TemplateKind;
  name: string;
  description: string | null;
  sourceType: TemplateSourceType;
  sourceId: string | null;
  templateJson: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateTemplateInput = {
  id: string;
  workspaceId: string;
  kind: TemplateKind;
  name: string;
  templateJson: string;
  timestamp: string;
  description?: string | null;
  sourceType?: TemplateSourceType;
  sourceId?: string | null;
};

export type UpdateTemplateInput = {
  id: string;
  name: string;
  description?: string | null;
  timestamp: string;
};

export type ListTemplatesInput = {
  workspaceId: string;
  kind?: TemplateKind;
  includeDeleted?: boolean;
};

export class TemplateRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string, filters: { includeDeleted?: boolean } = {}): TemplateRecord | null {
    const deletedFilter = filters.includeDeleted === true ? "" : "and deleted_at is null";
    const row = this.connection.sqlite
      .prepare<[string], TemplateRow>(
        `select *
         from templates
         where id = ?
           ${deletedFilter}`
      )
      .get(id);

    return row === undefined ? null : toTemplateRecord(row);
  }

  listByWorkspace(input: ListTemplatesInput): TemplateRecord[] {
    const where = ["workspace_id = ?"];
    const values: unknown[] = [input.workspaceId];

    if (input.kind !== undefined) {
      where.push("kind = ?");
      values.push(input.kind);
    }

    if (input.includeDeleted !== true) {
      where.push("deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], TemplateRow>(
        `select *
         from templates
         where ${where.join(" and ")}
         order by updated_at desc, name collate nocase asc`
      )
      .all(...values);

    return rows.map(toTemplateRecord);
  }

  create(input: CreateTemplateInput): TemplateRecord {
    this.connection.sqlite
      .prepare(
        `insert into templates (
          id,
          workspace_id,
          kind,
          name,
          description,
          source_type,
          source_id,
          template_json,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.kind,
        input.name,
        input.description ?? null,
        input.sourceType ?? input.kind,
        input.sourceId ?? null,
        input.templateJson,
        input.timestamp,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Template row was not created: ${input.id}.`);
    }

    return created;
  }

  update(input: UpdateTemplateInput): TemplateRecord {
    this.connection.sqlite
      .prepare(
        `update templates
         set name = ?,
             description = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(input.name, input.description ?? null, input.timestamp, input.id);

    const updated = this.getById(input.id);

    if (updated === null) {
      throw new Error(`Template row was not updated: ${input.id}.`);
    }

    return updated;
  }

  softDelete(id: string, timestamp: string): TemplateRecord {
    const before = this.getById(id);

    if (before === null) {
      throw new Error(`Template row was not found: ${id}.`);
    }

    this.connection.sqlite
      .prepare(
        `update templates
         set deleted_at = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, timestamp, id);

    const deleted = this.getById(id, { includeDeleted: true });

    if (deleted === null) {
      throw new Error(`Template row was not deleted: ${id}.`);
    }

    return deleted;
  }
}

function toTemplateRecord(row: TemplateRow): TemplateRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind: row.kind as TemplateKind,
    name: row.name,
    description: row.description,
    sourceType: row.source_type as TemplateSourceType,
    sourceId: row.source_id,
    templateJson: row.template_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}
