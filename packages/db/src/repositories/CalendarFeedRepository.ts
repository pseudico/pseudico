import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type CalendarSourceRow = {
  id: string;
  workspace_id: string;
  name: string;
  source_type: string;
  source_path: string | null;
  source_url: string | null;
  network_enabled: number;
  read_only: number;
  imported_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CalendarEventRow = {
  id: string;
  workspace_id: string;
  source_id: string;
  external_uid: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: number;
  timezone: string | null;
  raw_json: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CalendarSourceType = "file" | "network";

export type CalendarSourceRecord = {
  id: string;
  workspaceId: string;
  name: string;
  sourceType: CalendarSourceType;
  sourcePath: string | null;
  sourceUrl: string | null;
  networkEnabled: boolean;
  readOnly: boolean;
  importedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CalendarEventRecord = {
  id: string;
  workspaceId: string;
  sourceId: string;
  externalUid: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  timezone: string | null;
  rawJson: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type UpsertCalendarSourceInput = {
  id: string;
  workspaceId: string;
  name: string;
  sourceType: CalendarSourceType;
  sourcePath?: string | null;
  sourceUrl?: string | null;
  networkEnabled?: boolean;
  readOnly?: boolean;
  importedAt: string;
  timestamp: string;
};

export type UpsertCalendarEventInput = {
  id: string;
  workspaceId: string;
  sourceId: string;
  externalUid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  timezone?: string | null;
  rawJson?: string;
  timestamp: string;
};

export class CalendarFeedRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  findSourceByName(input: { workspaceId: string; name: string }): CalendarSourceRecord | null {
    const row = this.connection.sqlite
      .prepare<[string, string], CalendarSourceRow>(
        `select * from calendar_sources where workspace_id = ? and name = ? limit 1`
      )
      .get(input.workspaceId, input.name);

    return row === undefined ? null : toCalendarSourceRecord(row);
  }

  getSourceById(sourceId: string): CalendarSourceRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], CalendarSourceRow>(
        `select * from calendar_sources where id = ? limit 1`
      )
      .get(sourceId);

    return row === undefined ? null : toCalendarSourceRecord(row);
  }

  listSources(workspaceId: string): CalendarSourceRecord[] {
    return this.connection.sqlite
      .prepare<[string], CalendarSourceRow>(
        `select * from calendar_sources where workspace_id = ? and deleted_at is null order by name asc`
      )
      .all(workspaceId)
      .map(toCalendarSourceRecord);
  }

  upsertSource(input: UpsertCalendarSourceInput): CalendarSourceRecord {
    this.connection.sqlite
      .prepare(
        `insert into calendar_sources (
          id, workspace_id, name, source_type, source_path, source_url,
          network_enabled, read_only, imported_at, created_at, updated_at, deleted_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null)
        on conflict(workspace_id, name) do update set
          source_type = excluded.source_type,
          source_path = excluded.source_path,
          source_url = excluded.source_url,
          network_enabled = excluded.network_enabled,
          read_only = excluded.read_only,
          imported_at = excluded.imported_at,
          updated_at = excluded.updated_at,
          deleted_at = null`
      )
      .run(
        input.id,
        input.workspaceId,
        input.name,
        input.sourceType,
        input.sourcePath ?? null,
        input.sourceUrl ?? null,
        input.networkEnabled === true ? 1 : 0,
        input.readOnly === false ? 0 : 1,
        input.importedAt,
        input.timestamp,
        input.timestamp
      );

    const record = this.findSourceByName({ workspaceId: input.workspaceId, name: input.name });

    if (record === null) {
      throw new Error(`Calendar source was not saved: ${input.name}.`);
    }

    return record;
  }

  upsertEvent(input: UpsertCalendarEventInput): CalendarEventRecord {
    this.connection.sqlite
      .prepare(
        `insert into calendar_events (
          id, workspace_id, source_id, external_uid, title, description, location,
          start_at, end_at, all_day, timezone, raw_json, created_at, updated_at, deleted_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null)
        on conflict(source_id, external_uid) do update set
          title = excluded.title,
          description = excluded.description,
          location = excluded.location,
          start_at = excluded.start_at,
          end_at = excluded.end_at,
          all_day = excluded.all_day,
          timezone = excluded.timezone,
          raw_json = excluded.raw_json,
          updated_at = excluded.updated_at,
          deleted_at = null`
      )
      .run(
        input.id,
        input.workspaceId,
        input.sourceId,
        input.externalUid,
        input.title,
        input.description ?? null,
        input.location ?? null,
        input.startAt,
        input.endAt,
        input.allDay === true ? 1 : 0,
        input.timezone ?? null,
        input.rawJson ?? "{}",
        input.timestamp,
        input.timestamp
      );

    const record = this.findEventBySourceUid({ sourceId: input.sourceId, externalUid: input.externalUid });

    if (record === null) {
      throw new Error(`Calendar event was not saved: ${input.externalUid}.`);
    }

    return record;
  }

  replaceEventsForSource(input: { sourceId: string; workspaceId: string; events: UpsertCalendarEventInput[]; timestamp: string }): CalendarEventRecord[] {
    this.connection.sqlite
      .prepare(`update calendar_events set deleted_at = ?, updated_at = ? where source_id = ? and workspace_id = ?`)
      .run(input.timestamp, input.timestamp, input.sourceId, input.workspaceId);

    return input.events.map((event) => this.upsertEvent(event));
  }

  listEventsBetween(input: { workspaceId: string; startInclusive: string; endExclusive: string; includeDeleted?: boolean }): CalendarEventRecord[] {
    const includeDeleted = input.includeDeleted === true;
    const rows = this.connection.sqlite
      .prepare<[string, string, string], CalendarEventRow>(
        `select * from calendar_events
         where workspace_id = ?
           and start_at < ?
           and end_at > ?
           ${includeDeleted ? "" : "and deleted_at is null"}
         order by start_at asc, title asc`
      )
      .all(input.workspaceId, input.endExclusive, input.startInclusive);

    return rows.map(toCalendarEventRecord);
  }

  private findEventBySourceUid(input: { sourceId: string; externalUid: string }): CalendarEventRecord | null {
    const row = this.connection.sqlite
      .prepare<[string, string], CalendarEventRow>(
        `select * from calendar_events where source_id = ? and external_uid = ? limit 1`
      )
      .get(input.sourceId, input.externalUid);

    return row === undefined ? null : toCalendarEventRecord(row);
  }
}

function toCalendarSourceRecord(row: CalendarSourceRow): CalendarSourceRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    sourceType: row.source_type as CalendarSourceType,
    sourcePath: row.source_path,
    sourceUrl: row.source_url,
    networkEnabled: row.network_enabled === 1,
    readOnly: row.read_only === 1,
    importedAt: row.imported_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function toCalendarEventRecord(row: CalendarEventRow): CalendarEventRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    sourceId: row.source_id,
    externalUid: row.external_uid,
    title: row.title,
    description: row.description,
    location: row.location,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day === 1,
    timezone: row.timezone,
    rawJson: row.raw_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}
