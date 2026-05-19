import { Link } from "react-router-dom";
import { useEffect } from "react";
import { onboardingChecklist } from "@local-work-os/features/help";
import { EmptyState, OnboardingChecklist, renderLoadableState } from "@local-work-os/ui";
import { WorkspaceHealthPanel } from "./WorkspaceHealthPanel";
import type {
  DashboardActivityWidgetItemSummary,
  DashboardFavoriteWidgetItemSummary,
  DashboardProjectHealthWidgetItemSummary,
  DashboardTaskWidgetItemSummary,
  DashboardViewModelSummary,
  DashboardWidgetDataSummary,
  LocalWorkOsApi,
  PinnedFavoriteTargetSummary,
  ProjectSummary,
  WorkspaceSummary
} from "../../preload/api";
import {
  refreshCurrentWorkspace,
  useWorkspaceStore
} from "../state/workspaceStore";
import { desktopApiClient } from "../api/desktopApiClient";
import { useState } from "react";

type WorkspaceHomePageProps = {
  apiClient?: LocalWorkOsApi;
  initialDashboard?: DashboardViewModelSummary | null;
  initialPinnedWork?: PinnedFavoriteTargetSummary[];
  initialProjects?: ProjectSummary[];
  initialWorkspace?: WorkspaceSummary | null;
};

export function WorkspaceHomePage({
  apiClient = desktopApiClient,
  initialDashboard,
  initialPinnedWork,
  initialProjects,
  initialWorkspace
}: WorkspaceHomePageProps = {}): React.JSX.Element {
  const { currentWorkspace: storedWorkspace, loading } = useWorkspaceStore();
  const currentWorkspace = initialWorkspace !== undefined ? initialWorkspace : storedWorkspace;
  const [dashboard, setDashboard] = useState<DashboardViewModelSummary | null>(
    initialDashboard ?? null
  );
  const [pinnedWork, setPinnedWork] = useState<PinnedFavoriteTargetSummary[]>(
    initialPinnedWork ?? []
  );
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects ?? []);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (initialWorkspace !== undefined) {
      return;
    }

    void refreshCurrentWorkspace(desktopApiClient);
  }, [initialWorkspace]);

  useEffect(() => {
    if (
      currentWorkspace === null ||
      initialDashboard !== undefined ||
      initialPinnedWork !== undefined ||
      initialProjects !== undefined
    ) {
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadOperatorSummary(): Promise<void> {
      setSummaryError(null);

      const [dashboardResult, pinnedResult, projectsResult] = await Promise.all([
        apiClient.dashboard.getDefault({ workspaceId }),
        apiClient.navigation.listPinnedFavorites(workspaceId),
        apiClient.projects.list({ workspaceId, includeArchived: false })
      ]);

      if (!active) {
        return;
      }

      if (dashboardResult.ok) {
        setDashboard(dashboardResult.data);
      } else {
        setSummaryError(dashboardResult.error.message);
      }

      if (pinnedResult.ok) {
        setPinnedWork(pinnedResult.data);
      }

      if (projectsResult.ok) {
        setProjects(projectsResult.data.filter((project) => project.archivedAt === null));
      }
    }

    void loadOperatorSummary();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, initialDashboard, initialPinnedWork, initialProjects]);

  const favoriteWidgetItems = getFavorites(dashboard);
  const pinnedItems = pinnedWork.length > 0 ? pinnedWork : favoriteWidgetItems;
  const activeProjects = projects.filter((project) => project.status === "active");
  const todayTasks = getTasks(dashboard, "today");
  const overdueTasks = getTasks(dashboard, "overdue");
  const upcomingTasks = getTasks(dashboard, "upcoming");
  const projectHealth = getProjectHealth(dashboard);
  const recentActivity = getRecentActivity(dashboard);

  return (
    <section className="workspace-page" data-space-budget-surface="workspace-home">
      <div className="page-heading">
        <p className="top-eyebrow">Workspace</p>
        <h2>{currentWorkspace?.name ?? "Workspace Home"}</h2>
        <p>
          {currentWorkspace === null
            ? "Open a local workspace to begin."
            : currentWorkspace.rootPath}
        </p>
      </div>

      {renderLoadableState({
        loading: loading && currentWorkspace === null,
        loadingLabel: "Checking current workspace..."
      })}

      {currentWorkspace === null ? (
        <EmptyState
          action={
            <div className="empty-state-action-row">
              <Link to="/welcome" className="primary-button page-action-link">
                Open workspace
              </Link>
              <Link to="/help" className="secondary-button page-action-link">
                Read local help
              </Link>
            </div>
          }
          description="Create or open a local workspace before using projects, tasks, files, and search."
          title="No workspace open"
        />
      ) : null}

      {currentWorkspace === null ? null : (
        <div className="workspace-operator-surface">
          <section className="workspace-pinned-work-panel" aria-label="Pinned and recent work">
            <div className="section-heading">
              <div>
                <p className="top-eyebrow">Launch points</p>
                <h3>Pinned and recent work</h3>
              </div>
              <Link to="/projects" className="secondary-button compact-button">
                Open projects
              </Link>
            </div>
            <div className="workspace-pinned-work-strip">
              {pinnedItems.slice(0, 6).map((item) => (
                <Link key={`${item.targetType}:${item.targetId}`} to={item.path} className="workspace-pinned-card">
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                  <small>
                    {item.source === "favorite" ? "Pinned favorite" : "Pinned item"} · {formatDateLabel(item.updatedAt)}
                  </small>
                </Link>
              ))}
              {pinnedItems.length === 0
                ? activeProjects.slice(0, 4).map((project) => (
                    <Link key={project.id} to={`/projects/${project.id}`} className="workspace-pinned-card">
                      <strong>{project.name}</strong>
                      <span>{project.description ?? "No next action recorded yet."}</span>
                      <small>{project.status} · {formatDateLabel(project.updatedAt)}</small>
                    </Link>
                  ))
                : null}
              {pinnedItems.length === 0 && activeProjects.length === 0 ? (
                <div className="workspace-pinned-card workspace-pinned-card-empty">
                  <strong>No pinned work yet</strong>
                  <span>Create or favorite projects so the workspace home becomes a launch surface.</span>
                  <small>Daily work stays ahead of maintenance.</small>
                </div>
              ) : null}
            </div>
          </section>

          {summaryError === null ? null : (
            <p className="form-message form-message-error">{summaryError}</p>
          )}

          <div className="workspace-home-grid">
            <section className="workspace-feed-panel" aria-label="Operator feed">
              <div className="section-heading">
                <div>
                  <p className="top-eyebrow">Operator feed</p>
                  <h3>Recent movement</h3>
                </div>
                <Link to="/search" className="secondary-button compact-button">
                  Search
                </Link>
              </div>
              <div className="workspace-feed-list">
                {recentActivity.slice(0, 6).map((activity) => (
                  <div key={activity.activityId} className="workspace-feed-row">
                    <strong>{activity.description}</strong>
                    <span>{formatDateLabel(activity.createdAt)} · {activity.action}</span>
                  </div>
                ))}
                {recentActivity.length === 0 ? (
                  <div className="workspace-feed-row">
                    <strong>Workspace activity will appear here</strong>
                    <span>Create, move, tag, complete, and restore work to build the local audit trail.</span>
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="workspace-today-panel" aria-label="Today summary">
              <div className="section-heading">
                <div>
                  <p className="top-eyebrow">Today</p>
                  <h3>Plan and unblock</h3>
                </div>
                <Link to="/today" className="primary-button compact-button">
                  Open Today
                </Link>
              </div>
              <dl className="workspace-summary-metrics">
                <div>
                  <dt>Today</dt>
                  <dd>{todayTasks.length}</dd>
                </div>
                <div>
                  <dt>Overdue</dt>
                  <dd>{overdueTasks.length}</dd>
                </div>
                <div>
                  <dt>Upcoming</dt>
                  <dd>{upcomingTasks.length}</dd>
                </div>
              </dl>
              <div className="workspace-task-list">
                {[...overdueTasks, ...todayTasks, ...upcomingTasks].slice(0, 3).map((task) => (
                  <Link key={task.itemId} to={`/projects/${task.containerId}`} className="workspace-task-row">
                    <strong>{task.title}</strong>
                    <span>{formatDateLabel(task.dueAt)} · {task.taskStatus}</span>
                  </Link>
                ))}
              </div>
            </aside>

            <aside className="workspace-project-health-panel" aria-label="Project health summary">
              <div className="section-heading">
                <div>
                  <p className="top-eyebrow">Project health</p>
                  <h3>Where attention is needed</h3>
                </div>
                <Link to="/dashboard" className="secondary-button compact-button">
                  Dashboard
                </Link>
              </div>
              <div className="workspace-health-list">
                {projectHealth.slice(0, 3).map((health) => (
                  <Link key={health.projectId} to={`/projects/${health.projectId}`} className="workspace-health-card">
                    <span className="project-list-color" style={{ backgroundColor: health.color ?? "#245c55" }} aria-hidden="true" />
                    <span>
                      <strong>{health.name}</strong>
                      <small>
                        {health.status} · {health.openTaskCount} open · {health.overdueTaskCount} overdue
                      </small>
                    </span>
                  </Link>
                ))}
                {projectHealth.length === 0 ? (
                  <div className="workspace-health-card">
                    <span className="project-list-color" aria-hidden="true" />
                    <span>
                      <strong>No project health signals yet</strong>
                      <small>Projects with tasks and activity will appear here.</small>
                    </span>
                  </div>
                ) : null}
              </div>
            </aside>

            <aside className="workspace-maintenance-panel" aria-label="Secondary maintenance actions">
              <div className="section-heading">
                <div>
                  <p className="top-eyebrow">Secondary</p>
                  <h3>Maintenance</h3>
                </div>
              </div>
              <p>Backup, restore, import, export, and trash remain available without competing with daily work.</p>
              <div className="button-row">
                <Link to="/settings" className="secondary-button compact-button">
                  Settings / backup
                </Link>
                <Link to="/trash" className="secondary-button compact-button">
                  Trash
                </Link>
              </div>
            </aside>
          </div>

          <div className="workspace-onboarding-panel">
            <OnboardingChecklist items={onboardingChecklist} />
            <Link to="/help" className="secondary-button page-action-link">
              Open full help center
            </Link>
          </div>
        </div>
      )}

      <WorkspaceHealthPanel workspace={currentWorkspace} />
    </section>
  );
}

function findWidgetData(
  dashboard: DashboardViewModelSummary | null,
  type: string
): DashboardWidgetDataSummary | null {
  return dashboard?.widgets.find((entry) => entry.widget.type === type)?.data ?? null;
}

function getTasks(
  dashboard: DashboardViewModelSummary | null,
  type: "today" | "overdue" | "upcoming"
): DashboardTaskWidgetItemSummary[] {
  const data = findWidgetData(dashboard, type);
  return data?.widgetType === type ? data.items : [];
}

function getFavorites(
  dashboard: DashboardViewModelSummary | null
): DashboardFavoriteWidgetItemSummary[] {
  const data = findWidgetData(dashboard, "favorites");
  return data?.widgetType === "favorites" ? data.items : [];
}

function getProjectHealth(
  dashboard: DashboardViewModelSummary | null
): DashboardProjectHealthWidgetItemSummary[] {
  const data = findWidgetData(dashboard, "project_health");
  return data?.widgetType === "project_health" ? data.items : [];
}

function getRecentActivity(
  dashboard: DashboardViewModelSummary | null
): DashboardActivityWidgetItemSummary[] {
  const data = findWidgetData(dashboard, "recent_activity");
  return data?.widgetType === "recent_activity" ? data.items : [];
}

function formatDateLabel(value: string | null): string {
  if (value === null || value.length === 0) {
    return "No date";
  }
  return value.slice(0, 10);
}
