import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type ContainerTabRow = {
  id: string;
  workspace_id: string;
  container_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_default: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

export type ContainerTabRecord = {
  id: string;
  workspaceId: string;
  containerId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type CreateContainerTabInput = {
  id: string;
  workspaceId: string;
  containerId: string;
  timestamp: string;
  name?: string;
  description?: string | null;
  sortOrder?: number;
  isDefault?: boolean;
};

export type CreateDefaultContainerTabInput = {
  id: string;
  workspaceId: string;
  containerId: string;
  timestamp: string;
};

export type EnsureDefaultContainerTabInput = CreateDefaultContainerTabInput;

export class ContainerTabRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string): ContainerTabRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ContainerTabRow>(
        `select *
         from container_tabs
         where id = ?
           and deleted_at is null`
      )
      .get(id);

    return row === undefined ? null : toContainerTabRecord(row);
  }

  findDefaultTab(containerId: string): ContainerTabRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ContainerTabRow>(
        `select *
         from container_tabs
         where container_id = ?
           and is_default = 1
           and deleted_at is null
         limit 1`
      )
      .get(containerId);

    return row === undefined ? null : toContainerTabRecord(row);
  }

  listByContainer(containerId: string): ContainerTabRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string], ContainerTabRow>(
        `select *
         from container_tabs
         where container_id = ?
           and deleted_at is null
         order by sort_order asc, created_at asc`
      )
      .all(containerId);

    return rows.map(toContainerTabRecord);
  }

  create(input: CreateContainerTabInput): ContainerTabRecord {
    this.connection.sqlite
      .prepare(
        `insert into container_tabs (
          id,
          workspace_id,
          container_id,
          name,
          description,
          sort_order,
          is_default,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.containerId,
        input.name ?? "Main",
        input.description ?? null,
        input.sortOrder ?? 0,
        input.isDefault === true ? 1 : 0,
        input.timestamp,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Container tab row was not created: ${input.id}.`);
    }

    return created;
  }

  createDefaultTab(input: CreateDefaultContainerTabInput): ContainerTabRecord {
    return this.create({
      id: input.id,
      workspaceId: input.workspaceId,
      containerId: input.containerId,
      name: "Main",
      sortOrder: 0,
      isDefault: true,
      timestamp: input.timestamp
    });
  }

  ensureDefaultTab(
    input: EnsureDefaultContainerTabInput
  ): ContainerTabRecord {
    const existing = this.findDefaultTab(input.containerId);

    if (existing !== null) {
      return existing;
    }

    return this.createDefaultTab(input);
  }
}

function toContainerTabRecord(row: ContainerTabRow): ContainerTabRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    containerId: row.container_id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at
  };
}
