import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type ItemRow = {
  id: string;
  workspace_id: string;
  container_id: string;
  container_tab_id: string | null;
  type: string;
  title: string;
  body: string | null;
  category_id: string | null;
  status: string;
  sort_order: number;
  pinned: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
};

export type ItemRecord = {
  id: string;
  workspaceId: string;
  containerId: string;
  containerTabId: string | null;
  type: string;
  title: string;
  body: string | null;
  categoryId: string | null;
  status: string;
  sortOrder: number;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type CreateItemInput = {
  id: string;
  workspaceId: string;
  containerId: string;
  type: "task" | "list" | "note" | "file" | "link" | "heading" | "location" | "comment";
  title: string;
  timestamp: string;
  containerTabId?: string | null;
  body?: string | null;
  categoryId?: string | null;
  status?: string;
  sortOrder?: number;
  pinned?: boolean;
};

export type ListItemsFilter = {
  type?: string;
  status?: string;
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export type UpdateItemPatch = {
  title?: string;
  body?: string | null;
  categoryId?: string | null;
  status?: string;
  sortOrder?: number;
  pinned?: boolean;
  completedAt?: string | null;
  containerTabId?: string | null;
  timestamp: string;
};

export type MoveItemInput = {
  id: string;
  targetContainerId: string;
  timestamp: string;
  targetTabId?: string | null;
};

export class ItemRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string): ItemRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ItemRow>(
        `select *
         from items
         where id = ?
           and deleted_at is null`
      )
      .get(id);

    return row === undefined ? null : toItemRecord(row);
  }

  listByContainer(
    containerId: string,
    filters: ListItemsFilter = {}
  ): ItemRecord[] {
    const where = ["container_id = ?"];
    const values: unknown[] = [containerId];

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
      .prepare<unknown[], ItemRow>(
        `select *
         from items
         where ${where.join(" and ")}
         order by pinned desc, sort_order asc, created_at asc`
      )
      .all(...values);

    return rows.map(toItemRecord);
  }

  create(input: CreateItemInput): ItemRecord {
    this.connection.sqlite
      .prepare(
        `insert into items (
          id,
          workspace_id,
          container_id,
          container_tab_id,
          type,
          title,
          body,
          category_id,
          status,
          sort_order,
          pinned,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.containerId,
        input.containerTabId ?? null,
        input.type,
        input.title,
        input.body ?? null,
        input.categoryId ?? null,
        input.status ?? "active",
        input.sortOrder ?? 0,
        input.pinned === true ? 1 : 0,
        input.timestamp,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Item row was not created: ${input.id}.`);
    }

    return created;
  }

  update(id: string, patch: UpdateItemPatch): ItemRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.title !== undefined) {
      assignments.push("title = ?");
      values.push(patch.title);
    }

    if (patch.body !== undefined) {
      assignments.push("body = ?");
      values.push(patch.body);
    }

    if (patch.categoryId !== undefined) {
      assignments.push("category_id = ?");
      values.push(patch.categoryId);
    }

    if (patch.status !== undefined) {
      assignments.push("status = ?");
      values.push(patch.status);
    }

    if (patch.sortOrder !== undefined) {
      assignments.push("sort_order = ?");
      values.push(patch.sortOrder);
    }

    if (patch.pinned !== undefined) {
      assignments.push("pinned = ?");
      values.push(patch.pinned ? 1 : 0);
    }

    if (patch.completedAt !== undefined) {
      assignments.push("completed_at = ?");
      values.push(patch.completedAt);
    }

    if (patch.containerTabId !== undefined) {
      assignments.push("container_tab_id = ?");
      values.push(patch.containerTabId);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, id);

    this.connection.sqlite
      .prepare(
        `update items
         set ${assignments.join(", ")}
         where id = ?
           and deleted_at is null`
      )
      .run(...values);

    const updated = this.getById(id);

    if (updated === null) {
      throw new Error(`Item row was not found: ${id}.`);
    }

    return updated;
  }

  move(input: MoveItemInput): ItemRecord {
    this.connection.sqlite
      .prepare(
        `update items
         set container_id = ?,
             container_tab_id = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(
        input.targetContainerId,
        input.targetTabId ?? null,
        input.timestamp,
        input.id
      );

    const moved = this.getById(input.id);

    if (moved === null) {
      throw new Error(`Item row was not found: ${input.id}.`);
    }

    return moved;
  }

  archive(id: string, timestamp: string): ItemRecord {
    this.connection.sqlite
      .prepare(
        `update items
         set status = 'archived',
             archived_at = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, timestamp, id);

    const archived = this.getById(id);

    if (archived === null) {
      throw new Error(`Item row was not found: ${id}.`);
    }

    return archived;
  }

  softDelete(id: string, timestamp: string): ItemRecord {
    this.connection.sqlite
      .prepare(
        `update items
         set deleted_at = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, timestamp, id);

    const deleted = this.connection.sqlite
      .prepare<[string], ItemRow>(
        `select *
         from items
         where id = ?`
      )
      .get(id);

    if (deleted === undefined) {
      throw new Error(`Item row was not found: ${id}.`);
    }

    return toItemRecord(deleted);
  }
}

function toItemRecord(row: ItemRow): ItemRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    containerId: row.container_id,
    containerTabId: row.container_tab_id,
    type: row.type,
    title: row.title,
    body: row.body,
    categoryId: row.category_id,
    status: row.status,
    sortOrder: row.sort_order,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at
  };
}
