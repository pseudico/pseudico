import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type SearchIndexRow = {
  id: string;
  workspace_id: string;
  target_type: string;
  target_id: string;
  title: string;
  body: string;
  tags: string;
  category: string | null;
  metadata_json: string;
  is_deleted: number;
  updated_at: string;
};

export type SearchIndexRecord = {
  id: string;
  workspaceId: string;
  targetType: string;
  targetId: string;
  title: string;
  body: string;
  tags: string;
  category: string | null;
  metadataJson: string;
  isDeleted: boolean;
  updatedAt: string;
};

export type UpsertSearchIndexInput = {
  id: string;
  workspaceId: string;
  targetType: "workspace" | "container" | "item" | "list_item" | "attachment" | "saved_view" | "dashboard";
  targetId: string;
  timestamp: string;
  title?: string;
  body?: string;
  tags?: string;
  category?: string | null;
  metadataJson?: string;
  isDeleted?: boolean;
};

export type RemoveSearchIndexInput = {
  workspaceId: string;
  targetType: string;
  targetId: string;
};

export type RemoveWorkspaceSearchTargetsInput = {
  workspaceId: string;
  targetTypes: string[];
};

export type SearchIndexOptions = {
  limit?: number;
  targetTypes?: string[];
  includeDeleted?: boolean;
};

export class SearchIndexRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getByTarget(input: RemoveSearchIndexInput): SearchIndexRecord | null {
    const row = this.connection.sqlite
      .prepare<[string, string, string], SearchIndexRow>(
        `select *
         from search_index
         where workspace_id = ?
           and target_type = ?
           and target_id = ?
         limit 1`
      )
      .get(input.workspaceId, input.targetType, input.targetId);

    return row === undefined ? null : toSearchIndexRecord(row);
  }

  upsert(input: UpsertSearchIndexInput): SearchIndexRecord {
    this.connection.sqlite
      .prepare(
        `insert into search_index (
          id,
          workspace_id,
          target_type,
          target_id,
          title,
          body,
          tags,
          category,
          metadata_json,
          is_deleted,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(workspace_id, target_type, target_id) do update set
          title = excluded.title,
          body = excluded.body,
          tags = excluded.tags,
          category = excluded.category,
          metadata_json = excluded.metadata_json,
          is_deleted = excluded.is_deleted,
          updated_at = excluded.updated_at`
      )
      .run(
        input.id,
        input.workspaceId,
        input.targetType,
        input.targetId,
        input.title ?? "",
        input.body ?? "",
        input.tags ?? "",
        input.category ?? null,
        input.metadataJson ?? "{}",
        input.isDeleted === true ? 1 : 0,
        input.timestamp
      );

    const record = this.getByTarget(input);

    if (record === null) {
      throw new Error(
        `Search index row was not upserted: ${input.targetType}:${input.targetId}.`
      );
    }

    return record;
  }

  remove(input: RemoveSearchIndexInput): void {
    this.connection.sqlite
      .prepare(
        `delete from search_index
         where workspace_id = ?
           and target_type = ?
           and target_id = ?`
      )
      .run(input.workspaceId, input.targetType, input.targetId);
  }

  removeWorkspaceTargets(input: RemoveWorkspaceSearchTargetsInput): void {
    if (input.targetTypes.length === 0) {
      return;
    }

    const placeholders = input.targetTypes.map(() => "?").join(", ");

    this.connection.sqlite
      .prepare(
        `delete from search_index
         where workspace_id = ?
           and target_type in (${placeholders})`
      )
      .run(input.workspaceId, ...input.targetTypes);
  }

  search(
    workspaceId: string,
    query: string,
    options: SearchIndexOptions = {}
  ): SearchIndexRecord[] {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length === 0) {
      return [];
    }

    const where = [
      "workspace_id = ?",
      "(lower(title) like ? escape '\\' or lower(body) like ? escape '\\' or lower(tags) like ? escape '\\' or lower(coalesce(category, '')) like ? escape '\\')"
    ];
    const pattern = `%${escapeLikePattern(normalizedQuery)}%`;
    const values: unknown[] = [workspaceId, pattern, pattern, pattern, pattern];

    if (options.includeDeleted !== true) {
      where.push("is_deleted = 0");
    }

    if (options.targetTypes !== undefined && options.targetTypes.length > 0) {
      const placeholders = options.targetTypes.map(() => "?").join(", ");
      where.push(`target_type in (${placeholders})`);
      values.push(...options.targetTypes);
    }

    values.push(options.limit ?? 25);

    const rows = this.connection.sqlite
      .prepare<unknown[], SearchIndexRow>(
        `select *
         from search_index
         where ${where.join(" and ")}
         order by updated_at desc, title asc
         limit ?`
      )
      .all(...values);

    return rows.map(toSearchIndexRecord);
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function toSearchIndexRecord(row: SearchIndexRow): SearchIndexRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    targetType: row.target_type,
    targetId: row.target_id,
    title: row.title,
    body: row.body,
    tags: row.tags,
    category: row.category,
    metadataJson: row.metadata_json,
    isDeleted: row.is_deleted === 1,
    updatedAt: row.updated_at
  };
}
