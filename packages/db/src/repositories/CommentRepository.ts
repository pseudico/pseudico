import type { DatabaseConnection } from "../connection/createDatabaseConnection";

export type CommentTargetType = "container" | "item" | "list_item";

export type CommentRecord = {
  id: string;
  workspaceId: string;
  targetType: CommentTargetType;
  targetId: string;
  body: string;
  authorLabel: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

export type CreateCommentInput = {
  id: string;
  workspaceId: string;
  targetType: CommentTargetType;
  targetId: string;
  body: string;
  timestamp: string;
  authorLabel?: string | null;
  sortOrder?: number;
};

export type UpdateCommentPatch = {
  body: string;
  timestamp: string;
  authorLabel?: string | null;
};

export type ListCommentsForTargetInput = {
  workspaceId: string;
  targetType: CommentTargetType;
  targetId: string;
  includeDeleted?: boolean;
  limit?: number;
};

type CommentRow = {
  id: string;
  workspace_id: string;
  target_type: string;
  target_id: string;
  body: string;
  author_label: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export class CommentRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string, options: { includeDeleted?: boolean } = {}): CommentRecord | null {
    const deletedFilter = options.includeDeleted === true ? "" : "and deleted_at is null";
    const row = this.connection.sqlite
      .prepare<[string], CommentRow>(
        `select *
         from comments
         where id = ?
           ${deletedFilter}
         limit 1`
      )
      .get(id);

    return row === undefined ? null : toCommentRecord(row);
  }

  create(input: CreateCommentInput): CommentRecord {
    this.connection.sqlite
      .prepare(
        `insert into comments (
          id,
          workspace_id,
          target_type,
          target_id,
          body,
          author_label,
          sort_order,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.targetType,
        input.targetId,
        input.body,
        input.authorLabel ?? null,
        input.sortOrder ?? this.getNextSortOrder(input),
        input.timestamp,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Comment row was not created: ${input.id}.`);
    }

    return created;
  }

  update(id: string, patch: UpdateCommentPatch): CommentRecord {
    const assignments = ["body = ?", "updated_at = ?", "edited_at = ?"];
    const values: unknown[] = [patch.body, patch.timestamp, patch.timestamp];

    if (patch.authorLabel !== undefined) {
      assignments.push("author_label = ?");
      values.push(patch.authorLabel);
    }

    values.push(id);

    this.connection.sqlite
      .prepare(
        `update comments
         set ${assignments.join(", ")}
         where id = ?
           and deleted_at is null`
      )
      .run(...values);

    const updated = this.getById(id);

    if (updated === null) {
      throw new Error(`Comment row was not found: ${id}.`);
    }

    return updated;
  }

  softDelete(id: string, timestamp: string): CommentRecord {
    this.connection.sqlite
      .prepare(
        `update comments
         set deleted_at = ?,
             updated_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, timestamp, id);

    const deleted = this.getById(id, { includeDeleted: true });

    if (deleted === null) {
      throw new Error(`Comment row was not found: ${id}.`);
    }

    return deleted;
  }

  listForTarget(input: ListCommentsForTargetInput): CommentRecord[] {
    const where = ["workspace_id = ?", "target_type = ?", "target_id = ?"];
    const values: unknown[] = [input.workspaceId, input.targetType, input.targetId];

    if (input.includeDeleted !== true) {
      where.push("deleted_at is null");
    }

    values.push(normalizeLimit(input.limit));

    const rows = this.connection.sqlite
      .prepare<unknown[], CommentRow>(
        `select *
         from comments
         where ${where.join(" and ")}
         order by sort_order asc, created_at asc, id asc
         limit ?`
      )
      .all(...values);

    return rows.map(toCommentRecord);
  }

  listByWorkspace(workspaceId: string, options: { includeDeleted?: boolean } = {}): CommentRecord[] {
    const deletedFilter = options.includeDeleted === true ? "" : "and deleted_at is null";
    const rows = this.connection.sqlite
      .prepare<[string], CommentRow>(
        `select *
         from comments
         where workspace_id = ?
           ${deletedFilter}
         order by target_type asc, target_id asc, sort_order asc, created_at asc`
      )
      .all(workspaceId);

    return rows.map(toCommentRecord);
  }

  getLatestForTarget(input: Omit<ListCommentsForTargetInput, "limit">): CommentRecord | null {
    return this.listForTarget({ ...input, limit: 1 }).at(-1) ?? null;
  }

  countForTarget(input: Omit<ListCommentsForTargetInput, "limit">): number {
    const deletedFilter = input.includeDeleted === true ? "" : "and deleted_at is null";
    const row = this.connection.sqlite
      .prepare<[string, string, string], { count: number }>(
        `select count(*) as count
         from comments
         where workspace_id = ?
           and target_type = ?
           and target_id = ?
           ${deletedFilter}`
      )
      .get(input.workspaceId, input.targetType, input.targetId);

    return row?.count ?? 0;
  }

  getNextSortOrder(input: {
    workspaceId: string;
    targetType: CommentTargetType;
    targetId: string;
  }): number {
    const row = this.connection.sqlite
      .prepare<[string, string, string], { max_sort_order: number | null }>(
        `select max(sort_order) as max_sort_order
         from comments
         where workspace_id = ?
           and target_type = ?
           and target_id = ?
           and deleted_at is null`
      )
      .get(input.workspaceId, input.targetType, input.targetId);

    return (row?.max_sort_order ?? 0) + 1024;
  }
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return 100;
  }

  return Math.min(Math.floor(limit), 500);
}

function toCommentRecord(row: CommentRow): CommentRecord {
  if (!isCommentTargetType(row.target_type)) {
    throw new Error(`Unsupported comment target type: ${row.target_type}.`);
  }

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    targetType: row.target_type,
    targetId: row.target_id,
    body: row.body,
    authorLabel: row.author_label,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at
  };
}

function isCommentTargetType(value: string): value is CommentTargetType {
  return value === "container" || value === "item" || value === "list_item";
}
