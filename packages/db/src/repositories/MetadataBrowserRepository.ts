import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import type { CategoryRecord } from "./CategoryRepository";
import type { TaggedTargetRecord } from "./TagRepository";

type MetadataCountRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  color?: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  target_count: number;
};

type MetadataTargetRow = {
  target_type: string;
  target_id: string;
  workspace_id: string;
  kind: string;
  title: string;
  body: string | null;
  status: string;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_color: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

export type TagWithTargetCountRecord = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  targetCount: number;
};

export type CategoryWithTargetCountRecord = CategoryRecord & {
  targetCount: number;
};

export type MetadataTargetType = "container" | "item" | "list_item";

export type MetadataTargetCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

export type MetadataTargetRecord = {
  targetType: MetadataTargetType;
  targetId: string;
  workspaceId: string;
  kind: string;
  title: string;
  body: string | null;
  status: string;
  category: MetadataTargetCategoryRecord | null;
  tags: TaggedTargetRecord[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ListMetadataTargetsInput = {
  workspaceId: string;
  categoryId?: string | null;
  categorySlug?: string | null;
  includeArchived?: boolean;
  includeDeleted?: boolean;
  tagSlugs?: readonly string[];
};

export class MetadataBrowserRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  listTagsWithCounts(
    workspaceId: string,
    filters: { includeArchived?: boolean; includeDeleted?: boolean } = {}
  ): TagWithTargetCountRecord[] {
    const activeTargetsSql = createActiveTargetsSql(filters);
    const rows = this.connection.sqlite
      .prepare<[string, string, string, string], MetadataCountRow>(
        `with active_targets as (${activeTargetsSql})
         select
           t.id,
           t.workspace_id,
           t.name,
           t.slug,
           t.created_at,
           t.updated_at,
           t.deleted_at,
           count(distinct active_targets.target_key) as target_count
         from tags t
         left join taggings tg on tg.tag_id = t.id
           and tg.workspace_id = t.workspace_id
           and tg.deleted_at is null
         left join active_targets on active_targets.target_type = tg.target_type
           and active_targets.target_id = tg.target_id
         where t.workspace_id = ?
           and t.deleted_at is null
         group by t.id
         order by t.slug asc`
      )
      .all(workspaceId, workspaceId, workspaceId, workspaceId);

    return rows.map(toTagWithTargetCountRecord);
  }

  listCategoriesWithCounts(
    workspaceId: string,
    filters: { includeArchived?: boolean; includeDeleted?: boolean } = {}
  ): CategoryWithTargetCountRecord[] {
    const activeCategorizedSql = createActiveCategorizedTargetsSql(filters);
    const rows = this.connection.sqlite
      .prepare<[string, string, string], MetadataCountRow>(
        `with active_categorized_targets as (${activeCategorizedSql})
         select
           c.id,
           c.workspace_id,
           c.name,
           c.slug,
           c.color,
           c.description,
           c.created_at,
           c.updated_at,
           c.deleted_at,
           count(distinct active_categorized_targets.target_key) as target_count
         from categories c
         left join active_categorized_targets on
           active_categorized_targets.category_id = c.id
         where c.workspace_id = ?
           and c.deleted_at is null
         group by c.id
         order by c.name collate nocase asc, c.created_at asc`
      )
      .all(workspaceId, workspaceId, workspaceId);

    return rows.map(toCategoryWithTargetCountRecord);
  }

  listTargetsByMetadata(input: ListMetadataTargetsInput): MetadataTargetRecord[] {
    const values: unknown[] = [
      input.workspaceId,
      input.workspaceId,
      input.workspaceId
    ];
    const where: string[] = [];

    if (input.categoryId !== undefined && input.categoryId !== null) {
      where.push("target.category_id = ?");
      values.push(input.categoryId);
    }

    if (input.categorySlug !== undefined && input.categorySlug !== null) {
      where.push("category.slug = ?");
      values.push(input.categorySlug);
    }

    for (const tagSlug of input.tagSlugs ?? []) {
      where.push(
        `exists (
           select 1
           from taggings tg
           inner join tags t on t.id = tg.tag_id
             and t.deleted_at is null
           where tg.workspace_id = target.workspace_id
             and tg.target_type = target.target_type
             and tg.target_id = target.target_id
             and tg.deleted_at is null
             and t.slug = ?
         )`
      );
      values.push(tagSlug);
    }

    const filterSql = where.length === 0 ? "" : `where ${where.join(" and ")}`;
    const targetSql = createTargetsSql({
      ...(input.includeArchived === undefined
        ? {}
        : { includeArchived: input.includeArchived }),
      ...(input.includeDeleted === undefined
        ? {}
        : { includeDeleted: input.includeDeleted })
    });
    const rows = this.connection.sqlite
      .prepare<unknown[], MetadataTargetRow>(
        `select
           target.*,
           category.id as category_id,
           category.name as category_name,
           category.slug as category_slug,
           category.color as category_color
         from (${targetSql}) target
         left join categories category on category.id = target.category_id
           and category.deleted_at is null
         ${filterSql}
         order by target.target_type asc, target.title collate nocase asc`
      )
      .all(...values);

    return rows.map((row) => ({
      ...toMetadataTargetRecord(row),
      tags: this.listTagsForTarget({
        workspaceId: row.workspace_id,
        targetType: row.target_type as MetadataTargetType,
        targetId: row.target_id
      })
    }));
  }

  private listTagsForTarget(input: {
    workspaceId: string;
    targetType: MetadataTargetType;
    targetId: string;
  }): TaggedTargetRecord[] {
    const rows = this.connection.sqlite
      .prepare<
        [string, string, string],
        {
          id: string;
          workspace_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          tagging_id: string;
          tagging_source: string;
          tagging_created_at: string;
          tagging_deleted_at: string | null;
        }
      >(
        `select
           t.*,
           tg.id as tagging_id,
           tg.source as tagging_source,
           tg.created_at as tagging_created_at,
           tg.deleted_at as tagging_deleted_at
         from taggings tg
         inner join tags t on t.id = tg.tag_id
         where tg.workspace_id = ?
           and tg.target_type = ?
           and tg.target_id = ?
           and tg.deleted_at is null
           and t.deleted_at is null
         order by t.slug asc`
      )
      .all(input.workspaceId, input.targetType, input.targetId);

    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      taggingId: row.tagging_id,
      taggingSource: row.tagging_source as TaggedTargetRecord["taggingSource"],
      taggingCreatedAt: row.tagging_created_at,
      taggingDeletedAt: row.tagging_deleted_at
    }));
  }
}

function createActiveTargetsSql(filters: {
  includeArchived?: boolean;
  includeDeleted?: boolean;
}): string {
  return [
    `select
       'container' as target_type,
       id as target_id,
       'container:' || id as target_key
     from containers
     where workspace_id = ?
       ${activeTargetFilter(filters)}`,
    `select
       'item' as target_type,
       id as target_id,
       'item:' || id as target_key
     from items
     where workspace_id = ?
       ${activeTargetFilter(filters)}`,
    `select
       'list_item' as target_type,
       id as target_id,
       'list_item:' || id as target_key
     from list_items
     where workspace_id = ?
       ${activeTargetFilter(filters)}`
  ].join(" union all ");
}

function createActiveCategorizedTargetsSql(filters: {
  includeArchived?: boolean;
  includeDeleted?: boolean;
}): string {
  return [
    `select
       category_id,
       'container:' || id as target_key
     from containers
     where workspace_id = ?
       and category_id is not null
       ${activeTargetFilter(filters)}`,
    `select
       category_id,
       'item:' || id as target_key
     from items
     where workspace_id = ?
       and category_id is not null
       ${activeTargetFilter(filters)}`
  ].join(" union all ");
}

function createTargetsSql(filters: {
  includeArchived?: boolean;
  includeDeleted?: boolean;
}): string {
  const activeFilter = activeTargetFilter(filters);

  return [
    `select
       'container' as target_type,
       id as target_id,
       workspace_id,
       type as kind,
       name as title,
       description as body,
       status,
       category_id,
       created_at,
       updated_at,
       archived_at,
       deleted_at
     from containers
     where workspace_id = ?
       ${activeFilter}`,
    `select
       'item' as target_type,
       id as target_id,
       workspace_id,
       type as kind,
       title,
       body,
       status,
       category_id,
       created_at,
       updated_at,
       archived_at,
       deleted_at
     from items
     where workspace_id = ?
       ${activeFilter}`,
    `select
       'list_item' as target_type,
       id as target_id,
       workspace_id,
       'list_item' as kind,
       title,
       body,
       status,
       null as category_id,
       created_at,
       updated_at,
       archived_at,
       deleted_at
     from list_items
     where workspace_id = ?
       ${activeFilter}`
  ].join(" union all ");
}

function activeTargetFilter(filters: {
  includeArchived?: boolean;
  includeDeleted?: boolean;
}): string {
  return [
    filters.includeArchived === true ? "" : "and archived_at is null",
    filters.includeDeleted === true ? "" : "and deleted_at is null"
  ]
    .filter(Boolean)
    .join("\n       ");
}

function toTagWithTargetCountRecord(
  row: MetadataCountRow
): TagWithTargetCountRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    targetCount: row.target_count
  };
}

function toCategoryWithTargetCountRecord(
  row: MetadataCountRow
): CategoryWithTargetCountRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    color: row.color ?? "#245c55",
    description: row.description ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    targetCount: row.target_count
  };
}

function toMetadataTargetRecord(row: MetadataTargetRow): Omit<MetadataTargetRecord, "tags"> {
  return {
    targetType: row.target_type as MetadataTargetType,
    targetId: row.target_id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    status: row.status,
    category:
      row.category_id === null ||
      row.category_name === null ||
      row.category_slug === null ||
      row.category_color === null
        ? null
        : {
            id: row.category_id,
            name: row.category_name,
            slug: row.category_slug,
            color: row.category_color
          },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at
  };
}
