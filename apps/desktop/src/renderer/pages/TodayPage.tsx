import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DailyPlannerEditor,
  EmptyState,
  ErrorState,
  TodayLane,
  type DailyPlannerSubmission,
  type SnoozePreset,
  type TodayTaskCardViewModel
} from "@local-work-os/ui";
import type {
  DailyPlanLane,
  LocalWorkOsApi,
  TodayTaskSummary,
  TodayViewModelSummary,
  PlanningSummaryViewSummary,
  TodayPreferencesSummary,
  TodayPlanningModeSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import {
  createQuickTask,
  resolveDefaultCaptureContainer,
  type QuickAddTargetResolution
} from "../components/QuickAddModal";
import { useWorkspaceStore } from "../state/workspaceStore";

type TodayPageProps = {
  apiClient?: LocalWorkOsApi;
  initialViewModel?: TodayViewModelSummary | null;
};

const DEFAULT_TODAY_LANE_LIMIT = 50;
const MAX_TODAY_LANE_LIMIT = 500;
const TODAY_LANE_LIMIT_INCREMENT = 50;

type TodayLaneViewModelKey = "dueToday" | "tomorrowPreview" | "overdueBacklog";

export function TodayPage({
  apiClient = desktopApiClient,
  initialViewModel
}: TodayPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [viewModel, setViewModel] = useState<TodayViewModelSummary | null>(
    initialViewModel ?? null
  );
  const [loading, setLoading] = useState(initialViewModel === undefined);
  const [error, setError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [plannerTarget, setPlannerTarget] =
    useState<QuickAddTargetResolution | null>(null);
  const [plannerLoading, setPlannerLoading] = useState(initialViewModel === undefined);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [exportingSummary, setExportingSummary] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [laneLimit, setLaneLimit] = useState(DEFAULT_TODAY_LANE_LIMIT);

  useEffect(() => {
    if (initialViewModel !== undefined) {
      return;
    }

    if (currentWorkspace === null) {
      setViewModel(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadToday(): Promise<void> {
      setLoading(true);
      setError(null);

      const result = await apiClient.today.getViewModel({
        workspaceId,
        laneLimit
      });

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setViewModel(result.data);
    }

    void loadToday();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, initialViewModel, laneLimit]);

  useEffect(() => {
    if (currentWorkspace === null) {
      setPlannerTarget(null);
      setPlannerLoading(false);
      setPlannerError(null);
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadPlannerTarget(): Promise<void> {
      setPlannerLoading(true);
      setPlannerError(null);
      const result = await resolveDefaultCaptureContainer(
        workspaceId,
        undefined,
        apiClient
      );

      if (!active) {
        return;
      }

      setPlannerLoading(false);

      if (!result.ok) {
        setPlannerError(result.error.message);
        return;
      }

      setPlannerTarget(result.data);
    }

    void loadPlannerTarget();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace]);

  async function refreshToday(): Promise<void> {
    const workspaceId = resolveWorkspaceId(currentWorkspace?.id, viewModel);

    if (workspaceId === null) {
      return;
    }

    await reloadToday(workspaceId);
  }

  function showMoreTodayTasks(): void {
    setLaneLimit((current) =>
      Math.min(current + TODAY_LANE_LIMIT_INCREMENT, MAX_TODAY_LANE_LIMIT)
    );
  }

  async function reloadToday(workspaceId: string): Promise<void> {
    if (viewModel === null) {
      setLoading(true);
    }

    setError(null);
    setMutationError(null);

    const result = await apiClient.today.getViewModel({
      workspaceId,
      laneLimit
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setViewModel(result.data);
  }

  async function toggleTaskComplete(
    task: TodayTaskCardViewModel
  ): Promise<void> {
    setBusyTaskId(task.itemId);
    setMutationError(null);

    const completed =
      task.taskStatus === "done" || task.itemStatus === "completed";
    const result =
      task.itemType === "list_item"
        ? completed
          ? await apiClient.lists.reopenItem(task.itemId)
          : await apiClient.lists.completeItem(task.itemId)
        : completed
          ? await apiClient.tasks.reopen(task.itemId)
          : await apiClient.tasks.complete(task.itemId);

    setBusyTaskId(null);

    if (!result.ok) {
      setMutationError(result.error.message);
      return;
    }

    await reloadToday(resolveWorkspaceId(currentWorkspace?.id, viewModel) ?? result.data.workspaceId);
  }

  async function planTask(
    task: TodayTaskCardViewModel,
    lane: "today" | "tomorrow"
  ): Promise<void> {
    const workspaceId = resolveWorkspaceId(currentWorkspace?.id, viewModel);

    if (workspaceId === null) {
      return;
    }

    setBusyTaskId(task.itemId);
    setMutationError(null);

    const result = await apiClient.today.planTask({
      workspaceId,
      itemId: task.itemId,
      lane
    });

    setBusyTaskId(null);

    if (!result.ok) {
      setMutationError(result.error.message);
      return;
    }

    await reloadToday(workspaceId);
  }

  async function unplanTask(task: TodayTaskCardViewModel): Promise<void> {
    const workspaceId = resolveWorkspaceId(currentWorkspace?.id, viewModel);

    if (workspaceId === null || task.plannedLane === null || task.plannedLane === undefined) {
      return;
    }

    setBusyTaskId(task.itemId);
    setMutationError(null);

    const result = await apiClient.today.unplanTask({
      workspaceId,
      itemId: task.itemId,
      lane: task.plannedLane
    });

    setBusyTaskId(null);

    if (!result.ok) {
      setMutationError(result.error.message);
      return;
    }

    await reloadToday(workspaceId);
  }

  async function reorderTask(
    task: TodayTaskCardViewModel,
    direction: "up" | "down"
  ): Promise<void> {
    const workspaceId = resolveWorkspaceId(currentWorkspace?.id, viewModel);

    if (
      workspaceId === null ||
      viewModel === null ||
      task.plannedLane === null ||
      task.plannedLane === undefined ||
      task.plannedSortOrder === null ||
      task.plannedSortOrder === undefined
    ) {
      return;
    }

    const laneTasks = getLaneTasks(viewModel, task.plannedLane).filter(
      (laneTask) => laneTask.plannedLane === task.plannedLane
    );
    const currentIndex = laneTasks.findIndex(
      (laneTask) => laneTask.itemId === task.itemId
    );
    const targetTask =
      currentIndex === -1
        ? undefined
        : laneTasks[currentIndex + (direction === "up" ? -1 : 1)];

    if (
      targetTask === undefined ||
      targetTask.plannedSortOrder === null ||
      targetTask.plannedSortOrder === undefined
    ) {
      return;
    }

    const sortOrder = getMovedSortOrder({
      direction,
      currentIndex,
      laneTasks,
      targetTask
    });

    setBusyTaskId(task.itemId);
    setMutationError(null);

    const result = await apiClient.today.reorderPlannedTask({
      workspaceId,
      itemId: task.itemId,
      lane: task.plannedLane,
      sortOrder
    });

    setBusyTaskId(null);

    if (!result.ok) {
      setMutationError(result.error.message);
      return;
    }

    await reloadToday(workspaceId);
  }

  async function snoozeTask(
    task: TodayTaskCardViewModel,
    preset: SnoozePreset
  ): Promise<void> {
    const workspaceId = resolveWorkspaceId(currentWorkspace?.id, viewModel);

    if (workspaceId === null) {
      return;
    }

    setBusyTaskId(task.itemId);
    setMutationError(null);

    const result =
      task.itemType === "list_item"
        ? await apiClient.lists.updateItem({
            listItemId: task.itemId,
            dueAt: resolveSnoozePresetDueAt(preset)
          })
        : await apiClient.tasks.snooze({
            itemId: task.itemId,
            preset
          });

    setBusyTaskId(null);

    if (!result.ok) {
      setMutationError(result.error.message);
      return;
    }

    await reloadToday(workspaceId);
  }

  async function rescheduleTask(
    task: TodayTaskCardViewModel,
    dueAt: string | null
  ): Promise<void> {
    const workspaceId = resolveWorkspaceId(currentWorkspace?.id, viewModel);

    if (workspaceId === null) {
      return;
    }

    setBusyTaskId(task.itemId);
    setMutationError(null);

    const result =
      task.itemType === "list_item"
        ? await apiClient.lists.updateItem({
            listItemId: task.itemId,
            dueAt
          })
        : await apiClient.tasks.reschedule({
            itemId: task.itemId,
            dueAt,
            allDay: true
          });

    setBusyTaskId(null);

    if (!result.ok) {
      setMutationError(result.error.message);
      return;
    }

    await reloadToday(workspaceId);
  }

  async function updateTodayPreferences(
    patch: Partial<Omit<TodayPreferencesSummary, "workspaceId" | "updatedAt">>
  ): Promise<void> {
    const workspaceId = resolveWorkspaceId(currentWorkspace?.id, viewModel);

    if (workspaceId === null || viewModel === null) {
      return;
    }

    setPreferencesSaving(true);
    setMutationError(null);

    const result = await apiClient.today.updatePreferences({
      workspaceId,
      ...patch
    });

    setPreferencesSaving(false);

    if (!result.ok) {
      setMutationError(result.error.message);
      return;
    }

    await reloadToday(workspaceId);
  }

  async function exportPlanningSummary(): Promise<void> {
    const workspaceId = resolveWorkspaceId(currentWorkspace?.id, viewModel);

    if (workspaceId === null || viewModel === null) {
      return;
    }

    setExportingSummary(true);
    setMutationError(null);
    setExportMessage(null);

    const result = await (apiClient.export.exportPlanningSummaryMarkdown?.({
      workspaceId,
      date: viewModel.localDate
    }) ?? Promise.resolve({
      ok: false as const,
      error: { code: "IPC_ERROR" as const, message: "Planning summary export API is not available." }
    }));

    setExportingSummary(false);

    if (!result.ok) {
      setMutationError(result.error.message);
      return;
    }

    setExportMessage(`Planning summary exported to ${result.data.relativePath}.`);
  }

  async function createPlannerTask(
    submission: DailyPlannerSubmission
  ): Promise<boolean> {
    const workspaceId = resolveWorkspaceId(currentWorkspace?.id, viewModel);

    if (workspaceId === null || plannerTarget === null) {
      setMutationError("Open a workspace before using the keyboard planner.");
      return false;
    }

    setMutationError(null);
    const created = await createQuickTask(apiClient, {
      workspaceId,
      targetContainerId: submission.targetContainerId,
      targetContainerTabId: plannerTarget.defaultContainerTabId,
      title: submission.title,
      dueDate: submission.dueDate,
      ...(submission.dueAt === undefined ? {} : { dueAt: submission.dueAt }),
      ...(submission.startAt === undefined ? {} : { startAt: submission.startAt }),
      ...(submission.allDay === undefined ? {} : { allDay: submission.allDay }),
      ...(submission.timezone === undefined ? {} : { timezone: submission.timezone })
    });

    if (!created.ok) {
      setMutationError(created.error.message);
      return false;
    }

    const planned = await apiClient.today.planTask({
      workspaceId,
      itemId: created.data.id,
      lane: submission.lane
    });

    if (!planned.ok) {
      setMutationError(planned.error.message);
      return false;
    }

    await reloadToday(workspaceId);
    return true;
  }

  function openTaskSource(task: TodayTaskCardViewModel): void {
    const sourceItemId =
      task.itemType === "list_item" && task.sourceItemId !== null && task.sourceItemId !== undefined
        ? `?item=${encodeURIComponent(task.sourceItemId)}`
        : task.itemType === "task"
          ? `?item=${encodeURIComponent(task.itemId)}`
          : "";
    navigate(`/projects/${task.containerId}${sourceItemId}`);
  }

  if (currentWorkspace === null && initialViewModel === undefined) {
    return (
      <section className="today-page">
        <div className="today-page-heading">
          <div>
            <p className="top-eyebrow">Planning</p>
            <h2>Today</h2>
            <EmptyState
              description="Open a local workspace to see due and overdue tasks."
              title="No workspace open"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="today-page">
      <div className="today-page-heading">
        <div>
          <p className="top-eyebrow">Planning</p>
          <h2>Today</h2>
          <p>
            Due, overdue, and tomorrow-preview tasks from the current local
            workspace.
          </p>
        </div>
        <button
          className="secondary-button compact-button"
          disabled={loading}
          type="button"
          onClick={() => void refreshToday()}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error === null ? null : <ErrorState error={error} title="Today error" />}
      {mutationError === null ? null : (
        <ErrorState error={mutationError} title="Task update failed" />
      )}

      {viewModel !== null && hasLimitedTodayLanes(viewModel) ? (
        <div className="today-lane-limit" role="status">
          <strong>Large Today list detected.</strong>
          <span>To keep the app responsive, each lane initially loads the earliest {laneLimit} tasks. Counts still show the full lane totals, and urgent due or overdue work stays first.</span>
        </div>
      ) : null}

      {viewModel === null ? null : (
        <DailyPlannerEditor
          disabled={plannerLoading || plannerTarget === null}
          error={plannerError}
          targetContainerId={plannerTarget?.defaultContainerId ?? ""}
          targetContainerName={plannerTarget?.inbox.name ?? "Inbox"}
          todayDueAt={viewModel.ranges.today.startInclusive}
          tomorrowDueAt={viewModel.ranges.tomorrow.startInclusive}
          onSubmit={createPlannerTask}
        />
      )}

      {viewModel?.planningSummary === undefined ? null : (
        <PlanningSummaryPanel
          disabled={exportingSummary}
          exportMessage={exportMessage}
          summary={viewModel.planningSummary}
          onExport={exportPlanningSummary}
        />
      )}

      {viewModel === null ? null : (
        <TodayPreferencesPanel
          completionSummary={viewModel.completionSummary}
          disabled={preferencesSaving}
          focusSummary={viewModel.focusSummary}
          preferences={viewModel.preferences}
          onChange={updateTodayPreferences}
        />
      )}

      <div className="today-lane-grid">
        <TodayLane
          description="Tasks due on the selected local day."
          emptyDescription="Due-today tasks will appear here once they exist."
          emptyTitle="Nothing due today"
          kind="today"
          loading={loading && viewModel === null}
          tasks={(viewModel?.dueToday ?? []).map(toTodayTaskCard)}
          title="Today"
          {...getLaneLimitProps(viewModel, "dueToday", showMoreTodayTasks)}
          busyTaskId={busyTaskId}
          onOpenSource={openTaskSource}
          onPlanTask={planTask}
          onReorderTask={reorderTask}
          onRescheduleTask={rescheduleTask}
          onSnoozeTask={snoozeTask}
          onToggleComplete={toggleTaskComplete}
          onUnplanTask={unplanTask}
        />
        <TodayLane
          description="A quick look at tasks dated for the next local day."
          emptyDescription="Tomorrow-dated tasks will appear here."
          emptyTitle="No tasks tomorrow"
          kind="tomorrow"
          loading={loading && viewModel === null}
          tasks={(viewModel?.tomorrowPreview ?? []).map(toTodayTaskCard)}
          title="Tomorrow"
          {...getLaneLimitProps(viewModel, "tomorrowPreview", showMoreTodayTasks)}
          busyTaskId={busyTaskId}
          onOpenSource={openTaskSource}
          onPlanTask={planTask}
          onReorderTask={reorderTask}
          onRescheduleTask={rescheduleTask}
          onSnoozeTask={snoozeTask}
          onToggleComplete={toggleTaskComplete}
          onUnplanTask={unplanTask}
        />
        <TodayLane
          description={`Open overdue tasks from the recent backlog window${
            viewModel === null ? "." : ` of ${viewModel.backlogDays} days.`
          }`}
          emptyDescription="Recent overdue tasks will appear here for recovery."
          emptyTitle="No recent overdue tasks"
          kind="backlog"
          loading={loading && viewModel === null}
          tasks={(viewModel?.overdueBacklog ?? []).map(toTodayTaskCard)}
          title="Backlog"
          {...getLaneLimitProps(viewModel, "overdueBacklog", showMoreTodayTasks)}
          busyTaskId={busyTaskId}
          onOpenSource={openTaskSource}
          onPlanTask={planTask}
          onReorderTask={reorderTask}
          onRescheduleTask={rescheduleTask}
          onSnoozeTask={snoozeTask}
          onToggleComplete={toggleTaskComplete}
          onUnplanTask={unplanTask}
        />
      </div>
    </section>
  );
}

type PlanningSummaryPanelProps = {
  disabled: boolean;
  exportMessage: string | null;
  summary: PlanningSummaryViewSummary;
  onExport: () => Promise<void>;
};

function PlanningSummaryPanel({
  disabled,
  exportMessage,
  summary,
  onExport
}: PlanningSummaryPanelProps): React.JSX.Element {
  return (
    <section className="planning-summary-panel" aria-labelledby="planning-summary-title">
      <div className="planning-summary-heading">
        <div>
          <p className="top-eyebrow">Local review</p>
          <h3 id="planning-summary-title">Daily and weekly summary</h3>
          <p>
            Counts are calculated locally from daily plans, task/list activity,
            and dated work. Weekly groups cover {summary.weekly.startDate} to {summary.weekly.endDate}.
          </p>
        </div>
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          type="button"
          onClick={() => void onExport()}
        >
          <Download size={16} aria-hidden="true" />
          {disabled ? "Exporting..." : "Export Markdown"}
        </button>
      </div>

      <div className="planning-summary-metrics" role="list" aria-label="Daily planning metrics">
        <PlanningMetric label="Planned" value={summary.daily.plannedCount} />
        <PlanningMetric label="Completed" value={summary.daily.completedCount} />
        <PlanningMetric label="Snoozed" value={summary.daily.snoozedCount} />
        <PlanningMetric label="Overdue" value={summary.daily.overdueCount} />
      </div>

      <p className="planning-summary-lanes">
        Today {summary.daily.plannedByLane.today} &middot; Tomorrow {summary.daily.plannedByLane.tomorrow} &middot; Backlog {summary.daily.plannedByLane.backlog}
      </p>

      <div className="planning-summary-groups">
        <PlanningGroupList title="By project" groups={summary.weekly.byProject} />
        <PlanningGroupList title="By category" groups={summary.weekly.byCategory} />
      </div>

      {exportMessage === null ? null : (
        <p className="planning-summary-export" role="status">{exportMessage}</p>
      )}
    </section>
  );
}

function PlanningMetric({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="planning-summary-metric" role="listitem">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PlanningGroupList({
  groups,
  title
}: {
  groups: PlanningSummaryViewSummary["weekly"]["byProject"];
  title: string;
}): React.JSX.Element {
  return (
    <div className="planning-summary-group-list">
      <h4>{title}</h4>
      {groups.length === 0 ? (
        <p>No local planning activity this week.</p>
      ) : (
        <ul>
          {groups.slice(0, 4).map((group) => (
            <li key={`${group.id ?? group.label}-${title}`}>
              <span>{group.label}</span>
              <small>
                {group.plannedCount} planned &middot; {group.completedCount} done &middot; {group.snoozedCount} snoozed &middot; {group.overdueCount} overdue
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type TodayPreferencesPanelProps = {
  completionSummary: TodayViewModelSummary["completionSummary"];
  disabled: boolean;
  focusSummary: TodayViewModelSummary["focusSummary"];
  preferences: TodayViewModelSummary["preferences"];
  onChange: (
    patch: Partial<Omit<TodayPreferencesSummary, "workspaceId" | "updatedAt">>
  ) => Promise<void>;
};

function TodayPreferencesPanel({
  completionSummary,
  disabled,
  focusSummary,
  preferences,
  onChange
}: TodayPreferencesPanelProps): React.JSX.Element {
  return (
    <section className="today-preferences-panel" aria-labelledby="today-preferences-title">
      <div className="today-preferences-heading">
        <div>
          <p className="top-eyebrow">Planning preferences</p>
          <h3 id="today-preferences-title">Focus mode</h3>
          <p>
            Tune the calm-planning guardrails for Today. Top Six and Ivy Lee
            cap the focus limit at six tasks, but warnings can be overridden.
          </p>
        </div>
        <div className={focusSummary.limitExceeded ? "today-focus-warning" : "today-focus-ok"} role="status">
          {focusSummary.warning ??
            `${focusSummary.plannedTodayCount}/${focusSummary.maxFocusTasks} focus tasks planned`}
        </div>
      </div>

      <div className="today-preferences-controls">
        <label>
          <span>Planning mode</span>
          <select
            disabled={disabled}
            value={preferences.planningMode}
            onChange={(event) => {
              const planningMode = event.currentTarget.value as TodayPlanningModeSummary;
              void onChange({
                planningMode,
                ...(planningMode === "top_six" || planningMode === "ivy_lee"
                  ? { maxFocusTasks: Math.min(preferences.maxFocusTasks, 6) }
                  : {})
              });
            }}
          >
            <option value="standard">Standard</option>
            <option value="top_six">Top Six</option>
            <option value="ivy_lee">Ivy Lee</option>
          </select>
        </label>
        <label>
          <span>Max focus tasks</span>
          <input
            disabled={disabled}
            max={preferences.planningMode === "standard" ? 24 : 6}
            min={1}
            type="number"
            value={preferences.maxFocusTasks}
            onChange={(event) =>
              void onChange({ maxFocusTasks: Number(event.currentTarget.value) })
            }
          />
        </label>
        <label>
          <span>Backlog lookback</span>
          <input
            disabled={disabled}
            max={365}
            min={1}
            type="number"
            value={preferences.backlogDays}
            onChange={(event) =>
              void onChange({ backlogDays: Number(event.currentTarget.value) })
            }
          />
        </label>
      </div>

      <div className="today-preferences-toggles">
        <label>
          <input
            checked={preferences.showWaiting}
            disabled={disabled}
            type="checkbox"
            onChange={(event) =>
              void onChange({ showWaiting: event.currentTarget.checked })
            }
          />
          Show waiting tasks
        </label>
        <label>
          <input
            checked={preferences.showDeferred}
            disabled={disabled}
            type="checkbox"
            onChange={(event) =>
              void onChange({ showDeferred: event.currentTarget.checked })
            }
          />
          Show deferred tasks
        </label>
        <label>
          <input
            checked={preferences.showDailyCompletionSummary}
            disabled={disabled}
            type="checkbox"
            onChange={(event) =>
              void onChange({ showDailyCompletionSummary: event.currentTarget.checked })
            }
          />
          Daily completion summary
        </label>
      </div>

      {completionSummary.show ? (
        <p className="today-completion-summary">
          Completed today: {completionSummary.completedTodayCount} item
          {completionSummary.completedTodayCount === 1 ? "" : "s"}.
        </p>
      ) : null}
    </section>
  );
}

function hasLimitedTodayLanes(viewModel: TodayViewModelSummary): boolean {
  return Object.values(viewModel.laneSummaries ?? {}).some(
    (summary) => summary.hasMore
  );
}

function getLaneLimitProps(
  viewModel: TodayViewModelSummary | null,
  key: TodayLaneViewModelKey,
  onShowMore: () => void
) {
  const fallbackTasks = viewModel?.[key] ?? [];
  const summary = viewModel?.laneSummaries?.[key] ?? {
    totalCount: fallbackTasks.length,
    returnedCount: fallbackTasks.length,
    limit: null,
    hasMore: false
  };

  return {
    totalTaskCount: summary.totalCount,
    returnedTaskCount: summary.returnedCount,
    taskLimit: summary.limit,
    hasMore: summary.hasMore,
    onShowMore
  };
}

function toTodayTaskCard(task: TodayTaskSummary): TodayTaskCardViewModel {
  return {
    itemId: task.itemId,
    itemType: task.itemType,
    sourceItemId: task.sourceItemId,
    title: task.title,
    body: task.body,
    taskStatus: task.taskStatus,
    itemStatus: task.itemStatus,
    dueAt: task.dueAt,
    priority: task.priority,
    containerId: task.containerId,
    containerLabel: task.containerTitle,
    plannedLane: task.plannedLane,
    plannedSortOrder: task.plannedSortOrder,
    addedManually: task.addedManually,
    sourceLabel: task.itemType === "list_item" ? "Open parent list" : "Open source"
  };
}

function resolveWorkspaceId(
  currentWorkspaceId: string | undefined,
  viewModel: TodayViewModelSummary | null
): string | null {
  return currentWorkspaceId ?? viewModel?.workspaceId ?? null;
}

function getLaneTasks(
  viewModel: TodayViewModelSummary,
  lane: DailyPlanLane
): TodayTaskSummary[] {
  if (lane === "today") {
    return viewModel.dueToday;
  }

  if (lane === "tomorrow") {
    return viewModel.tomorrowPreview;
  }

  return viewModel.overdueBacklog;
}

function getMovedSortOrder(input: {
  direction: "up" | "down";
  currentIndex: number;
  laneTasks: TodayTaskSummary[];
  targetTask: TodayTaskSummary;
}): number {
  const targetSortOrder = input.targetTask.plannedSortOrder ?? 0;

  if (input.direction === "up") {
    const previousTask = input.laneTasks[input.currentIndex - 2];
    const previousSortOrder = previousTask?.plannedSortOrder;

    if (previousSortOrder !== null && previousSortOrder !== undefined) {
      return Math.max(
        0,
        Math.floor((previousSortOrder + targetSortOrder) / 2)
      );
    }

    return Math.max(0, targetSortOrder - 1024);
  }

  const nextTask = input.laneTasks[input.currentIndex + 2];
  const nextSortOrder = nextTask?.plannedSortOrder;

  if (nextSortOrder !== null && nextSortOrder !== undefined) {
    return Math.max(0, Math.floor((targetSortOrder + nextSortOrder) / 2));
  }

  return targetSortOrder + 1024;
}

function resolveSnoozePresetDueAt(preset: SnoozePreset): string {
  const now = new Date();

  if (preset === "later_today") {
    const later = new Date(now);
    later.setHours(later.getHours() + 3, later.getMinutes(), 0, 0);

    if (later.toDateString() !== now.toDateString()) {
      later.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      later.setHours(23, 59, 0, 0);
    }

    return later.toISOString();
  }

  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() + (preset === "next_week" ? 7 : 1));
  return day.toISOString();
}
