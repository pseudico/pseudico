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

  createWidget(input: CreateDashboardWidgetInput): DashboardWidgetRecord {
    this.connection.sqlite
      .prepare(
        `insert into dashboard_widgets (
          id,
          workspace_id,
          dashboard_id,
          type,
          title,
          config_json,
          position_json,
          sort_order,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.dashboardId,
        input.type,
        input.title,
        input.configJson,
        input.positionJson,
        input.sortOrder,
        input.timestamp,
        input.timestamp
      );

    const created = this.findWidgetByType({
      dashboardId: input.dashboardId,
      type: input.type
    });

    if (created === null) {
      throw new Error(`Dashboard widget was not created: ${input.type}.`);
    }

    return created;
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
