import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import type { ContainerRecord } from "./ContainerRepository";
import type { TaggedTargetRecord } from "./TagRepository";

export type ProjectTagBrowserStatus = "active" | "waiting" | "completed" | "archived";

export type ProjectTagBrowserFilterInput = {
  workspaceId: string;
  tagSlugs?: readonly string[];
  categoryId?: string | null;
  status?: ProjectTagBrowserStatus | null;
};

type ProjectTagBrowserTagRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  project_count: number;
};

type ProjectTagBrowserCategoryRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  project_count: number;
};

type ProjectTagBrowserStatusRow = {
  status: string;
  project_count: number;
};

type ProjectTagBrowserProjectRow = {
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
  category_name: string | null;
  category_slug: string | null;
  category_color: string | null;
};

export type ProjectTagFacetRecord = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  projectCount: number;
};

export type ProjectCategoryFacetRecord = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  projectCount: number;
};

export type ProjectStatusFacetRecord = {
  status: ProjectTagBrowserStatus;
  projectCount: number;
};

export type ProjectTagBrowserCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

export type ProjectTagBrowserProjectRecord = ContainerRecord & {
  category: ProjectTagBrowserCategoryRecord | null;
  tags: TaggedTargetRecord[];
};

export class ProjectTagBrowserRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  listTagFacets(input: ProjectTagBrowserFilterInput): ProjectTagFacetRecord[] {
    const projectFilter = buildProjectFilter(input, "p");
    const rows = this.connection.sqlite
      .prepare<unknown[], ProjectTagBrowserTagRow>(
        `select
           t.id,
           t.workspace_id,
           t.name,
           t.slug,
           t.created_at,
           t.updated_at,
           t.deleted_at,
           count(distinct p.id) as project_count
         from tags t
         join taggings tg on tg.tag_id = t.id
           and tg.workspace_id = t.workspace_id
           and tg.target_type = 'container'
           and tg.deleted_at is null
         join containers p on p.id = tg.target_id
         where t.workspace_id = ?
           and t.deleted_at is null
           and ${projectFilter.sql}
         group by t.id
         having project_count > 0
         order by project_count desc, t.slug asc`
      )
      .all(input.workspaceId, ...projectFilter.values);

    return rows.map(toProjectTagFacetRecord);
  }

  listCategoryFacets(
    input: ProjectTagBrowserFilterInput
  ): ProjectCategoryFacetRecord[] {
    const projectFilter = buildProjectFilter(
      { ...input, categoryId: null },
      "p"
    );
    const rows = this.connection.sqlite
      .prepare<unknown[], ProjectTagBrowserCategoryRow>(
        `select
           c.id,
           c.workspace_id,
           c.name,
           c.slug,
           c.color,
           c.description,
           c.created_at,
           c.updated_at,
           c.deleted_at,
           count(distinct p.id) as project_count
         from categories c
         join containers p on p.category_id = c.id
         where c.workspace_id = ?
           and c.deleted_at is null
           and ${projectFilter.sql}
         group by c.id
         having project_count > 0
         order by c.name collate nocase asc, c.created_at asc`
      )
      .all(input.workspaceId, ...projectFilter.values);

    return rows.map(toProjectCategoryFacetRecord);
  }

  listStatusFacets(input: ProjectTagBrowserFilterInput): ProjectStatusFacetRecord[] {
    const projectFilter = buildProjectFilter({ ...input, status: null }, "p", {
      includeArchivedWhenNoStatus: true
    });
    const rows = this.connection.sqlite
      .prepare<unknown[], ProjectTagBrowserStatusRow>(
        `select p.status, count(distinct p.id) as project_count
         from containers p
         where ${projectFilter.sql}
         group by p.status
         order by case p.status
           when 'active' then 1
           when 'waiting' then 2
           when 'completed' then 3
           when 'archived' then 4
           else 5
         end`
      )
      .all(...projectFilter.values);

    return rows.map((row) => ({
      status: row.status as ProjectTagBrowserStatus,
      projectCount: row.project_count
    }));
  }

  listProjects(input: ProjectTagBrowserFilterInput): ProjectTagBrowserProjectRecord[] {
    const projectFilter = buildProjectFilter(input, "p");
    const rows = this.connection.sqlite
      .prepare<unknown[], ProjectTagBrowserProjectRow>(
        `select
           p.*,
           c.name as category_name,
           c.slug as category_slug,
           c.color as category_color
         from containers p
         left join categories c on c.id = p.category_id
           and c.deleted_at is null
         where ${projectFilter.sql}
         order by p.sort_order asc, p.name collate nocase asc, p.created_at asc`
      )
      .all(...projectFilter.values);

    return rows.map((row) => ({
      ...toContainerRecord(row),
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
      tags: this.listTagsForProject(row.workspace_id, row.id)
    }));
  }

  private listTagsForProject(
    workspaceId: string,
    projectId: string
  ): TaggedTargetRecord[] {
    const rows = this.connection.sqlite
      .prepare<
        [string, string],
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
         join tags t on t.id = tg.tag_id
         where tg.workspace_id = ?
           and tg.target_type = 'container'
           and tg.target_id = ?
           and tg.deleted_at is null
           and t.deleted_at is null
         order by t.slug asc`
      )
      .all(workspaceId, projectId);

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

function buildProjectFilter(
  input: ProjectTagBrowserFilterInput,
  alias: string,
  options: { includeArchivedWhenNoStatus?: boolean } = {}
): { sql: string; values: unknown[] } {
  const where = [
    `${alias}.workspace_id = ?`,
    `${alias}.type = 'project'`,
    `${alias}.deleted_at is null`
  ];
  const values: unknown[] = [input.workspaceId];

  if (input.status !== undefined && input.status !== null) {
    where.push(`${alias}.status = ?`);
    values.push(input.status);
  } else if (options.includeArchivedWhenNoStatus !== true) {
    where.push(`${alias}.archived_at is null`);
  }

  if (input.categoryId !== undefined && input.categoryId !== null) {
    where.push(`${alias}.category_id = ?`);
    values.push(input.categoryId);
  }

  for (const tagSlug of input.tagSlugs ?? []) {
    where.push(
      `exists (
         select 1
         from taggings selected_tg
         join tags selected_tag on selected_tag.id = selected_tg.tag_id
           and selected_tag.deleted_at is null
         where selected_tg.workspace_id = ${alias}.workspace_id
           and selected_tg.target_type = 'container'
           and selected_tg.target_id = ${alias}.id
           and selected_tg.deleted_at is null
           and selected_tag.slug = ?
       )`
    );
    values.push(tagSlug);
  }

  return { sql: where.join(" and "), values };
}

function toProjectTagFacetRecord(
  row: ProjectTagBrowserTagRow
): ProjectTagFacetRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    projectCount: row.project_count
  };
}

function toProjectCategoryFacetRecord(
  row: ProjectTagBrowserCategoryRow
): ProjectCategoryFacetRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    projectCount: row.project_count
  };
}

function toContainerRecord(row: ProjectTagBrowserProjectRow): ContainerRecord {
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
