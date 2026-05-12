import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type ActivityLogRow = {
  id: string;
  workspace_id: string;
  actor_type: string;
  action: string;
  target_type: string;
  target_id: string;
  summary: string | null;
  before_json: string | null;
  after_json: string | null;
  created_at: string;
};

export type ActivityLogRecord = {
  id: string;
  workspaceId: string;
  actorType: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
};

export type CreateActivityLogInput = {
  id: string;
  workspaceId: string;
  actorType: "system" | "local_user" | "importer";
  action: string;
  targetType: string;
  targetId: string;
  summary?: string | null;
  beforeJson?: string | null;
  afterJson?: string | null;
  timestamp: string;
};

export type ActivityLogPageOptions = {
  limit?: number;
  cursor?: string | null;
};

export type ActivityLogPageResult = {
  events: ActivityLogRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};

export class ActivityLogRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string): ActivityLogRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ActivityLogRow>(
        `select *
         from activity_log
         where id = ?
         limit 1`
      )
      .get(id);

    return row === undefined ? null : toActivityLogRecord(row);
  }

  findWorkspaceCreated(workspaceId: string): ActivityLogRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ActivityLogRow>(
        `select *
         from activity_log
         where workspace_id = ?
           and action = 'workspace_created'
           and target_type = 'workspace'
         order by created_at asc
         limit 1`
      )
      .get(workspaceId);

    return row === undefined ? null : toActivityLogRecord(row);
  }

  create(input: CreateActivityLogInput): ActivityLogRecord {
    this.connection.sqlite
      .prepare(
        `insert into activity_log (
          id,
          workspace_id,
          actor_type,
          action,
          target_type,
          target_id,
          summary,
          before_json,
          after_json,
          created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.actorType,
        input.action,
        input.targetType,
        input.targetId,
        input.summary ?? null,
        input.beforeJson ?? null,
        input.afterJson ?? null,
        input.timestamp
      );

    const created = this.connection.sqlite
      .prepare<[string], ActivityLogRow>(
        `select *
         from activity_log
         where id = ?`
      )
      .get(input.id);

    if (created === undefined) {
      throw new Error(`Activity log row was not created: ${input.action}.`);
    }

    return toActivityLogRecord(created);
  }

  listRecent(workspaceId: string, limit = 20): ActivityLogRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string, number], ActivityLogRow>(
        `select *
         from activity_log
         where workspace_id = ?
         order by created_at desc
         limit ?`
      )
      .all(workspaceId, limit);

    return rows.map(toActivityLogRecord);
  }

  listRecentPage(
    workspaceId: string,
    options: ActivityLogPageOptions = {}
  ): ActivityLogPageResult {
    const where = ["workspace_id = ?"];
    const values: unknown[] = [workspaceId];

    applyActivityCursorFilter(where, values, options.cursor);

    const limit = normalizePageLimit(options.limit, 20);
    values.push(limit + 1);

    const rows = this.connection.sqlite
      .prepare<unknown[], ActivityLogRow>(
        `select *
         from activity_log
         where ${where.join(" and ")}
         order by created_at desc, id desc
         limit ?`
      )
      .all(...values);

    return toActivityLogPage(rows, limit);
  }



  listByActionsBetween(input: {
    workspaceId: string;
    actions: string[];
    startInclusive: string;
    endExclusive: string;
  }): ActivityLogRecord[] {
    if (input.actions.length === 0) {
      return [];
    }

    const placeholders = input.actions.map(() => "?").join(", ");
    const rows = this.connection.sqlite
      .prepare<unknown[], ActivityLogRow>(
        `select *
         from activity_log
         where workspace_id = ?
           and action in (${placeholders})
           and created_at >= ?
           and created_at < ?
         order by created_at asc, id asc`
      )
      .all(
        input.workspaceId,
        ...input.actions,
        input.startInclusive,
        input.endExclusive
      );

    return rows.map(toActivityLogRecord);
  }

  listForTarget(
    targetType: string,
    targetId: string,
    limit = 20
  ): ActivityLogRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string, string, number], ActivityLogRow>(
        `select *
         from activity_log
         where target_type = ?
           and target_id = ?
         order by created_at desc
         limit ?`
      )
      .all(targetType, targetId, limit);

    return rows.map(toActivityLogRecord);
  }

  listForTargetPage(
    targetType: string,
    targetId: string,
    options: ActivityLogPageOptions = {}
  ): ActivityLogPageResult {
    const where = ["target_type = ?", "target_id = ?"];
    const values: unknown[] = [targetType, targetId];

    applyActivityCursorFilter(where, values, options.cursor);

    const limit = normalizePageLimit(options.limit, 20);
    values.push(limit + 1);

    const rows = this.connection.sqlite
      .prepare<unknown[], ActivityLogRow>(
        `select *
         from activity_log
         where ${where.join(" and ")}
         order by created_at desc, id desc
         limit ?`
      )
      .all(...values);

    return toActivityLogPage(rows, limit);
  }
}

function normalizePageLimit(limit: number | undefined, defaultLimit: number): number {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return defaultLimit;
  }

  return Math.min(Math.floor(limit), 100);
}

function applyActivityCursorFilter(
  where: string[],
  values: unknown[],
  cursor: string | null | undefined
): void {
  if (cursor === undefined || cursor === null || cursor.trim().length === 0) {
    return;
  }

  const parsed = parseActivityCursor(cursor);

  where.push("(created_at < ? or (created_at = ? and id < ?))");
  values.push(parsed.createdAt, parsed.createdAt, parsed.id);
}

function toActivityLogPage(
  rows: ActivityLogRow[],
  limit: number
): ActivityLogPageResult {
  const pageRows = rows.slice(0, limit);
  const last = pageRows.at(-1);

  return {
    events: pageRows.map(toActivityLogRecord),
    hasMore: rows.length > limit,
    nextCursor:
      rows.length > limit && last !== undefined
        ? createActivityCursor(last)
        : null
  };
}

function createActivityCursor(row: ActivityLogRow): string {
  return [encodeURIComponent(row.created_at), encodeURIComponent(row.id)].join("|");
}

function parseActivityCursor(cursor: string): {
  createdAt: string;
  id: string;
} {
  const [createdAt, id] = cursor.split("|");

  if (createdAt === undefined || id === undefined) {
    throw new Error("Invalid activity pagination cursor.");
  }

  return {
    createdAt: decodeURIComponent(createdAt),
    id: decodeURIComponent(id)
  };
}

function toActivityLogRecord(row: ActivityLogRow): ActivityLogRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    actorType: row.actor_type,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    summary: row.summary,
    beforeJson: row.before_json,
    afterJson: row.after_json,
    createdAt: row.created_at
  };
}
