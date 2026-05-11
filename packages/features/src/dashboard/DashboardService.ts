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

export type DashboardLayoutWidgetType =
  | "today"
  | "overdue"
  | "upcoming"
  | "favorites"
  | "recent_activity"
  | "project_health"
  | "saved_view"
  | "timeline"
  | "calendar";

export type DashboardWidgetPositionInput = {
  column: number;
  row: number;
  width?: number;
  height?: number;
};

export type AddDashboardWidgetInput = {
  workspaceId: string;
  dashboardId?: string;
  type: DashboardLayoutWidgetType;
  title?: string | null;
  savedViewId?: string | null;
  config?: Record<string, unknown>;
  position?: DashboardWidgetPositionInput;
  actorType?: ActivityActorType;
};

export type UpdateDashboardWidgetInput = {
  widgetId: string;
  title?: string | null;
  savedViewId?: string | null;
  config?: Record<string, unknown>;
  position?: DashboardWidgetPositionInput;
  sortOrder?: number;
  actorType?: ActivityActorType;
};

export type RemoveDashboardWidgetInput = {
  widgetId: string;
  actorType?: ActivityActorType;
};

export type ReorderDashboardWidgetsInput = {
  dashboardId: string;
  widgetIds: string[];
  actorType?: ActivityActorType;
};

export type UpdateDashboardLayoutInput = {
  dashboardId: string;
  layout: Record<string, unknown>;
  actorType?: ActivityActorType;
};

export type DashboardWidgetDefinition = {
  type: DashboardLayoutWidgetType;
  title: string;
  description: string;
  configurable: boolean;
  requiresSavedView: boolean;
};

export const DASHBOARD_WIDGET_REGISTRY: DashboardWidgetDefinition[] = [
  { type: "today", title: "Today", description: "Tasks due today.", configurable: true, requiresSavedView: false },
  { type: "overdue", title: "Overdue", description: "Past-due open tasks.", configurable: true, requiresSavedView: false },
  { type: "upcoming", title: "Upcoming", description: "Tasks due soon.", configurable: true, requiresSavedView: false },
  { type: "favorites", title: "Favorite Projects", description: "Pinned and favorite work targets.", configurable: true, requiresSavedView: false },
  { type: "recent_activity", title: "Recent Activity", description: "Latest local activity events.", configurable: true, requiresSavedView: false },
  { type: "project_health", title: "Project Health", description: "Project status and workload summaries.", configurable: true, requiresSavedView: false },
  { type: "saved_view", title: "Saved View", description: "Placeholder for a selected saved view widget.", configurable: true, requiresSavedView: true },
  { type: "timeline", title: "Timeline", description: "Timeline summary placeholder.", configurable: true, requiresSavedView: false },
  { type: "calendar", title: "Calendar", description: "Calendar summary placeholder.", configurable: true, requiresSavedView: false }
];

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

  getProjectHealthWidgetData(input: WidgetDataQueryInput): DashboardWidgetData {
    return this.widgetDataService.getProjectHealthWidgetData(input);
  }

  listWidgetDefinitions(): DashboardWidgetDefinition[] {
    return [...DASHBOARD_WIDGET_REGISTRY];
  }

  async addWidget(input: AddDashboardWidgetInput): Promise<DashboardWidgetViewModel> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const definition = getWidgetDefinition(input.type);
    if (definition.requiresSavedView && !isNonEmptyString(input.savedViewId)) {
      throw new Error("saved_view widgets require savedViewId.");
    }

    const widget = await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new DashboardRepository(this.connection);
      const dashboard = input.dashboardId === undefined
        ? this.ensureDefaultDashboard({
            workspaceId: input.workspaceId,
            ...(input.actorType === undefined ? {} : { actorType: input.actorType })
          }).dashboard
        : repository.listByWorkspace(input.workspaceId).find((candidate) => candidate.id === input.dashboardId) ?? null;

      if (dashboard === null) {
        throw new Error("Dashboard was not found for this workspace.");
      }

      const existingWidgets = repository.listWidgetsByDashboard(dashboard.id);
      const created = repository.createWidget({
        id: this.idFactory("dashboard_widget"),
        workspaceId: input.workspaceId,
        dashboardId: dashboard.id,
        type: input.type,
        title: normalizeOptionalTitle(input.title) ?? definition.title,
        savedViewId: input.savedViewId ?? null,
        configJson: stableStringify(input.config ?? {}),
        positionJson: stableStringify(input.position ?? nextWidgetPosition(existingWidgets)),
        sortOrder: existingWidgets.length,
        timestamp
      });
      this.logDashboardWidgetCreated({ widget: created, actorType: input.actorType ?? "local_user", timestamp });
      return created;
    });

    return this.toWidgetViewModel(widget);
  }

  async updateWidget(input: UpdateDashboardWidgetInput): Promise<DashboardWidgetViewModel> {
    validateNonEmptyString(input.widgetId, "widgetId");
    const widget = await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new DashboardRepository(this.connection);
      const before = repository.getWidgetById(input.widgetId);
      if (before === null) {
        throw new Error("Dashboard widget was not found.");
      }
      const nextType = before.type as DashboardLayoutWidgetType;
      const definition = getWidgetDefinition(nextType);
      if (definition.requiresSavedView && input.savedViewId === null) {
        throw new Error("saved_view widgets require savedViewId.");
      }
      const updateInput = {
        widgetId: input.widgetId,
        timestamp,
        ...(input.title === undefined ? {} : { title: normalizeTitleValue(input.title) }),
        ...(input.savedViewId === undefined ? {} : { savedViewId: input.savedViewId }),
        ...(input.config === undefined ? {} : { configJson: stableStringify(input.config) }),
        ...(input.position === undefined ? {} : { positionJson: stableStringify(input.position) }),
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder })
      };
      const updated = repository.updateWidget(updateInput);
      this.logDashboardWidgetChanged({ before, widget: updated, action: ActivityAction.dashboardWidgetUpdated, actorType: input.actorType ?? "local_user", timestamp, summary: `Updated dashboard widget "${updated.title ?? updated.type}".` });
      return updated;
    });
    return this.toWidgetViewModel(widget);
  }

  async removeWidget(input: RemoveDashboardWidgetInput): Promise<DashboardWidgetRecord> {
    validateNonEmptyString(input.widgetId, "widgetId");
    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new DashboardRepository(this.connection);
      const before = repository.getWidgetById(input.widgetId);
      if (before === null) {
        throw new Error("Dashboard widget was not found.");
      }
      const deleted = repository.softDeleteWidget({ widgetId: input.widgetId, timestamp });
      this.logDashboardWidgetChanged({ before, widget: deleted, action: ActivityAction.dashboardWidgetDeleted, actorType: input.actorType ?? "local_user", timestamp, summary: `Removed dashboard widget "${before.title ?? before.type}".` });
      return deleted;
    });
  }

  async reorderWidgets(input: ReorderDashboardWidgetsInput): Promise<DashboardViewModel> {
    validateNonEmptyString(input.dashboardId, "dashboardId");
    if (input.widgetIds.length === 0) {
      throw new Error("widgetIds must include at least one widget.");
    }
    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new DashboardRepository(this.connection);
      const existing = repository.listWidgetsByDashboard(input.dashboardId);
      const existingIds = new Set(existing.map((widget) => widget.id));
      for (const widgetId of input.widgetIds) {
        if (!existingIds.has(widgetId)) {
          throw new Error(`Widget does not belong to dashboard: ${widgetId}.`);
        }
      }
      input.widgetIds.forEach((widgetId, index) => {
        repository.updateWidget({ widgetId, sortOrder: index, timestamp });
      });
      const dashboard = repository.listByWorkspace(existing[0]?.workspaceId ?? "").find((candidate) => candidate.id === input.dashboardId);
      if (dashboard === undefined) {
        throw new Error("Dashboard was not found.");
      }
      const widgets = repository.listWidgetsByDashboard(input.dashboardId);
      this.logDashboardLayoutChanged({ dashboard, action: ActivityAction.dashboardLayoutUpdated, actorType: input.actorType ?? "local_user", timestamp, summary: "Reordered dashboard widgets.", afterJson: JSON.stringify(widgets.map((widget) => ({ id: widget.id, sortOrder: widget.sortOrder }))) });
      return { dashboard, widgets: widgets.map((widget) => this.toWidgetViewModel(widget)) };
    });
  }

  async updateLayout(input: UpdateDashboardLayoutInput): Promise<DashboardRecord> {
    validateNonEmptyString(input.dashboardId, "dashboardId");
    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new DashboardRepository(this.connection);
      const dashboard = repository.updateDashboardLayout({
        dashboardId: input.dashboardId,
        layoutJson: stableStringify(input.layout),
        timestamp
      });
      this.logDashboardLayoutChanged({ dashboard, action: ActivityAction.dashboardLayoutUpdated, actorType: input.actorType ?? "local_user", timestamp, summary: "Updated dashboard layout settings.", afterJson: JSON.stringify(dashboard) });
      return dashboard;
    });
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

    DEFAULT_DASHBOARD_WIDGET_TYPES.forEach((type, index) => {
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

      return;
    });

    return {
      dashboard,
      widgets: repository.listWidgetsByDashboard(dashboard.id)
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
      case "project_health":
        return this.widgetDataService.getProjectHealthWidgetData(input);
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

  private logDashboardWidgetChanged(input: {
    before: DashboardWidgetRecord;
    widget: DashboardWidgetRecord;
    action: ActivityAction;
    actorType: ActivityActorType;
    timestamp: string;
    summary: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.widget.workspaceId,
      actorType: input.actorType,
      action: input.action,
      targetType: "dashboard_widget",
      targetId: input.widget.id,
      summary: input.summary,
      beforeJson: JSON.stringify(input.before),
      afterJson: JSON.stringify(input.widget),
      timestamp: input.timestamp
    });
  }

  private logDashboardLayoutChanged(input: {
    dashboard: DashboardRecord;
    action: ActivityAction;
    actorType: ActivityActorType;
    timestamp: string;
    summary: string;
    afterJson: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.dashboard.workspaceId,
      actorType: input.actorType,
      action: input.action,
      targetType: "dashboard",
      targetId: input.dashboard.id,
      summary: input.summary,
      beforeJson: null,
      afterJson: input.afterJson,
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


function getWidgetDefinition(type: DashboardLayoutWidgetType): DashboardWidgetDefinition {
  const definition = DASHBOARD_WIDGET_REGISTRY.find((candidate) => candidate.type === type);
  if (definition === undefined) {
    throw new Error(`Unsupported dashboard widget type: ${type}.`);
  }
  return definition;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function nextWidgetPosition(widgets: DashboardWidgetRecord[]): DashboardWidgetPositionInput {
  return {
    column: widgets.length % 2,
    row: Math.floor(widgets.length / 2),
    width: 1,
    height: 1
  };
}

function normalizeOptionalTitle(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return normalizeTitleValue(value);
}

function normalizeTitleValue(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

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
    case "project_health":
      return "Project Health";
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
