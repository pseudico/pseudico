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
  hidden_at: string | null;
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
  hiddenAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ListContainerTabsOptions = {
  includeHidden?: boolean;
  includeArchived?: boolean;
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

export type UpdateContainerTabPatch = {
  name?: string;
  description?: string | null;
  sortOrder?: number;
  hiddenAt?: string | null;
  archivedAt?: string | null;
  timestamp: string;
};

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

  listByContainer(
    containerId: string,
    options: ListContainerTabsOptions = {}
  ): ContainerTabRecord[] {
    const where = ["container_id = ?", "deleted_at is null"];
    const values: unknown[] = [containerId];

    if (options.includeHidden !== true) {
      where.push("hidden_at is null");
    }

    if (options.includeArchived !== true) {
      where.push("archived_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], ContainerTabRow>(
        `select *
         from container_tabs
         where ${where.join(" and ")}
         order by sort_order asc, created_at asc`
      )
      .all(...values);

    return rows.map(toContainerTabRecord);
  }

  listByWorkspace(workspaceId: string): ContainerTabRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string], ContainerTabRow>(
        `select *
         from container_tabs
         where workspace_id = ?
           and deleted_at is null
         order by container_id asc, sort_order asc, created_at asc, id asc`
      )
      .all(workspaceId);

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

  update(id: string, patch: UpdateContainerTabPatch): ContainerTabRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.name !== undefined) {
      assignments.push("name = ?");
      values.push(patch.name);
    }

    if (patch.description !== undefined) {
      assignments.push("description = ?");
      values.push(patch.description);
    }

    if (patch.sortOrder !== undefined) {
      assignments.push("sort_order = ?");
      values.push(patch.sortOrder);
    }

    if (patch.hiddenAt !== undefined) {
      assignments.push("hidden_at = ?");
      values.push(patch.hiddenAt);
    }

    if (patch.archivedAt !== undefined) {
      assignments.push("archived_at = ?");
      values.push(patch.archivedAt);
    }

    if (assignments.length === 0) {
      const current = this.getById(id);

      if (current === null) {
        throw new Error(`Container tab row was not found: ${id}.`);
      }

      return current;
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, id);

    this.connection.sqlite
      .prepare(
        `update container_tabs
         set ${assignments.join(", ")}
         where id = ?
           and deleted_at is null`
      )
      .run(...values);

    const updated = this.getById(id);

    if (updated === null) {
      throw new Error(`Container tab row was not found: ${id}.`);
    }

    return updated;
  }

  softDelete(id: string, timestamp: string): ContainerTabRecord {
    this.connection.sqlite
      .prepare(
        `update container_tabs
         set deleted_at = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, timestamp, id);

    const deleted = this.connection.sqlite
      .prepare<[string], ContainerTabRow>(
        `select *
         from container_tabs
         where id = ?`
      )
      .get(id);

    if (deleted === undefined) {
      throw new Error(`Container tab row was not found: ${id}.`);
    }

    return toContainerTabRecord(deleted);
  }

  countActiveByContainer(containerId: string): number {
    const row = this.connection.sqlite
      .prepare<[string], { count: number }>(
        `select count(*) as count
         from container_tabs
         where container_id = ?
           and archived_at is null
           and deleted_at is null`
      )
      .get(containerId);

    return row?.count ?? 0;
  }

  countVisibleByContainer(containerId: string): number {
    const row = this.connection.sqlite
      .prepare<[string], { count: number }>(
        `select count(*) as count
         from container_tabs
         where container_id = ?
           and hidden_at is null
           and archived_at is null
           and deleted_at is null`
      )
      .get(containerId);

    return row?.count ?? 0;
  }

  hide(id: string, timestamp: string): ContainerTabRecord {
    return this.update(id, { hiddenAt: timestamp, timestamp });
  }

  show(id: string, timestamp: string): ContainerTabRecord {
    return this.update(id, { hiddenAt: null, timestamp });
  }

  archive(id: string, timestamp: string): ContainerTabRecord {
    return this.update(id, {
      archivedAt: timestamp,
      hiddenAt: timestamp,
      timestamp
    });
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
    hiddenAt: row.hidden_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at
  };
}
