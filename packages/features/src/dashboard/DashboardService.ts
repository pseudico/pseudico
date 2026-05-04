import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType,
  type Clock
} from "@local-work-os/core";
import {
  ActivityLogService,
  DashboardRepository,
  TransactionService,
  DEFAULT_DASHBOARD_WIDGET_TYPES,
  type DashboardRecord,
  type DashboardWidgetRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  isDefaultDashboardWidgetType,
  type DashboardViewModel,
  type DashboardWidgetData,
  type DashboardWidgetViewModel,
  type WidgetDataQueryInput
} from "./DashboardViewModel";
import { WidgetDataService } from "./WidgetDataService";

// Owns dashboard-facing application service contracts.
// Does not own source domain writes or renderer layout implementation.
export type DashboardServiceIdFactory = (prefix: string) => string;

export type GetDefaultDashboardInput = {
  workspaceId: string;
  actorType?: ActivityActorType;
};

export class DashboardService {
  readonly module = "dashboard";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: DashboardServiceIdFactory;
  private readonly now: Clock;
  private readonly transactionService: TransactionService;
  private readonly widgetDataService: WidgetDataService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: DashboardServiceIdFactory;
    now?: Clock;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
    this.widgetDataService = new WidgetDataService({
      connection: input.connection,
      now: this.now
    });
  }

  async getDefaultDashboard(
    input: GetDefaultDashboardInput
  ): Promise<DashboardViewModel> {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    const { dashboard, widgets } = await this.transactionService.runInTransaction(
      () => this.ensureDefaultDashboard(input)
    );

    return {
      dashboard,
      widgets: widgets.map((widget) => this.toWidgetViewModel(widget))
    };
  }

  getWidgetData(widgetId: string): DashboardWidgetData | null {
    validateNonEmptyString(widgetId, "widgetId");

    const widget = new DashboardRepository(this.connection).getWidgetById(
      widgetId
    );

    if (widget === null || !isDefaultDashboardWidgetType(widget.type)) {
      return null;
    }

    return this.resolveWidgetData(widget, readWidgetConfig(widget.configJson));
  }

  getTodayWidgetData(input: WidgetDataQueryInput): DashboardWidgetData {
    return this.widgetDataService.getTodayWidgetData(input);
  }

  getOverdueWidgetData(input: WidgetDataQueryInput): DashboardWidgetData {
    return this.widgetDataService.getOverdueWidgetData(input);
  }

  getUpcomingWidgetData(input: WidgetDataQueryInput): DashboardWidgetData {
    return this.widgetDataService.getUpcomingWidgetData(input);
  }

  getRecentActivityWidgetData(
    input: WidgetDataQueryInput
  ): DashboardWidgetData {
    return this.widgetDataService.getRecentActivityWidgetData(input);
  }

  private ensureDefaultDashboard(input: GetDefaultDashboardInput): {
    dashboard: DashboardRecord;
    widgets: DashboardWidgetRecord[];
  } {
    const timestamp = createIsoTimestamp(this.now());
    const repository = new DashboardRepository(this.connection);
    let dashboard = repository.findDefaultDashboard(input.workspaceId);

    if (dashboard === null) {
      dashboard = repository.createDefaultDashboard({
        id: this.idFactory("dashboard"),
        workspaceId: input.workspaceId,
        timestamp
      });
      this.logDashboardCreated({
        dashboard,
        actorType: input.actorType ?? "system",
        timestamp
      });
    }

    const widgets = DEFAULT_DASHBOARD_WIDGET_TYPES.map((type, index) => {
      const existing = repository.findWidgetByType({
        dashboardId: dashboard.id,
        type
      });

      if (existing !== null) {
        return existing;
      }

      const widget = repository.createWidget({
        id: this.idFactory("dashboard_widget"),
        workspaceId: input.workspaceId,
        dashboardId: dashboard.id,
        type,
        title: dashboardWidgetTitle(type),
        sortOrder: index,
        configJson: "{}",
        positionJson: JSON.stringify({
          column: index % 2,
          row: Math.floor(index / 2)
        }),
        timestamp
      });
      this.logDashboardWidgetCreated({
        widget,
        actorType: input.actorType ?? "system",
        timestamp
      });

      return widget;
    });

    return {
      dashboard,
      widgets
    };
  }

  private toWidgetViewModel(
    widget: DashboardWidgetRecord
  ): DashboardWidgetViewModel {
    return {
      widget,
      data: isDefaultDashboardWidgetType(widget.type)
        ? this.resolveWidgetData(widget, readWidgetConfig(widget.configJson))
        : null
    };
  }

  private resolveWidgetData(
    widget: DashboardWidgetRecord,
    config: Partial<WidgetDataQueryInput>
  ): DashboardWidgetData {
    const input = {
      ...config,
      workspaceId: widget.workspaceId
    };

    switch (widget.type) {
      case "today":
        return this.widgetDataService.getTodayWidgetData(input);
      case "overdue":
        return this.widgetDataService.getOverdueWidgetData(input);
      case "upcoming":
        return this.widgetDataService.getUpcomingWidgetData(input);
      case "favorites":
        return this.widgetDataService.getFavoriteProjectsWidgetData(input);
      case "recent_activity":
        return this.widgetDataService.getRecentActivityWidgetData(input);
      default:
        throw new Error(`Unsupported dashboard widget type: ${widget.type}.`);
    }
  }

  private logDashboardCreated(input: {
    dashboard: DashboardRecord;
    actorType: ActivityActorType;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.dashboard.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.dashboardCreated,
      targetType: "dashboard",
      targetId: input.dashboard.id,
      summary: `Created default dashboard "${input.dashboard.name}".`,
      beforeJson: null,
      afterJson: JSON.stringify(input.dashboard),
      timestamp: input.timestamp
    });
  }

  private logDashboardWidgetCreated(input: {
    widget: DashboardWidgetRecord;
    actorType: ActivityActorType;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.widget.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.dashboardWidgetCreated,
      targetType: "dashboard_widget",
      targetId: input.widget.id,
      summary: `Created dashboard widget "${input.widget.title ?? input.widget.type}".`,
      beforeJson: null,
      afterJson: JSON.stringify(input.widget),
      timestamp: input.timestamp
    });
  }
}

export const dashboardModuleContract = {
  module: "dashboard",
  purpose: "Coordinate workspace overview widgets and project health summary projections.",
  owns: ["dashboard service boundary", "workspace overview projections", "saved-view widget coordination"],
  doesNotOwn: ["source domain writes", "saved-view query storage", "renderer layout implementation"],
  integrationPoints: ["projects", "tasks", "search", "saved views", "today", "metadata", "activity log"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function readWidgetConfig(configJson: string): Partial<WidgetDataQueryInput> {
  try {
    const value = JSON.parse(configJson) as unknown;

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return value as Partial<WidgetDataQueryInput>;
  } catch {
    return {};
  }
}

function dashboardWidgetTitle(
  type: (typeof DEFAULT_DASHBOARD_WIDGET_TYPES)[number]
): string {
  switch (type) {
    case "today":
      return "Today";
    case "overdue":
      return "Overdue";
    case "upcoming":
      return "Upcoming";
    case "favorites":
      return "Favorite Projects";
    case "recent_activity":
      return "Recent Activity";
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
