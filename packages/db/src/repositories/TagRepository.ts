import type { TaggingSource, TaggingTargetType } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type TagRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type TaggingRow = {
  id: string;
  workspace_id: string;
  tag_id: string;
  target_type: string;
  target_id: string;
  source: string;
  created_at: string;
  deleted_at: string | null;
};

type TaggedTargetRow = TagRow & {
  tagging_id: string;
  tagging_source: string;
  tagging_created_at: string;
  tagging_deleted_at: string | null;
};

export type TagRecord = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TaggingRecord = {
  id: string;
  workspaceId: string;
  tagId: string;
  targetType: TaggingTargetType;
  targetId: string;
  source: TaggingSource;
  createdAt: string;
  deletedAt: string | null;
};

export type TaggedTargetRecord = TagRecord & {
  taggingId: string;
  taggingSource: TaggingSource;
  taggingCreatedAt: string;
  taggingDeletedAt: string | null;
};

export type CreateTagInput = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  timestamp: string;
};

export type CreateTaggingInput = {
  id: string;
  workspaceId: string;
  tagId: string;
  targetType: TaggingTargetType;
  targetId: string;
  source: TaggingSource;
  timestamp: string;
};

export type TaggingTargetInput = {
  workspaceId: string;
  targetType: TaggingTargetType;
  targetId: string;
};

export type ListTaggingsForTargetInput = TaggingTargetInput & {
  source?: TaggingSource;
  includeDeleted?: boolean;
};

export class TagRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string): TagRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], TagRow>(
        `select *
         from tags
         where id = ?
           and deleted_at is null`
      )
      .get(id);

    return row === undefined ? null : toTagRecord(row);
  }

  findBySlug(input: {
    workspaceId: string;
    slug: string;
    includeDeleted?: boolean;
  }): TagRecord | null {
    const deletedFilter =
      input.includeDeleted === true ? "" : "and deleted_at is null";
    const row = this.connection.sqlite
      .prepare<[string, string], TagRow>(
        `select *
         from tags
         where workspace_id = ?
           and slug = ?
           ${deletedFilter}
         limit 1`
      )
      .get(input.workspaceId, input.slug);

    return row === undefined ? null : toTagRecord(row);
  }

  listByWorkspace(
    workspaceId: string,
    filters: { includeDeleted?: boolean } = {}
  ): TagRecord[] {
    const deletedFilter =
      filters.includeDeleted === true ? "" : "and deleted_at is null";
    const rows = this.connection.sqlite
      .prepare<[string], TagRow>(
        `select *
         from tags
         where workspace_id = ?
           ${deletedFilter}
         order by slug asc`
      )
      .all(workspaceId);

    return rows.map(toTagRecord);
  }

  create(input: CreateTagInput): TagRecord {
    this.connection.sqlite
      .prepare(
        `insert into tags (
          id,
          workspace_id,
          name,
          slug,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.name,
        input.slug,
        input.timestamp,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Tag row was not created: ${input.id}.`);
    }

    return created;
  }

  restoreTag(id: string, timestamp: string): TagRecord {
    this.connection.sqlite
      .prepare(
        `update tags
         set deleted_at = null,
             updated_at = ?
         where id = ?`
      )
      .run(timestamp, id);

    const restored = this.getById(id);

    if (restored === null) {
      throw new Error(`Tag row was not restored: ${id}.`);
    }

    return restored;
  }

  listTagsForTarget(input: ListTaggingsForTargetInput): TaggedTargetRecord[] {
    const where = [
      "tg.workspace_id = ?",
      "tg.target_type = ?",
      "tg.target_id = ?",
      "t.deleted_at is null"
    ];
    const values: unknown[] = [
      input.workspaceId,
      input.targetType,
      input.targetId
    ];

    if (input.source !== undefined) {
      where.push("tg.source = ?");
      values.push(input.source);
    }

    if (input.includeDeleted !== true) {
      where.push("tg.deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], TaggedTargetRow>(
        `select
           t.*,
           tg.id as tagging_id,
           tg.source as tagging_source,
           tg.created_at as tagging_created_at,
           tg.deleted_at as tagging_deleted_at
         from taggings tg
         join tags t on t.id = tg.tag_id
         where ${where.join(" and ")}
         order by t.slug asc`
      )
      .all(...values);

    return rows.map(toTaggedTargetRecord);
  }

  listTaggingsForTarget(input: ListTaggingsForTargetInput): TaggingRecord[] {
    const where = [
      "workspace_id = ?",
      "target_type = ?",
      "target_id = ?"
    ];
    const values: unknown[] = [
      input.workspaceId,
      input.targetType,
      input.targetId
    ];

    if (input.source !== undefined) {
      where.push("source = ?");
      values.push(input.source);
    }

    if (input.includeDeleted !== true) {
      where.push("deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], TaggingRow>(
        `select *
         from taggings
         where ${where.join(" and ")}
         order by created_at asc`
      )
      .all(...values);

    return rows.map(toTaggingRecord);
  }

  findActiveTagging(input: {
    workspaceId: string;
    tagId: string;
    targetType: TaggingTargetType;
    targetId: string;
  }): TaggingRecord | null {
    const row = this.connection.sqlite
      .prepare<[string, string, string, string], TaggingRow>(
        `select *
         from taggings
         where workspace_id = ?
           and tag_id = ?
           and target_type = ?
           and target_id = ?
           and deleted_at is null
         limit 1`
      )
      .get(input.workspaceId, input.tagId, input.targetType, input.targetId);

    return row === undefined ? null : toTaggingRecord(row);
  }

  createTagging(input: CreateTaggingInput): TaggingRecord {
    const existing = this.findActiveTagging(input);

    if (existing !== null) {
      return existing;
    }

    this.connection.sqlite
      .prepare(
        `insert into taggings (
          id,
          workspace_id,
          tag_id,
          target_type,
          target_id,
          source,
          created_at
        ) values (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.tagId,
        input.targetType,
        input.targetId,
        input.source,
        input.timestamp
      );

    const created = this.findActiveTagging(input);

    if (created === null) {
      throw new Error(`Tagging row was not created: ${input.tagId}.`);
    }

    return created;
  }

  softDeleteTagging(id: string, timestamp: string): TaggingRecord {
    this.connection.sqlite
      .prepare(
        `update taggings
         set deleted_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, id);

    const deleted = this.connection.sqlite
      .prepare<[string], TaggingRow>(
        `select *
         from taggings
         where id = ?`
      )
      .get(id);

    if (deleted === undefined) {
      throw new Error(`Tagging row was not found: ${id}.`);
    }

    return toTaggingRecord(deleted);
  }
}

function toTagRecord(row: TagRow): TagRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function toTaggingRecord(row: TaggingRow): TaggingRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    tagId: row.tag_id,
    targetType: row.target_type as TaggingTargetType,
    targetId: row.target_id,
    source: row.source as TaggingSource,
    createdAt: row.created_at,
    deletedAt: row.deleted_at
  };
}

function toTaggedTargetRecord(row: TaggedTargetRow): TaggedTargetRecord {
  return {
    ...toTagRecord(row),
    taggingId: row.tagging_id,
    taggingSource: row.tagging_source as TaggingSource,
    taggingCreatedAt: row.tagging_created_at,
    taggingDeletedAt: row.tagging_deleted_at
  };
}
