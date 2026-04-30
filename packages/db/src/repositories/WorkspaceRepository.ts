import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type WorkspaceRow = {
  id: string;
  name: string;
  schema_version: number;
  created_at: string;
  updated_at: string;
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkspaceRecordInput = {
  id: string;
  name: string;
  schemaVersion: number;
  timestamp: string;
};

export class WorkspaceRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  findById(id: string): WorkspaceRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], WorkspaceRow>(
        `select id, name, schema_version, created_at, updated_at
         from workspaces
         where id = ?`
      )
      .get(id);

    return row === undefined ? null : toWorkspaceRecord(row);
  }

  create(input: CreateWorkspaceRecordInput): WorkspaceRecord {
    this.connection.sqlite
      .prepare(
        `insert into workspaces (id, name, schema_version, created_at, updated_at)
         values (?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.name,
        input.schemaVersion,
        input.timestamp,
        input.timestamp
      );

    const created = this.findById(input.id);

    if (created === null) {
      throw new Error("Workspace row was not created.");
    }

    return created;
  }
}

function toWorkspaceRecord(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
