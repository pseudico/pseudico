import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TodayLane,
  type TodayTaskCardViewModel
} from "@local-work-os/ui";
import type {
  LocalWorkOsApi,
  TodayTaskSummary,
  TodayViewModelSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type TodayPageProps = {
  apiClient?: LocalWorkOsApi;
  initialViewModel?: TodayViewModelSummary | null;
};

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
        workspaceId
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
  }, [apiClient, currentWorkspace, initialViewModel]);

  async function refreshToday(): Promise<void> {
    if (currentWorkspace === null) {
      return;
    }

    setLoading(true);
    setError(null);
    setMutationError(null);

    const result = await apiClient.today.getViewModel({
      workspaceId: currentWorkspace.id
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
    const result = completed
      ? await apiClient.tasks.reopen(task.itemId)
      : await apiClient.tasks.complete(task.itemId);

    setBusyTaskId(null);

    if (!result.ok) {
      setMutationError(result.error.message);
      return;
    }

    setViewModel((current) =>
      current === null
        ? current
        : updateTaskInViewModel(current, result.data.id, {
            itemStatus: result.data.status,
            taskStatus: result.data.taskStatus,
            updatedAt: result.data.updatedAt
          })
    );
  }

  function openTaskSource(task: TodayTaskCardViewModel): void {
    navigate(`/projects/${task.containerId}`);
  }

  if (currentWorkspace === null && initialViewModel === undefined) {
    return (
      <section className="today-page">
        <div className="today-page-heading">
          <div>
            <p className="top-eyebrow">Planning</p>
            <h2>Today</h2>
            <p>Open a local workspace to see due and overdue tasks.</p>
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

      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}
      {mutationError === null ? null : (
        <p className="form-message form-message-error">{mutationError}</p>
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
          busyTaskId={busyTaskId}
          onOpenSource={openTaskSource}
          onToggleComplete={toggleTaskComplete}
        />
        <TodayLane
          description="A quick look at tasks dated for the next local day."
          emptyDescription="Tomorrow-dated tasks will appear here."
          emptyTitle="No tasks tomorrow"
          kind="tomorrow"
          loading={loading && viewModel === null}
          tasks={(viewModel?.tomorrowPreview ?? []).map(toTodayTaskCard)}
          title="Tomorrow"
          busyTaskId={busyTaskId}
          onOpenSource={openTaskSource}
          onToggleComplete={toggleTaskComplete}
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
          busyTaskId={busyTaskId}
          onOpenSource={openTaskSource}
          onToggleComplete={toggleTaskComplete}
        />
      </div>
    </section>
  );
}

function toTodayTaskCard(task: TodayTaskSummary): TodayTaskCardViewModel {
  return {
    itemId: task.itemId,
    title: task.title,
    body: task.body,
    taskStatus: task.taskStatus,
    itemStatus: task.itemStatus,
    dueAt: task.dueAt,
    priority: task.priority,
    containerId: task.containerId,
    sourceLabel: "Open source"
  };
}

function updateTaskInViewModel(
  viewModel: TodayViewModelSummary,
  itemId: string,
  patch: Pick<TodayTaskSummary, "itemStatus" | "taskStatus" | "updatedAt">
): TodayViewModelSummary {
  return {
    ...viewModel,
    dueToday: viewModel.dueToday.map((task) =>
      patchTodayTask(task, itemId, patch)
    ),
    overdueBacklog: viewModel.overdueBacklog.map((task) =>
      patchTodayTask(task, itemId, patch)
    ),
    tomorrowPreview: viewModel.tomorrowPreview.map((task) =>
      patchTodayTask(task, itemId, patch)
    )
  };
}

function patchTodayTask(
  task: TodayTaskSummary,
  itemId: string,
  patch: Pick<TodayTaskSummary, "itemStatus" | "taskStatus" | "updatedAt">
): TodayTaskSummary {
  return task.itemId === itemId ? { ...task, ...patch } : task;
}
