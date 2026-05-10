import type { ContactFieldType } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import type { ContainerRecord } from "./ContainerRepository";
import type { TaggedTargetRecord } from "./TagRepository";

export type ContainerGroupingContainerType = "project" | "contact";

export type ContainerGroupingInput = {
  workspaceId: string;
  containerType: ContainerGroupingContainerType;
  includeArchived?: boolean;
};

type ContainerGroupingRow = {
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

type TaggedTargetRow = {
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
  target_id: string;
};

type ContactFieldRow = {
  id: string;
  workspace_id: string;
  container_id: string;
  label: string;
  value: string;
  type: ContactFieldType;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ContainerGroupingCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

export type ContainerGroupingContactFieldRecord = {
  id: string;
  workspaceId: string;
  containerId: string;
  label: string;
  labelKey: string;
  value: string;
  valueKey: string;
  type: ContactFieldType;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ContainerGroupingTargetRecord = ContainerRecord & {
  category: ContainerGroupingCategoryRecord | null;
  tags: TaggedTargetRecord[];
  contactFields: ContainerGroupingContactFieldRecord[];
};

export class ContainerGroupingRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  listTargets(input: ContainerGroupingInput): ContainerGroupingTargetRecord[] {
    const where = ["c.workspace_id = ?", "c.type = ?", "c.deleted_at is null"];
    const values: unknown[] = [input.workspaceId, input.containerType];

    if (input.includeArchived !== true) {
      where.push("c.archived_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], ContainerGroupingRow>(
        `select
           c.*,
           cat.name as category_name,
           cat.slug as category_slug,
           cat.color as category_color
         from containers c
         left join categories cat on cat.id = c.category_id
           and cat.deleted_at is null
         where ${where.join(" and ")}
         order by c.sort_order asc, c.name collate nocase asc, c.created_at asc, c.id asc`
      )
      .all(...values);

    const targetIds = rows.map((row) => row.id);
    const tagsByTarget = this.listTagsForTargets(input.workspaceId, targetIds);
    const fieldsByTarget =
      input.containerType === "contact"
        ? this.listContactFieldsForTargets(input.workspaceId, targetIds)
        : new Map<string, ContainerGroupingContactFieldRecord[]>();

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
      tags: tagsByTarget.get(row.id) ?? [],
      contactFields: fieldsByTarget.get(row.id) ?? []
    }));
  }

  private listTagsForTargets(
    workspaceId: string,
    targetIds: readonly string[]
  ): Map<string, TaggedTargetRecord[]> {
    if (targetIds.length === 0) {
      return new Map();
    }

    const placeholders = targetIds.map(() => "?").join(", ");
    const rows = this.connection.sqlite
      .prepare<unknown[], TaggedTargetRow>(
        `select
           t.*,
           tg.id as tagging_id,
           tg.source as tagging_source,
           tg.created_at as tagging_created_at,
           tg.deleted_at as tagging_deleted_at,
           tg.target_id
         from taggings tg
         join tags t on t.id = tg.tag_id
           and t.deleted_at is null
         where tg.workspace_id = ?
           and tg.target_type = 'container'
           and tg.target_id in (${placeholders})
           and tg.deleted_at is null
         order by tg.target_id asc, t.slug asc`
      )
      .all(workspaceId, ...targetIds);

    const grouped = new Map<string, TaggedTargetRecord[]>();

    for (const row of rows) {
      const current = grouped.get(row.target_id) ?? [];
      current.push({
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
      });
      grouped.set(row.target_id, current);
    }

    return grouped;
  }

  private listContactFieldsForTargets(
    workspaceId: string,
    targetIds: readonly string[]
  ): Map<string, ContainerGroupingContactFieldRecord[]> {
    if (targetIds.length === 0) {
      return new Map();
    }

    const placeholders = targetIds.map(() => "?").join(", ");
    const rows = this.connection.sqlite
      .prepare<unknown[], ContactFieldRow>(
        `select *
         from contact_fields
         where workspace_id = ?
           and container_id in (${placeholders})
           and deleted_at is null
           and trim(label) <> ''
           and trim(value) <> ''
         order by container_id asc, sort_order asc, created_at asc, id asc`
      )
      .all(workspaceId, ...targetIds);

    const grouped = new Map<string, ContainerGroupingContactFieldRecord[]>();

    for (const row of rows) {
      const current = grouped.get(row.container_id) ?? [];
      current.push({
        id: row.id,
        workspaceId: row.workspace_id,
        containerId: row.container_id,
        label: row.label,
        labelKey: normalizeKey(row.label),
        value: row.value,
        valueKey: normalizeKey(row.value),
        type: row.type,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at
      });
      grouped.set(row.container_id, current);
    }

    return grouped;
  }
}

function toContainerRecord(row: ContainerGroupingRow): ContainerRecord {
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

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
