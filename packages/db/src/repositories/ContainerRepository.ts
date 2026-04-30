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

export type CreateSystemInboxInput = {
  id: string;
  workspaceId: string;
  timestamp: string;
};

export type CreateContainerInput = {
  id: string;
  workspaceId: string;
  type: "inbox" | "project" | "contact";
  name: string;
  slug: string;
  timestamp: string;
  description?: string | null;
  status?: "active" | "waiting" | "completed" | "archived";
  categoryId?: string | null;
  color?: string | null;
  isFavorite?: boolean;
  isSystem?: boolean;
  sortOrder?: number;
};

export type ListContainersFilter = {
  type?: string;
  status?: string;
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export type UpdateContainerPatch = {
  name?: string;
  slug?: string;
  description?: string | null;
  status?: "active" | "waiting" | "completed" | "archived";
  categoryId?: string | null;
  color?: string | null;
  isFavorite?: boolean;
  sortOrder?: number;
  timestamp: string;
};

export class ContainerRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string): ContainerRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ContainerRow>(
        `select *
         from containers
         where id = ?
           and deleted_at is null`
      )
      .get(id);

    return row === undefined ? null : toContainerRecord(row);
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

  listByWorkspace(
    workspaceId: string,
    filters: ListContainersFilter = {}
  ): ContainerRecord[] {
    const where = ["workspace_id = ?"];
    const values: unknown[] = [workspaceId];

    if (filters.type !== undefined) {
      where.push("type = ?");
      values.push(filters.type);
    }

    if (filters.status !== undefined) {
      where.push("status = ?");
      values.push(filters.status);
    }

    if (filters.includeArchived !== true) {
      where.push("archived_at is null");
    }

    if (filters.includeDeleted !== true) {
      where.push("deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], ContainerRow>(
        `select *
         from containers
         where ${where.join(" and ")}
         order by sort_order asc, created_at asc`
      )
      .all(...values);

    return rows.map(toContainerRecord);
  }

  listByType(workspaceId: string, type: string): ContainerRecord[] {
    return this.listByWorkspace(workspaceId, { type });
  }

  create(input: CreateContainerInput): ContainerRecord {
    this.connection.sqlite
      .prepare(
        `insert into containers (
          id,
          workspace_id,
          type,
          name,
          slug,
          description,
          status,
          category_id,
          color,
          is_favorite,
          is_system,
          sort_order,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.type,
        input.name,
        input.slug,
        input.description ?? null,
        input.status ?? "active",
        input.categoryId ?? null,
        input.color ?? null,
        input.isFavorite === true ? 1 : 0,
        input.isSystem === true ? 1 : 0,
        input.sortOrder ?? 0,
        input.timestamp,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Container row was not created: ${input.id}.`);
    }

    return created;
  }

  createSystemInbox(input: CreateSystemInboxInput): ContainerRecord {
    this.create({
      id: input.id,
      workspaceId: input.workspaceId,
      type: "inbox",
      name: "Inbox",
      slug: "inbox",
      status: "active",
      isFavorite: true,
      isSystem: true,
      sortOrder: 0,
      timestamp: input.timestamp
    });

    const created = this.findSystemInbox(input.workspaceId);

    if (created === null) {
      throw new Error("System Inbox row was not created.");
    }

    return created;
  }

  update(id: string, patch: UpdateContainerPatch): ContainerRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.name !== undefined) {
      assignments.push("name = ?");
      values.push(patch.name);
    }

    if (patch.slug !== undefined) {
      assignments.push("slug = ?");
      values.push(patch.slug);
    }

    if (patch.description !== undefined) {
      assignments.push("description = ?");
      values.push(patch.description);
    }

    if (patch.status !== undefined) {
      assignments.push("status = ?");
      values.push(patch.status);
    }

    if (patch.categoryId !== undefined) {
      assignments.push("category_id = ?");
      values.push(patch.categoryId);
    }

    if (patch.color !== undefined) {
      assignments.push("color = ?");
      values.push(patch.color);
    }

    if (patch.isFavorite !== undefined) {
      assignments.push("is_favorite = ?");
      values.push(patch.isFavorite ? 1 : 0);
    }

    if (patch.sortOrder !== undefined) {
      assignments.push("sort_order = ?");
      values.push(patch.sortOrder);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, id);

    this.connection.sqlite
      .prepare(
        `update containers
         set ${assignments.join(", ")}
         where id = ?
           and deleted_at is null`
      )
      .run(...values);

    const updated = this.getById(id);

    if (updated === null) {
      throw new Error(`Container row was not found: ${id}.`);
    }

    return updated;
  }

  archive(id: string, timestamp: string): ContainerRecord {
    this.connection.sqlite
      .prepare(
        `update containers
         set status = 'archived',
             archived_at = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, timestamp, id);

    const archived = this.getById(id);

    if (archived === null) {
      throw new Error(`Container row was not found: ${id}.`);
    }

    return archived;
  }

  softDelete(id: string, timestamp: string): ContainerRecord {
    this.connection.sqlite
      .prepare(
        `update containers
         set deleted_at = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, timestamp, id);

    const deleted = this.connection.sqlite
      .prepare<[string], ContainerRow>(
        `select *
         from containers
         where id = ?`
      )
      .get(id);

    if (deleted === undefined) {
      throw new Error(`Container row was not found: ${id}.`);
    }

    return toContainerRecord(deleted);
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
