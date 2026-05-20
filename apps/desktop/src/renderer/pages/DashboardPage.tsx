import { ArrowDown, ArrowUp, Edit3, Plus, Printer, RefreshCw, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DashboardWidget,
  FavoriteProjectsWidget,
  MiniCalendarWidget,
  MiniTimelineWidget,
  PomodoroWidget,
  OverdueWidget,
  ProjectHealthWidget,
  RecentActivityWidget,
  StaticTextWidget,
  TodayWidget,
  UpcomingWidget,
  WebWidget,
  type DashboardActivityWidgetItem,
  type DashboardFavoriteWidgetItem,
  type DashboardTaskWidgetItem,
  type ProjectHealthViewModel,
  formatAustralianDate,
  type SnoozePreset
} from "@local-work-os/ui";
import type {
  DashboardActivityWidgetItemSummary,
  DashboardFavoriteWidgetItemSummary,
  DashboardProjectHealthWidgetItemSummary,
  DashboardTaskWidgetItemSummary,
  DashboardViewModelSummary,
  DashboardWidgetDataSummary,
  DashboardWidgetDefinitionSummary,
  DashboardWidgetSummary,
  LocalWorkOsApi
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type DashboardPageProps = {
  apiClient?: LocalWorkOsApi;
  initialDashboard?: DashboardViewModelSummary | null;
};

export function DashboardPage({
  apiClient = desktopApiClient,
  initialDashboard
}: DashboardPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [dashboard, setDashboard] =
    useState<DashboardViewModelSummary | null>(initialDashboard ?? null);
  const [loading, setLoading] = useState(initialDashboard === undefined);
  const [error, setError] = useState<string | null>(null);
  const [taskMutationError, setTaskMutationError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [printBusy, setPrintBusy] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [widgetDefinitions, setWidgetDefinitions] = useState<DashboardWidgetDefinitionSummary[]>([]);
  const [selectedWidgetType, setSelectedWidgetType] = useState("today");
  const [savedViewId, setSavedViewId] = useState("");
  const [widgetMutationBusy, setWidgetMutationBusy] = useState(false);
  const [webWidgetsEnabled, setWebWidgetsEnabled] = useState(false);

  useEffect(() => {
    if (initialDashboard !== undefined) {
      return;
    }

    if (currentWorkspace === null) {
      setDashboard(null);
      setWebWidgetsEnabled(false);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadDashboard(): Promise<void> {
      setLoading(true);
      setError(null);

      const [result, privacyResult] = await Promise.all([
        apiClient.dashboard.getDefault({ workspaceId }),
        apiClient.privacy?.getSettings(workspaceId) ??
          Promise.resolve({ ok: true as const, data: null })
      ]);

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setDashboard(result.data);
      setWebWidgetsEnabled(
        privacyResult.ok && privacyResult.data !== null
          ? privacyResult.data.webWidgetsEnabled
          : false
      );
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, initialDashboard]);

  useEffect(() => {
    let active = true;

    async function loadWidgetDefinitions(): Promise<void> {
      const result = await apiClient.dashboard.listWidgetDefinitions?.();

      if (result === undefined) {
        return;
      }

      if (!active || !result.ok) {
        return;
      }

      setWidgetDefinitions(result.data);
      setSelectedWidgetType(result.data[0]?.type ?? "today");
    }

    void loadWidgetDefinitions();

    return () => {
      active = false;
    };
  }, [apiClient]);

  async function refreshDashboard(): Promise<void> {
    const workspaceId = currentWorkspace?.id ?? dashboard?.dashboard.workspaceId;

    if (workspaceId === undefined) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await apiClient.dashboard.getDefault({ workspaceId });

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setDashboard(result.data);
  }

  function openProjectHealth(project: ProjectHealthViewModel): void {
    navigate(`/projects/${project.projectId}`);
  }

  function openFavorite(favorite: DashboardFavoriteWidgetItem): void {
    navigate(favorite.path);
  }

  function openTask(task: DashboardTaskWidgetItem): void {
    navigate(`/projects/${task.containerId}`);
  }

  async function snoozeTask(
    task: DashboardTaskWidgetItem,
    preset: SnoozePreset
  ): Promise<void> {
    setBusyTaskId(task.itemId);
    setTaskMutationError(null);

    const result = await apiClient.tasks.snooze({
      itemId: task.itemId,
      preset
    });

    setBusyTaskId(null);

    if (!result.ok) {
      setTaskMutationError(result.error.message);
      return;
    }

    await refreshDashboard();
  }

  async function rescheduleTask(
    task: DashboardTaskWidgetItem,
    dueAt: string | null
  ): Promise<void> {
    setBusyTaskId(task.itemId);
    setTaskMutationError(null);

    const result = await apiClient.tasks.reschedule({
      itemId: task.itemId,
      dueAt,
      allDay: true
    });

    setBusyTaskId(null);

    if (!result.ok) {
      setTaskMutationError(result.error.message);
      return;
    }

    await refreshDashboard();
  }

  function openActivityTarget(activity: DashboardActivityWidgetItem): void {
    if (activity.targetType === "container") {
      navigate(`/projects/${activity.targetId}`);
      return;
    }

    navigate("/search");
  }

  async function printDashboardPdf(): Promise<void> {
    const workspaceId = currentWorkspace?.id ?? dashboard?.dashboard.workspaceId;
    const itemIds = [
      ...getTaskWidgetItems(widgets, "today"),
      ...getTaskWidgetItems(widgets, "overdue"),
      ...getTaskWidgetItems(widgets, "upcoming")
    ].map((item) => item.itemId);
    const uniqueItemIds = [...new Set(itemIds)];

    if (workspaceId === undefined || uniqueItemIds.length === 0) {
      setError("Refresh the dashboard before printing task widgets.");
      return;
    }

    setPrintBusy(true);
    setPrintMessage(null);
    setError(null);

    const result = await apiClient.print?.printPdf({
      workspaceId,
      title: dashboard?.dashboard.name ?? "Dashboard",
      itemIds: uniqueItemIds
    });

    setPrintBusy(false);

    if (result === undefined) {
      setError("Print/PDF export is not available.");
      return;
    }

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setPrintMessage(`Dashboard PDF created at ${result.data.relativePath}.`);
  }


  async function addDashboardWidget(): Promise<void> {
    const workspaceId = currentWorkspace?.id ?? dashboard?.dashboard.workspaceId;
    const selectedDefinition = widgetDefinitions.find(
      (definition) => definition.type === selectedWidgetType
    );

    if (workspaceId === undefined || dashboard === null || selectedDefinition === undefined) {
      return;
    }

    if (selectedDefinition.requiresSavedView && savedViewId.trim().length === 0) {
      setError("Enter a saved view ID before adding a saved-view widget.");
      return;
    }

    setWidgetMutationBusy(true);
    setError(null);

    const result = await apiClient.dashboard.addWidget?.({
      workspaceId,
      dashboardId: dashboard.dashboard.id,
      type: selectedDefinition.type,
      savedViewId: selectedDefinition.requiresSavedView ? savedViewId.trim() : null,
      config: { limit: 10 }
    });

    setWidgetMutationBusy(false);

    if (result === undefined) {
      setError("Dashboard layout editing is not available.");
      return;
    }

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    await refreshDashboard();
  }

  async function removeDashboardWidget(widgetId: string): Promise<void> {
    setWidgetMutationBusy(true);
    setError(null);

    const result = await apiClient.dashboard.removeWidget?.({ widgetId });

    setWidgetMutationBusy(false);

    if (result === undefined) {
      setError("Dashboard layout editing is not available.");
      return;
    }

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    await refreshDashboard();
  }

  async function moveDashboardWidget(widgetId: string, direction: -1 | 1): Promise<void> {
    if (dashboard === null) {
      return;
    }

    const currentIds = orderedWidgets.map((widget) => widget.widget.id);
    const index = currentIds.indexOf(widgetId);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= currentIds.length) {
      return;
    }

    const nextIds = [...currentIds];
    const currentId = nextIds[index];
    const targetId = nextIds[targetIndex];
    if (currentId === undefined || targetId === undefined) {
      return;
    }
    nextIds[index] = targetId;
    nextIds[targetIndex] = currentId;

    setWidgetMutationBusy(true);
    setError(null);

    const result = await apiClient.dashboard.reorderWidgets?.({
      dashboardId: dashboard.dashboard.id,
      widgetIds: nextIds
    });

    setWidgetMutationBusy(false);

    if (result === undefined) {
      setError("Dashboard layout editing is not available.");
      return;
    }

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setDashboard(result.data);
  }

  async function resizeDashboardWidget(widget: DashboardWidgetSummary, width: number): Promise<void> {
    setWidgetMutationBusy(true);
    setError(null);

    const position = readWidgetPosition(widget.widget.positionJson);
    const result = await apiClient.dashboard.updateWidget?.({
      widgetId: widget.widget.id,
      position: { ...position, width }
    });

    setWidgetMutationBusy(false);

    if (result === undefined) {
      setError("Dashboard layout editing is not available.");
      return;
    }

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    await refreshDashboard();
  }

  if (currentWorkspace === null && initialDashboard === undefined) {
    return (
      <section className="dashboard-page">
        <div className="page-heading">
          <p className="top-eyebrow">Overview</p>
          <h2>Dashboard</h2>
          <p>Open a local workspace to see dashboard widgets.</p>
        </div>
      </section>
    );
  }

  const widgets = dashboard?.widgets ?? [];
  const orderedWidgets = [...widgets].sort((a, b) =>
    a.widget.sortOrder === b.widget.sortOrder
      ? a.widget.createdAt.localeCompare(b.widget.createdAt)
      : a.widget.sortOrder - b.widget.sortOrder
  );

  return (
    <section className="dashboard-page" data-space-budget-surface="dashboard-work-loop">
      <div className="page-heading page-heading-actions">
        <div>
          <p className="top-eyebrow">Overview</p>
          <h2>{dashboard?.dashboard.name ?? "Dashboard"}</h2>
          <p>
            Workspace widgets for due work, overdue recovery, upcoming tasks,
            favorite projects, project health, and recent activity.
          </p>
        </div>
        <div className="button-row">
          <button
            className={editMode ? "primary-button compact-button" : "secondary-button compact-button"}
            disabled={loading || dashboard === null}
            type="button"
            onClick={() => setEditMode((value) => !value)}
          >
            <Edit3 size={16} aria-hidden="true" />
            {editMode ? "Done editing" : "Edit layout"}
          </button>
          <button
            className="secondary-button compact-button"
            disabled={printBusy || loading}
            type="button"
            onClick={() => void printDashboardPdf()}
          >
            <Printer size={16} aria-hidden="true" />
            Print / PDF
          </button>
          <button
            className="secondary-button compact-button"
            disabled={loading}
            type="button"
            onClick={() => void refreshDashboard()}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}
      {taskMutationError === null ? null : (
        <p className="form-message form-message-error">{taskMutationError}</p>
      )}
      {printMessage === null ? null : (
        <p className="form-message">{printMessage}</p>
      )}

      <DashboardOperatorSummary
        favorites={getFavoriteWidgetItems(orderedWidgets)}
        projectHealth={getProjectHealthWidgetItems(orderedWidgets)}
        recentActivity={getActivityWidgetItems(orderedWidgets)}
        todayTasks={getTaskWidgetItems(orderedWidgets, "today")}
        overdueTasks={getTaskWidgetItems(orderedWidgets, "overdue")}
        upcomingTasks={getTaskWidgetItems(orderedWidgets, "upcoming")}
      />

      {editMode ? (
        <DashboardEditorPanel
          busy={widgetMutationBusy}
          definitions={widgetDefinitions}
          savedViewId={savedViewId}
          selectedType={selectedWidgetType}
          widgets={orderedWidgets}
          onAddWidget={() => void addDashboardWidget()}
          onMoveWidget={(widgetId, direction) => void moveDashboardWidget(widgetId, direction)}
          onRemoveWidget={(widgetId) => void removeDashboardWidget(widgetId)}
          onResizeWidget={(widget, width) => void resizeDashboardWidget(widget, width)}
          onSavedViewIdChange={setSavedViewId}
          onSelectedTypeChange={setSelectedWidgetType}
        />
      ) : null}

      <div className="dashboard-widget-grid" aria-busy={loading || busyTaskId !== null}>
        {orderedWidgets.map((widget) => (
          <DashboardWidgetRenderer
            key={widget.widget.id}
            busyTaskId={busyTaskId}
            loading={loading && dashboard === null}
            widget={widget}
            webWidgetsEnabled={webWidgetsEnabled}
            onOpenActivityTarget={openActivityTarget}
            onOpenFavorite={openFavorite}
            onOpenProjectHealth={openProjectHealth}
            onOpenTask={openTask}
            onRescheduleTask={rescheduleTask}
            onSnoozeTask={snoozeTask}
          />
        ))}
      </div>
    </section>
  );
}

type DashboardOperatorSummaryProps = {
  todayTasks: DashboardTaskWidgetItem[];
  overdueTasks: DashboardTaskWidgetItem[];
  upcomingTasks: DashboardTaskWidgetItem[];
  favorites: DashboardFavoriteWidgetItem[];
  projectHealth: ProjectHealthViewModel[];
  recentActivity: DashboardActivityWidgetItem[];
};

function DashboardOperatorSummary({
  todayTasks,
  overdueTasks,
  upcomingTasks,
  favorites,
  projectHealth,
  recentActivity
}: DashboardOperatorSummaryProps): React.JSX.Element {
  const riskProjects = projectHealth.filter(
    (project) => project.overdueTaskCount > 0 || project.isStale || project.waitingTaskCount > 0
  );

  return (
    <section className="dashboard-operator-summary" aria-label="Dashboard work-loop summary">
      <div className="dashboard-operator-primary">
        <div className="section-heading">
          <div>
            <p className="top-eyebrow">Daily work first</p>
            <h3>Actionable overview</h3>
          </div>
        </div>
        <dl className="workspace-summary-metrics">
          <div>
            <dt>Today</dt>
            <dd>{todayTasks.length}</dd>
          </div>
          <div data-dashboard-risk={overdueTasks.length > 0 ? "true" : "false"}>
            <dt>Overdue</dt>
            <dd>{overdueTasks.length}</dd>
          </div>
          <div>
            <dt>Upcoming</dt>
            <dd>{upcomingTasks.length}</dd>
          </div>
          <div>
            <dt>Health risks</dt>
            <dd>{riskProjects.length}</dd>
          </div>
        </dl>
      </div>

      <div className="dashboard-operator-list">
        <strong>Pinned/recent launch points</strong>
        {favorites.slice(0, 3).map((favorite) => (
          <span key={`${favorite.targetType}:${favorite.targetId}`}>
            {favorite.title} - {favorite.subtitle}
          </span>
        ))}
        {favorites.length === 0 ? <span>No pinned work yet.</span> : null}
      </div>

      <div className="dashboard-operator-list">
        <strong>Recent movement</strong>
        {recentActivity.slice(0, 3).map((activity) => (
          <span key={activity.activityId}>
            {activity.description} · {formatAustralianDate(activity.createdAt)}
          </span>
        ))}
        {recentActivity.length === 0 ? <span>No recent activity in this dashboard window.</span> : null}
      </div>

      <div className="dashboard-operator-secondary">
        <strong>Maintenance stays secondary</strong>
        <span>Edit layout, print/PDF, web widgets, and troubleshooting tools remain available without replacing Today, pinned work, and project health as the primary scan.</span>
      </div>
    </section>
  );
}

function getTaskWidgetItems(
  widgets: readonly DashboardWidgetSummary[],
  type: "today" | "overdue" | "upcoming"
): DashboardTaskWidgetItem[] {
  const data = findWidgetData(widgets, type);

  if (
    data === null ||
    (data.widgetType !== "today" &&
      data.widgetType !== "overdue" &&
      data.widgetType !== "upcoming")
  ) {
    return [];
  }

  return data.items.map(toDashboardTaskWidgetItem);
}

function getFavoriteWidgetItems(
  widgets: readonly DashboardWidgetSummary[]
): DashboardFavoriteWidgetItem[] {
  const data = findWidgetData(widgets, "favorites");

  if (data?.widgetType !== "favorites") {
    return [];
  }

  return data.items.map(toDashboardFavoriteWidgetItem);
}

function getProjectHealthWidgetItems(
  widgets: readonly DashboardWidgetSummary[]
): ProjectHealthViewModel[] {
  const data = findWidgetData(widgets, "project_health");

  if (data?.widgetType !== "project_health") {
    return [];
  }

  return data.items.map(toProjectHealthWidgetItem);
}

function getActivityWidgetItems(
  widgets: readonly DashboardWidgetSummary[]
): DashboardActivityWidgetItem[] {
  const data = findWidgetData(widgets, "recent_activity");

  if (data?.widgetType !== "recent_activity") {
    return [];
  }

  return data.items.map(toDashboardActivityWidgetItem);
}

function findWidgetData(
  widgets: readonly DashboardWidgetSummary[],
  type: string
): DashboardWidgetDataSummary | null {
  return widgets.find((entry) => entry.widget.type === type)?.data ?? null;
}

function toDashboardTaskWidgetItem(
  item: DashboardTaskWidgetItemSummary
): DashboardTaskWidgetItem {
  return {
    itemId: item.itemId,
    title: item.title,
    containerId: item.containerId,
    dueAt: item.dueAt,
    taskStatus: item.taskStatus,
    priority: item.priority
  };
}

function toDashboardFavoriteWidgetItem(
  favorite: DashboardFavoriteWidgetItemSummary
): DashboardFavoriteWidgetItem {
  return {
    targetType: favorite.targetType,
    targetId: favorite.targetId,
    workspaceId: favorite.workspaceId,
    title: favorite.title,
    subtitle: favorite.subtitle,
    path: favorite.path,
    source: favorite.source,
    targetKind: favorite.targetKind,
    containerId: favorite.containerId,
    containerType: favorite.containerType,
    containerTitle: favorite.containerTitle
  };
}

function toProjectHealthWidgetItem(
  project: DashboardProjectHealthWidgetItemSummary
): ProjectHealthViewModel {
  return {
    projectId: project.projectId,
    name: project.name,
    status: project.status,
    color: project.color,
    openTaskCount: project.openTaskCount,
    completedTaskCount: project.completedTaskCount,
    overdueTaskCount: project.overdueTaskCount,
    upcomingTaskCount: project.upcomingTaskCount,
    waitingTaskCount: project.waitingTaskCount,
    totalTaskCount: project.totalTaskCount,
    completionRatio: project.completionRatio,
    staleAfterDays: project.staleAfterDays,
    lastActivityAt: project.lastActivityAt,
    isStale: project.isStale,
    hasRecentActivity: project.hasRecentActivity,
    nextDueTask: project.nextDueTask,
    nextTask: project.nextTask,
    healthBadges: project.healthBadges,
    recentActivity: project.recentActivity
  };
}

function toDashboardActivityWidgetItem(
  activity: DashboardActivityWidgetItemSummary
): DashboardActivityWidgetItem {
  return {
    activityId: activity.activityId,
    action: activity.action,
    description: activity.description,
    createdAt: activity.createdAt,
    targetType: activity.targetNavigationTarget.targetType,
    targetId: activity.targetNavigationTarget.targetId
  };
}


type DashboardWidgetRendererProps = {
  widget: DashboardWidgetSummary;
  loading: boolean;
  busyTaskId: string | null;
  webWidgetsEnabled: boolean;
  onOpenTask: (task: DashboardTaskWidgetItem) => void;
  onSnoozeTask: (task: DashboardTaskWidgetItem, preset: SnoozePreset) => Promise<void>;
  onRescheduleTask: (task: DashboardTaskWidgetItem, dueAt: string | null) => Promise<void>;
  onOpenFavorite: (favorite: DashboardFavoriteWidgetItem) => void;
  onOpenProjectHealth: (project: ProjectHealthViewModel) => void;
  onOpenActivityTarget: (activity: DashboardActivityWidgetItem) => void;
};

function DashboardWidgetRenderer({
  widget,
  loading,
  busyTaskId,
  webWidgetsEnabled,
  onOpenTask,
  onSnoozeTask,
  onRescheduleTask,
  onOpenFavorite,
  onOpenProjectHealth,
  onOpenActivityTarget
}: DashboardWidgetRendererProps): React.JSX.Element {
  const width = readWidgetPosition(widget.widget.positionJson).width ?? 1;
  const className = width > 1 ? "dashboard-widget-span-2" : undefined;

  switch (widget.widget.type) {
    case "today":
      return (
        <div className={className}>
          <TodayWidget
            loading={loading || busyTaskId !== null}
            tasks={getTaskWidgetItems([widget], "today")}
            onOpenTask={onOpenTask}
            onRescheduleTask={onRescheduleTask}
            onSnoozeTask={onSnoozeTask}
          />
        </div>
      );
    case "overdue":
      return (
        <div className={className}>
          <OverdueWidget
            loading={loading || busyTaskId !== null}
            tasks={getTaskWidgetItems([widget], "overdue")}
            onOpenTask={onOpenTask}
            onRescheduleTask={onRescheduleTask}
            onSnoozeTask={onSnoozeTask}
          />
        </div>
      );
    case "upcoming":
      return (
        <div className={className}>
          <UpcomingWidget
            loading={loading || busyTaskId !== null}
            tasks={getTaskWidgetItems([widget], "upcoming")}
            onOpenTask={onOpenTask}
            onRescheduleTask={onRescheduleTask}
            onSnoozeTask={onSnoozeTask}
          />
        </div>
      );
    case "favorites":
      return (
        <div className={className}>
          <FavoriteProjectsWidget
            loading={loading}
            favorites={getFavoriteWidgetItems([widget])}
            onOpenFavorite={onOpenFavorite}
          />
        </div>
      );
    case "project_health":
      return (
        <div className={className}>
          <ProjectHealthWidget
            loading={loading}
            projects={getProjectHealthWidgetItems([widget])}
            onOpenProject={onOpenProjectHealth}
          />
        </div>
      );
    case "recent_activity":
      return (
        <div className={className}>
          <RecentActivityWidget
            activity={getActivityWidgetItems([widget])}
            loading={loading}
            onOpenActivityTarget={onOpenActivityTarget}
          />
        </div>
      );
    case "calendar": {
      const data = widget.data?.widgetType === "calendar" ? widget.data : null;
      return (
        <div className={className}>
          <MiniCalendarWidget
            loading={loading}
            month={data?.month ?? new Date().toISOString().slice(0, 7)}
            totalCount={data?.totalCount ?? 0}
            days={data?.days ?? []}
          />
        </div>
      );
    }
    case "timeline": {
      const data = widget.data?.widgetType === "timeline" ? widget.data.summary : null;
      return (
        <div className={className}>
          <MiniTimelineWidget
            loading={loading}
            range={data?.range ?? { startInclusive: new Date().toISOString(), endExclusive: new Date().toISOString() }}
            itemCount={data?.workload.itemCount ?? 0}
            activeCount={data?.workload.activeCount ?? 0}
            groups={data?.groups ?? []}
          />
        </div>
      );
    }
    case "pomodoro": {
      const config = readWidgetConfig(widget.widget.configJson);
      return (
        <div className={className}>
          <PomodoroWidget
            focusMinutes={readPositiveInteger(config.focusMinutes, 25)}
            breakMinutes={readPositiveInteger(config.breakMinutes, 5)}
          />
        </div>
      );
    }
    case "web": {
      const config = readWidgetConfig(widget.widget.configJson);
      return (
        <div className={className}>
          <WebWidget
            title={widget.widget.title ?? readString(config.title, "Saved web link")}
            url={readOptionalString(config.url)}
            networkEnabled={config.networkEnabled === true && webWidgetsEnabled}
          />
        </div>
      );
    }
    case "static_text": {
      const config = readWidgetConfig(widget.widget.configJson);
      return (
        <div className={className}>
          <StaticTextWidget
            title={widget.widget.title ?? readString(config.title, "Static Text")}
            text={readOptionalString(config.text)}
          />
        </div>
      );
    }
    default:
      return (
        <div className={className}>
          <DashboardWidget
            count={0}
            description={placeholderWidgetDescription(widget)}
            kind={placeholderWidgetKind(widget.widget.type)}
            title={widget.widget.title ?? placeholderWidgetTitle(widget.widget.type)}
            emptyTitle="Widget configured"
            emptyDescription="This widget type is saved in the local dashboard layout and will show data when its source view is available."
          />
        </div>
      );
  }
}

type DashboardEditorPanelProps = {
  busy: boolean;
  definitions: DashboardWidgetDefinitionSummary[];
  selectedType: string;
  savedViewId: string;
  widgets: DashboardWidgetSummary[];
  onAddWidget: () => void;
  onMoveWidget: (widgetId: string, direction: -1 | 1) => void;
  onRemoveWidget: (widgetId: string) => void;
  onResizeWidget: (widget: DashboardWidgetSummary, width: number) => void;
  onSelectedTypeChange: (type: string) => void;
  onSavedViewIdChange: (savedViewId: string) => void;
};

function DashboardEditorPanel({
  busy,
  definitions,
  selectedType,
  savedViewId,
  widgets,
  onAddWidget,
  onMoveWidget,
  onRemoveWidget,
  onResizeWidget,
  onSelectedTypeChange,
  onSavedViewIdChange
}: DashboardEditorPanelProps): React.JSX.Element {
  const selectedDefinition = definitions.find((definition) => definition.type === selectedType);

  return (
    <section className="dashboard-editor-panel" aria-label="Dashboard layout editor">
      <div className="dashboard-editor-add-row">
        <label>
          Widget
          <select
            value={selectedType}
            onChange={(event) => onSelectedTypeChange(event.target.value)}
          >
            {definitions.map((definition) => (
              <option key={definition.type} value={definition.type}>
                {definition.title}
              </option>
            ))}
          </select>
        </label>
        {selectedDefinition?.requiresSavedView ? (
          <label>
            Saved view ID
            <input
              value={savedViewId}
              placeholder="saved_view_..."
              onChange={(event) => onSavedViewIdChange(event.target.value)}
            />
          </label>
        ) : null}
        <button
          className="primary-button compact-button"
          disabled={busy || definitions.length === 0}
          type="button"
          onClick={onAddWidget}
        >
          <Plus size={16} aria-hidden="true" />
          Add widget
        </button>
      </div>

      <ol className="dashboard-editor-list">
        {widgets.map((widget, index) => {
          const position = readWidgetPosition(widget.widget.positionJson);
          const width = position.width ?? 1;
          return (
            <li key={widget.widget.id}>
              <span>
                <Settings size={14} aria-hidden="true" />
                {widget.widget.title ?? placeholderWidgetTitle(widget.widget.type)}
                <small>{widget.widget.type}</small>
              </span>
              <div className="button-row">
                <button className="secondary-button compact-button" disabled={busy || index === 0} type="button" onClick={() => onMoveWidget(widget.widget.id, -1)}>
                  <ArrowUp size={14} aria-hidden="true" />
                  Up
                </button>
                <button className="secondary-button compact-button" disabled={busy || index === widgets.length - 1} type="button" onClick={() => onMoveWidget(widget.widget.id, 1)}>
                  <ArrowDown size={14} aria-hidden="true" />
                  Down
                </button>
                <button className="secondary-button compact-button" disabled={busy} type="button" onClick={() => onResizeWidget(widget, width > 1 ? 1 : 2)}>
                  {width > 1 ? "1 col" : "2 col"}
                </button>
                <button className="danger-button compact-button" disabled={busy} type="button" onClick={() => onRemoveWidget(widget.widget.id)}>
                  <Trash2 size={14} aria-hidden="true" />
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function readWidgetPosition(positionJson: string): { column: number; row: number; width?: number; height?: number } {
  try {
    const value = JSON.parse(positionJson) as unknown;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      return {
        column: Number.isInteger(record.column) ? Number(record.column) : 0,
        row: Number.isInteger(record.row) ? Number(record.row) : 0,
        ...(Number.isInteger(record.width) ? { width: Number(record.width) } : {}),
        ...(Number.isInteger(record.height) ? { height: Number(record.height) } : {})
      };
    }
  } catch {
    // Fall through to default below.
  }

  return { column: 0, row: 0, width: 1, height: 1 };
}

function placeholderWidgetKind(type: string): "saved_view" | "timeline" | "calendar" | "web" | "pomodoro" | "static_text" {
  if (type === "timeline" || type === "calendar" || type === "web" || type === "pomodoro" || type === "static_text") {
    return type;
  }
  return "saved_view";
}

function placeholderWidgetTitle(type: string): string {
  switch (type) {
    case "saved_view":
      return "Saved View";
    case "timeline":
      return "Timeline";
    case "calendar":
      return "Calendar";
    case "web":
      return "Web Link";
    case "pomodoro":
      return "Pomodoro";
    case "static_text":
      return "Static Text";
    default:
      return "Custom Widget";
  }
}

function placeholderWidgetDescription(widget: DashboardWidgetSummary): string {
  if (widget.widget.type === "saved_view" && widget.widget.savedViewId !== null) {
    return `Saved view widget bound to ${widget.widget.savedViewId}.`;
  }
  return placeholderWidgetTitle(widget.widget.type);
}

function readWidgetConfig(configJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(configJson) as unknown;
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readPositiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}
