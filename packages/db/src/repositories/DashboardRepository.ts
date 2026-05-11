import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type DashboardRow = {
  id: string;
  workspace_id: string;
  name: string;
  is_default: number;
  layout_json: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DashboardWidgetRow = {
  id: string;
  workspace_id: string;
  dashboard_id: string;
  type: string;
  title: string | null;
  saved_view_id: string | null;
  config_json: string;
  position_json: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DashboardRecord = {
  id: string;
  workspaceId: string;
  name: string;
  isDefault: boolean;
  layoutJson: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type DashboardWidgetRecord = {
  id: string;
  workspaceId: string;
  dashboardId: string;
  type: string;
  title: string | null;
  savedViewId: string | null;
  configJson: string;
  positionJson: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type DashboardWidgetType =
  | "today"
  | "overdue"
  | "upcoming"
  | "favorites"
  | "recent_activity"
  | "saved_view"
  | "project_health"
  | "timeline"
  | "calendar";

export type CreateDefaultDashboardInput = {
  id: string;
  workspaceId: string;
  timestamp: string;
};

export type CreateDashboardWidgetInput = {
  id: string;
  workspaceId: string;
  dashboardId: string;
  type: string;
  title: string;
  sortOrder: number;
  configJson: string;
  positionJson: string;
  timestamp: string;
  savedViewId?: string | null;
};

export type UpdateDashboardLayoutInput = {
  dashboardId: string;
  layoutJson: string;
  timestamp: string;
};

export type UpdateDashboardWidgetInput = {
  widgetId: string;
  title?: string | null;
  configJson?: string;
  positionJson?: string;
  sortOrder?: number;
  savedViewId?: string | null;
  timestamp: string;
};

export class DashboardRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  findDefaultDashboard(workspaceId: string): DashboardRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], DashboardRow>(
        `select *
         from dashboards
         where workspace_id = ?
           and is_default = 1
           and deleted_at is null
         limit 1`
      )
      .get(workspaceId);

    return row === undefined ? null : toDashboardRecord(row);
  }

  listByWorkspace(workspaceId: string): DashboardRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string], DashboardRow>(
        `select *
         from dashboards
         where workspace_id = ?
           and deleted_at is null
         order by is_default desc, name collate nocase asc, created_at asc, id asc`
      )
      .all(workspaceId);

    return rows.map(toDashboardRecord);
  }

  createDefaultDashboard(
    input: CreateDefaultDashboardInput
  ): DashboardRecord {
    this.connection.sqlite
      .prepare(
        `insert into dashboards (
          id,
          workspace_id,
          name,
          is_default,
          layout_json,
          created_at,
          updated_at
        ) values (?, ?, 'Dashboard', 1, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        JSON.stringify({ columns: 2 }),
        input.timestamp,
        input.timestamp
      );

    const created = this.findDefaultDashboard(input.workspaceId);

    if (created === null) {
      throw new Error("Default dashboard row was not created.");
    }

    return created;
  }

  findWidgetByType(input: {
    dashboardId: string;
    type: string;
  }): DashboardWidgetRecord | null {
    const row = this.connection.sqlite
      .prepare<[string, string], DashboardWidgetRow>(
        `select *
         from dashboard_widgets
         where dashboard_id = ?
           and type = ?
           and deleted_at is null
         order by sort_order asc, created_at asc
         limit 1`
      )
      .get(input.dashboardId, input.type);

    return row === undefined ? null : toDashboardWidgetRecord(row);
  }

  getWidgetById(widgetId: string): DashboardWidgetRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], DashboardWidgetRow>(
        `select *
         from dashboard_widgets
         where id = ?
           and deleted_at is null
         limit 1`
      )
      .get(widgetId);

    return row === undefined ? null : toDashboardWidgetRecord(row);
  }

  listWidgetsByDashboard(dashboardId: string): DashboardWidgetRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string], DashboardWidgetRow>(
        `select *
         from dashboard_widgets
         where dashboard_id = ?
           and deleted_at is null
         order by sort_order asc, created_at asc`
      )
      .all(dashboardId);

    return rows.map(toDashboardWidgetRecord);
  }

  listWidgetsByWorkspace(workspaceId: string): DashboardWidgetRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string], DashboardWidgetRow>(
        `select *
         from dashboard_widgets
         where workspace_id = ?
           and deleted_at is null
         order by dashboard_id asc, sort_order asc, created_at asc, id asc`
      )
      .all(workspaceId);

    return rows.map(toDashboardWidgetRecord);
  }

  createWidget(input: CreateDashboardWidgetInput): DashboardWidgetRecord {
    this.connection.sqlite
      .prepare(
        `insert into dashboard_widgets (
          id,
          workspace_id,
          dashboard_id,
          type,
          title,
          saved_view_id,
          config_json,
          position_json,
          sort_order,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.dashboardId,
        input.type,
        input.title,
        input.savedViewId ?? null,
        input.configJson,
        input.positionJson,
        input.sortOrder,
        input.timestamp,
        input.timestamp
      );

    const created = this.getWidgetById(input.id);

    if (created === null) {
      throw new Error(`Dashboard widget was not created: ${input.type}.`);
    }

    return created;
  }

  updateDashboardLayout(input: UpdateDashboardLayoutInput): DashboardRecord {
    this.connection.sqlite
      .prepare(
        `update dashboards
         set layout_json = ?, updated_at = ?
         where id = ? and deleted_at is null`
      )
      .run(input.layoutJson, input.timestamp, input.dashboardId);

    const row = this.connection.sqlite
      .prepare<[string], DashboardRow>(
        `select * from dashboards where id = ? and deleted_at is null limit 1`
      )
      .get(input.dashboardId);

    if (row === undefined) {
      throw new Error(`Dashboard was not found: ${input.dashboardId}.`);
    }

    return toDashboardRecord(row);
  }

  updateWidget(input: UpdateDashboardWidgetInput): DashboardWidgetRecord {
    const existing = this.getWidgetById(input.widgetId);

    if (existing === null) {
      throw new Error(`Dashboard widget was not found: ${input.widgetId}.`);
    }

    this.connection.sqlite
      .prepare(
        `update dashboard_widgets
         set title = ?, saved_view_id = ?, config_json = ?, position_json = ?, sort_order = ?, updated_at = ?
         where id = ? and deleted_at is null`
      )
      .run(
        input.title === undefined ? existing.title : input.title,
        input.savedViewId === undefined ? existing.savedViewId : input.savedViewId,
        input.configJson ?? existing.configJson,
        input.positionJson ?? existing.positionJson,
        input.sortOrder ?? existing.sortOrder,
        input.timestamp,
        input.widgetId
      );

    const updated = this.getWidgetById(input.widgetId);

    if (updated === null) {
      throw new Error(`Dashboard widget was not updated: ${input.widgetId}.`);
    }

    return updated;
  }

  softDeleteWidget(input: { widgetId: string; timestamp: string }): DashboardWidgetRecord {
    const existing = this.getWidgetById(input.widgetId);

    if (existing === null) {
      throw new Error(`Dashboard widget was not found: ${input.widgetId}.`);
    }

    this.connection.sqlite
      .prepare(
        `update dashboard_widgets
         set deleted_at = ?, updated_at = ?
         where id = ? and deleted_at is null`
      )
      .run(input.timestamp, input.timestamp, input.widgetId);

    return { ...existing, updatedAt: input.timestamp, deletedAt: input.timestamp };
  }
}

function toDashboardRecord(row: DashboardRow): DashboardRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    isDefault: row.is_default === 1,
    layoutJson: row.layout_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function toDashboardWidgetRecord(
  row: DashboardWidgetRow
): DashboardWidgetRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    dashboardId: row.dashboard_id,
    type: row.type,
    title: row.title,
    savedViewId: row.saved_view_id,
    configJson: row.config_json,
    positionJson: row.position_json,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}
