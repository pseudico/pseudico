import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type ContainerRow = {
  id: string;
  workspace_id: string;
  type: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  category_id: string | null;
  color: string | null;
  is_favorite: number;
  is_system: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

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

export type ContainerRecord = {
  id: string;
  workspaceId: string;
  type: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  categoryId: string | null;
  color: string | null;
  isFavorite: boolean;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
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

export type CreateSystemInboxInput = {
  id: string;
  workspaceId: string;
  timestamp: string;
};

export type CreateDefaultContainerTabInput = {
  id: string;
  workspaceId: string;
  containerId: string;
  timestamp: string;
};

export class ContainerRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  findSystemInbox(workspaceId: string): ContainerRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ContainerRow>(
        `select *
         from containers
         where workspace_id = ?
           and type = 'inbox'
           and slug = 'inbox'
           and deleted_at is null
         limit 1`
      )
      .get(workspaceId);

    return row === undefined ? null : toContainerRecord(row);
  }

  createSystemInbox(input: CreateSystemInboxInput): ContainerRecord {
    this.connection.sqlite
      .prepare(
        `insert into containers (
          id,
          workspace_id,
          type,
          name,
          slug,
          status,
          is_favorite,
          is_system,
          sort_order,
          created_at,
          updated_at
        ) values (?, ?, 'inbox', 'Inbox', 'inbox', 'active', 1, 1, 0, ?, ?)`
      )
      .run(input.id, input.workspaceId, input.timestamp, input.timestamp);

    const created = this.findSystemInbox(input.workspaceId);

    if (created === null) {
      throw new Error("System Inbox row was not created.");
    }

    return created;
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

  createDefaultTab(input: CreateDefaultContainerTabInput): ContainerTabRecord {
    this.connection.sqlite
      .prepare(
        `insert into container_tabs (
          id,
          workspace_id,
          container_id,
          name,
          sort_order,
          is_default,
          created_at,
          updated_at
        ) values (?, ?, ?, 'Main', 0, 1, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.containerId,
        input.timestamp,
        input.timestamp
      );

    const created = this.findDefaultTab(input.containerId);

    if (created === null) {
      throw new Error("Default container tab row was not created.");
    }

    return created;
  }
}

function toContainerRecord(row: ContainerRow): ContainerRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    categoryId: row.category_id,
    color: row.color,
    isFavorite: row.is_favorite === 1,
    isSystem: row.is_system === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at
  };
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
