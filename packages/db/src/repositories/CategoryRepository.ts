import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import type { ContainerRecord } from "./ContainerRepository";
import type { ItemRecord } from "./ItemRepository";

type CategoryRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CategoryRecord = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateCategoryInput = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  color: string;
  timestamp: string;
  description?: string | null;
};

export type UpdateCategoryPatch = {
  name?: string;
  slug?: string;
  color?: string;
  description?: string | null;
  timestamp: string;
};

export type ListCategoriesFilter = {
  includeDeleted?: boolean;
};

export class CategoryRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string, filters: ListCategoriesFilter = {}): CategoryRecord | null {
    const deletedFilter =
      filters.includeDeleted === true ? "" : "and deleted_at is null";
    const row = this.connection.sqlite
      .prepare<[string], CategoryRow>(
        `select *
         from categories
         where id = ?
           ${deletedFilter}`
      )
      .get(id);

    return row === undefined ? null : toCategoryRecord(row);
  }

  findBySlug(input: {
    workspaceId: string;
    slug: string;
    includeDeleted?: boolean;
  }): CategoryRecord | null {
    const deletedFilter =
      input.includeDeleted === true ? "" : "and deleted_at is null";
    const row = this.connection.sqlite
      .prepare<[string, string], CategoryRow>(
        `select *
         from categories
         where workspace_id = ?
           and slug = ?
           ${deletedFilter}
         limit 1`
      )
      .get(input.workspaceId, input.slug);

    return row === undefined ? null : toCategoryRecord(row);
  }

  listByWorkspace(
    workspaceId: string,
    filters: ListCategoriesFilter = {}
  ): CategoryRecord[] {
    const deletedFilter =
      filters.includeDeleted === true ? "" : "and deleted_at is null";
    const rows = this.connection.sqlite
      .prepare<[string], CategoryRow>(
        `select *
         from categories
         where workspace_id = ?
           ${deletedFilter}
         order by name collate nocase asc, created_at asc`
      )
      .all(workspaceId);

    return rows.map(toCategoryRecord);
  }

  create(input: CreateCategoryInput): CategoryRecord {
    this.connection.sqlite
      .prepare(
        `insert into categories (
          id,
          workspace_id,
          name,
          slug,
          color,
          description,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.name,
        input.slug,
        input.color,
        input.description ?? null,
        input.timestamp,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Category row was not created: ${input.id}.`);
    }

    return created;
  }

  update(id: string, patch: UpdateCategoryPatch): CategoryRecord {
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

    if (patch.color !== undefined) {
      assignments.push("color = ?");
      values.push(patch.color);
    }

    if (patch.description !== undefined) {
      assignments.push("description = ?");
      values.push(patch.description);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, id);

    this.connection.sqlite
      .prepare(
        `update categories
         set ${assignments.join(", ")}
         where id = ?
           and deleted_at is null`
      )
      .run(...values);

    const updated = this.getById(id);

    if (updated === null) {
      throw new Error(`Category row was not found: ${id}.`);
    }

    return updated;
  }

  restore(id: string, patch: UpdateCategoryPatch): CategoryRecord {
    this.connection.sqlite
      .prepare(
        `update categories
         set name = coalesce(?, name),
             slug = coalesce(?, slug),
             color = coalesce(?, color),
             description = ?,
             deleted_at = null,
             updated_at = ?
         where id = ?`
      )
      .run(
        patch.name ?? null,
        patch.slug ?? null,
        patch.color ?? null,
        patch.description ?? null,
        patch.timestamp,
        id
      );

    const restored = this.getById(id);

    if (restored === null) {
      throw new Error(`Category row was not restored: ${id}.`);
    }

    return restored;
  }

  softDelete(id: string, timestamp: string): CategoryRecord {
    this.connection.sqlite
      .prepare(
        `update categories
         set deleted_at = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, timestamp, id);

    const deleted = this.getById(id, { includeDeleted: true });

    if (deleted === null) {
      throw new Error(`Category row was not found: ${id}.`);
    }

    return deleted;
  }

  listAssignedContainers(categoryId: string): ContainerRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string], ContainerRow>(
        `select *
         from containers
         where category_id = ?
           and deleted_at is null
         order by sort_order asc, created_at asc`
      )
      .all(categoryId);

    return rows.map(toContainerRecord);
  }

  listAssignedItems(categoryId: string): ItemRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string], ItemRow>(
        `select *
         from items
         where category_id = ?
           and deleted_at is null
         order by container_id asc, sort_order asc, created_at asc`
      )
      .all(categoryId);

    return rows.map(toItemRecord);
  }
}

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

function toCategoryRecord(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
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
