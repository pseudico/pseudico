import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type SavedViewRow = {
  id: string;
  workspace_id: string;
  type: string;
  name: string;
  description: string | null;
  query_json: string;
  display_json: string;
  is_favorite: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type SavedViewEvaluationRow = {
  workspace_id: string;
  target_type: "container" | "item";
  target_id: string;
  kind: string;
  title: string;
  body: string | null;
  status: string;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  container_id: string;
  container_type: string;
  container_title: string;
  task_status: string | null;
  due_at: string | null;
  start_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
  tag_slugs: string | null;
};

export type SavedViewRecord = {
  id: string;
  workspaceId: string;
  type: SavedViewType;
  name: string;
  description: string | null;
  queryJson: string;
  displayJson: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SavedViewType =
  | "collection"
  | "smart_list"
  | "dashboard_widget"
  | "search";

export type CreateSavedViewInput = {
  id: string;
  workspaceId: string;
  type: SavedViewType;
  name: string;
  queryJson: string;
  timestamp: string;
  description?: string | null;
  displayJson?: string;
  isFavorite?: boolean;
};

export type UpdateSavedViewPatch = {
  timestamp: string;
  name?: string;
  description?: string | null;
  queryJson?: string;
  displayJson?: string;
  isFavorite?: boolean;
};

export type SavedViewEvaluationTargetRecord = {
  workspaceId: string;
  targetType: "container" | "item";
  targetId: string;
  kind: string;
  title: string;
  body: string | null;
  status: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  containerId: string;
  containerType: string;
  containerTitle: string;
  taskStatus: string | null;
  dueAt: string | null;
  startAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
  tagSlugs: string[];
};

export type ListSavedViewsFilter = {
  type?: SavedViewType;
  includeDeleted?: boolean;
};

export class SavedViewRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string, filters: { includeDeleted?: boolean } = {}): SavedViewRecord | null {
    const deletedFilter =
      filters.includeDeleted === true ? "" : "and deleted_at is null";
    const row = this.connection.sqlite
      .prepare<[string], SavedViewRow>(
        `select *
         from saved_views
         where id = ?
           ${deletedFilter}
         limit 1`
      )
      .get(id);

    return row === undefined ? null : toSavedViewRecord(row);
  }

  listByWorkspace(
    workspaceId: string,
    filters: ListSavedViewsFilter = {}
  ): SavedViewRecord[] {
    const where = ["workspace_id = ?"];
    const values: unknown[] = [workspaceId];

    if (filters.type !== undefined) {
      where.push("type = ?");
      values.push(filters.type);
    }

    if (filters.includeDeleted !== true) {
      where.push("deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], SavedViewRow>(
        `select *
         from saved_views
         where ${where.join(" and ")}
         order by is_favorite desc, name collate nocase asc, created_at asc`
      )
      .all(...values);

    return rows.map(toSavedViewRecord);
  }

  create(input: CreateSavedViewInput): SavedViewRecord {
    this.connection.sqlite
      .prepare(
        `insert into saved_views (
          id,
          workspace_id,
          type,
          name,
          description,
          query_json,
          display_json,
          is_favorite,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.type,
        input.name,
        input.description ?? null,
        input.queryJson,
        input.displayJson ?? "{}",
        input.isFavorite === true ? 1 : 0,
        input.timestamp,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Saved view row was not created: ${input.id}.`);
    }

    return created;
  }

  update(id: string, patch: UpdateSavedViewPatch): SavedViewRecord {
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

    if (patch.queryJson !== undefined) {
      assignments.push("query_json = ?");
      values.push(patch.queryJson);
    }

    if (patch.displayJson !== undefined) {
      assignments.push("display_json = ?");
      values.push(patch.displayJson);
    }

    if (patch.isFavorite !== undefined) {
      assignments.push("is_favorite = ?");
      values.push(patch.isFavorite ? 1 : 0);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, id);

    this.connection.sqlite
      .prepare(
        `update saved_views
         set ${assignments.join(", ")}
         where id = ?
           and deleted_at is null`
      )
      .run(...values);

    const updated = this.getById(id);

    if (updated === null) {
      throw new Error(`Saved view row was not found: ${id}.`);
    }

    return updated;
  }

  softDelete(id: string, timestamp: string): SavedViewRecord {
    this.connection.sqlite
      .prepare(
        `update saved_views
         set deleted_at = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, timestamp, id);

    const deleted = this.getById(id, { includeDeleted: true });

    if (deleted === null) {
      throw new Error(`Saved view row was not found: ${id}.`);
    }

    return deleted;
  }

  listEvaluationTargets(workspaceId: string): SavedViewEvaluationTargetRecord[] {
    const containers = this.connection.sqlite
      .prepare<[string], SavedViewEvaluationRow>(
        `select
           c.workspace_id,
           'container' as target_type,
           c.id as target_id,
           c.type as kind,
           c.name as title,
           c.description as body,
           c.status,
           c.category_id,
           cat.name as category_name,
           cat.slug as category_slug,
           c.id as container_id,
           c.type as container_type,
           c.name as container_title,
           null as task_status,
           null as due_at,
           null as start_at,
           c.sort_order,
           c.created_at,
           c.updated_at,
           c.archived_at,
           c.deleted_at,
           group_concat(distinct t.slug) as tag_slugs
         from containers c
         left join categories cat on cat.id = c.category_id and cat.deleted_at is null
         left join taggings tg
           on tg.workspace_id = c.workspace_id
          and tg.target_type = 'container'
          and tg.target_id = c.id
          and tg.deleted_at is null
         left join tags t on t.id = tg.tag_id and t.deleted_at is null
         where c.workspace_id = ?
         group by c.id`
      )
      .all(workspaceId);

    const items = this.connection.sqlite
      .prepare<[string], SavedViewEvaluationRow>(
        `select
           i.workspace_id,
           'item' as target_type,
           i.id as target_id,
           i.type as kind,
           i.title,
           i.body,
           i.status,
           i.category_id,
           cat.name as category_name,
           cat.slug as category_slug,
           i.container_id,
           c.type as container_type,
           c.name as container_title,
           td.task_status,
           td.due_at,
           td.start_at,
           i.sort_order,
           i.created_at,
           i.updated_at,
           i.archived_at,
           i.deleted_at,
           group_concat(distinct t.slug) as tag_slugs
         from items i
         inner join containers c on c.id = i.container_id
         left join task_details td on td.item_id = i.id
         left join categories cat on cat.id = i.category_id and cat.deleted_at is null
         left join taggings tg
           on tg.workspace_id = i.workspace_id
          and tg.target_type = 'item'
          and tg.target_id = i.id
          and tg.deleted_at is null
         left join tags t on t.id = tg.tag_id and t.deleted_at is null
         where i.workspace_id = ?
         group by i.id`
      )
      .all(workspaceId);

    return [...containers, ...items].map(toEvaluationTargetRecord);
  }
}

function toSavedViewRecord(row: SavedViewRow): SavedViewRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type as SavedViewType,
    name: row.name,
    description: row.description,
    queryJson: row.query_json,
    displayJson: row.display_json,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function toEvaluationTargetRecord(
  row: SavedViewEvaluationRow
): SavedViewEvaluationTargetRecord {
  return {
    workspaceId: row.workspace_id,
    targetType: row.target_type,
    targetId: row.target_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    status: row.status,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    containerId: row.container_id,
    containerType: row.container_type,
    containerTitle: row.container_title,
    taskStatus: row.task_status,
    dueAt: row.due_at,
    startAt: row.start_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
    tagSlugs: (row.tag_slugs ?? "")
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean)
  };
}
