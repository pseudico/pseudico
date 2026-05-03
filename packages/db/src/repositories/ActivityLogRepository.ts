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

export class ActivityLogRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
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
