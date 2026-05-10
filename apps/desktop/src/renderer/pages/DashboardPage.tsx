import { Printer, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FavoriteProjectsWidget,
  OverdueWidget,
  ProjectHealthWidget,
  RecentActivityWidget,
  TodayWidget,
  UpcomingWidget,
  type DashboardActivityWidgetItem,
  type DashboardFavoriteWidgetItem,
  type DashboardTaskWidgetItem,
  type ProjectHealthViewModel
} from "@local-work-os/ui";
import type {
  DashboardActivityWidgetItemSummary,
  DashboardFavoriteWidgetItemSummary,
  DashboardProjectHealthWidgetItemSummary,
  DashboardTaskWidgetItemSummary,
  DashboardViewModelSummary,
  DashboardWidgetDataSummary,
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
  const [printBusy, setPrintBusy] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialDashboard !== undefined) {
      return;
    }

    if (currentWorkspace === null) {
      setDashboard(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadDashboard(): Promise<void> {
      setLoading(true);
      setError(null);

      const result = await apiClient.dashboard.getDefault({ workspaceId });

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setDashboard(result.data);
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, initialDashboard]);

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

  return (
    <section className="dashboard-page">
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
      {printMessage === null ? null : (
        <p className="form-message">{printMessage}</p>
      )}

      <div className="dashboard-widget-grid" aria-busy={loading}>
        <TodayWidget
          loading={loading && dashboard === null}
          tasks={getTaskWidgetItems(widgets, "today")}
          onOpenTask={openTask}
        />
        <OverdueWidget
          loading={loading && dashboard === null}
          tasks={getTaskWidgetItems(widgets, "overdue")}
          onOpenTask={openTask}
        />
        <UpcomingWidget
          loading={loading && dashboard === null}
          tasks={getTaskWidgetItems(widgets, "upcoming")}
          onOpenTask={openTask}
        />
        <FavoriteProjectsWidget
          loading={loading && dashboard === null}
          favorites={getFavoriteWidgetItems(widgets)}
          onOpenFavorite={openFavorite}
        />
        <ProjectHealthWidget
          loading={loading && dashboard === null}
          projects={getProjectHealthWidgetItems(widgets)}
          onOpenProject={openProjectHealth}
        />
        <RecentActivityWidget
          activity={getActivityWidgetItems(widgets)}
          loading={loading && dashboard === null}
          onOpenActivityTarget={openActivityTarget}
        />
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
    totalTaskCount: project.totalTaskCount,
    nextDueTask: project.nextDueTask,
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
