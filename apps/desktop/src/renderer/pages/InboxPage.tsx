import { Inbox, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ItemFeed,
  MoveToContainerDialog,
  TaskCardContent,
  TaskQuickAdd,
  type ItemActionId,
  type MoveTargetContainer,
  type TaskCardViewModel,
  type TaskQuickAddValues,
  type UniversalItemViewModel
} from "@local-work-os/ui";
import type {
  InboxSummary,
  ItemSummary,
  LocalWorkOsApi,
  ProjectSummary,
  TaskSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type FeedItemSummary = ItemSummary | TaskSummary;
type InboxTaskViewModel = TaskCardViewModel & {
  taskStatus?: TaskSummary["taskStatus"];
  dueAt?: string | null;
  priority?: number | null;
  allDay?: boolean;
  timezone?: string | null;
};

type InboxPageProps = {
  apiClient?: LocalWorkOsApi;
  initialItems?: FeedItemSummary[];
  initialProjects?: ProjectSummary[];
};

export function InboxPage({
  apiClient = desktopApiClient,
  initialItems = [],
  initialProjects = []
}: InboxPageProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const [inbox, setInbox] = useState<InboxSummary | null>(null);
  const [items, setItems] = useState<FeedItemSummary[]>(initialItems);
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [movingItem, setMovingItem] = useState<FeedItemSummary | null>(null);
  const projectTargets = useMemo(
    () =>
      projects
        .filter((project) => project.status === "active")
        .map(toMoveTarget),
    [projects]
  );

  async function loadInbox(workspaceId: string): Promise<void> {
    setLoading(true);
    setError(null);

    const [inboxResult, itemsResult, projectsResult] = await Promise.all([
      apiClient.inbox.getInbox(workspaceId),
      apiClient.inbox.listItems(workspaceId),
      apiClient.projects.list(workspaceId)
    ]);

    if (!inboxResult.ok) {
      setLoading(false);
      setError(inboxResult.error.message);
      return;
    }

    const tasksResult = await apiClient.tasks.listByContainer(inboxResult.data.id);

    setLoading(false);

    if (!itemsResult.ok) {
      setError(itemsResult.error.message);
      return;
    }

    if (!projectsResult.ok) {
      setError(projectsResult.error.message);
      return;
    }

    if (!tasksResult.ok) {
      setError(tasksResult.error.message);
      return;
    }

    setInbox(inboxResult.data);
    setItems(mergeTaskDetails(itemsResult.data, tasksResult.data));
    setProjects(projectsResult.data);
  }

  useEffect(() => {
    if (currentWorkspace === null) {
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadActiveInbox(): Promise<void> {
      setLoading(true);
      setError(null);

      const [inboxResult, itemsResult, projectsResult] = await Promise.all([
        apiClient.inbox.getInbox(workspaceId),
        apiClient.inbox.listItems(workspaceId),
        apiClient.projects.list(workspaceId)
      ]);

      if (!active) {
        return;
      }

      if (!inboxResult.ok) {
        setLoading(false);
        setError(inboxResult.error.message);
        return;
      }

      const tasksResult = await apiClient.tasks.listByContainer(
        inboxResult.data.id
      );

      if (!active) {
        return;
      }

      setLoading(false);

      if (!itemsResult.ok) {
        setError(itemsResult.error.message);
        return;
      }

      if (!projectsResult.ok) {
        setError(projectsResult.error.message);
        return;
      }

      if (!tasksResult.ok) {
        setError(tasksResult.error.message);
        return;
      }

      setInbox(inboxResult.data);
      setItems(mergeTaskDetails(itemsResult.data, tasksResult.data));
      setProjects(projectsResult.data);
    }

    void loadActiveInbox();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace]);

  function handleItemAction(action: ItemActionId, itemId: string): void {
    if (action !== "move") {
      return;
    }

    setMoveError(null);
    setMovingItem(items.find((item) => item.id === itemId) ?? null);
  }

  async function createInboxTask(
    values: TaskQuickAddValues
  ): Promise<boolean> {
    if (currentWorkspace === null) {
      return false;
    }

    setSavingTask(true);
    setTaskError(null);

    const activeInbox = await resolveInbox(currentWorkspace.id);

    if (activeInbox === null) {
      setSavingTask(false);
      return false;
    }

    const result = await apiClient.tasks.create({
      workspaceId: currentWorkspace.id,
      containerId: activeInbox.id,
      title: values.title,
      dueAt: values.dueDate.length === 0 ? null : values.dueDate
    });

    if (!result.ok) {
      setSavingTask(false);
      setTaskError(result.error.message);
      return false;
    }

    await loadInbox(currentWorkspace.id);
    setSavingTask(false);
    return true;
  }

  async function resolveInbox(workspaceId: string): Promise<InboxSummary | null> {
    if (inbox !== null) {
      return inbox;
    }

    const result = await apiClient.inbox.getInbox(workspaceId);

    if (!result.ok) {
      setTaskError(result.error.message);
      return null;
    }

    setInbox(result.data);
    return result.data;
  }

  async function moveItemToProject(projectId: string): Promise<void> {
    if (movingItem === null) {
      return;
    }

    setMoving(true);
    setMoveError(null);

    const result = await apiClient.inbox.moveItemToProject({
      itemId: movingItem.id,
      projectId
    });

    setMoving(false);

    if (!result.ok) {
      setMoveError(result.error.message);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== movingItem.id));
    setMovingItem(null);
  }

  async function toggleTaskComplete(item: TaskCardViewModel): Promise<void> {
    if (currentWorkspace === null) {
      return;
    }

    const completed = item.taskStatus === "done" || item.status === "completed";
    setTaskBusyId(item.id);
    setTaskError(null);

    const result = completed
      ? await apiClient.tasks.reopen(item.id)
      : await apiClient.tasks.complete(item.id);

    if (!result.ok) {
      setTaskBusyId(null);
      setTaskError(result.error.message);
      return;
    }

    await loadInbox(currentWorkspace.id);
    setTaskBusyId(null);
  }

  async function updateTaskDueDate(
    item: TaskCardViewModel,
    dueDate: string
  ): Promise<void> {
    if (currentWorkspace === null) {
      return;
    }

    setTaskBusyId(item.id);
    setTaskError(null);

    const result = await apiClient.tasks.update({
      itemId: item.id,
      dueAt: dueDate.length === 0 ? null : dueDate
    });

    if (!result.ok) {
      setTaskBusyId(null);
      setTaskError(result.error.message);
      return;
    }

    await loadInbox(currentWorkspace.id);
    setTaskBusyId(null);
  }

  function renderItemContent(item: UniversalItemViewModel): React.ReactNode {
    if (isTaskCardViewModel(item)) {
      return (
        <TaskCardContent
          disabled={taskBusyId === item.id}
          item={item}
          onDueDateChange={updateTaskDueDate}
          onToggleComplete={toggleTaskComplete}
        />
      );
    }

    return item.body === undefined || item.body === null ? null : <p>{item.body}</p>;
  }

  if (currentWorkspace === null) {
    return (
      <section className="inbox-page">
        <div className="page-heading">
          <p className="top-eyebrow">Capture</p>
          <h2>Inbox</h2>
          <p>Open or create a local workspace before triaging captured work.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="inbox-page">
      <div className="page-heading page-heading-actions">
        <div>
          <p className="top-eyebrow">Capture</p>
          <h2>Inbox</h2>
          <p>Captured tasks, notes, links, and files waiting for context.</p>
        </div>
        <button
          className="secondary-button"
          disabled={loading}
          type="button"
          onClick={() => void loadInbox(currentWorkspace.id)}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <TaskQuickAdd
        contextLabel="Inbox"
        disabled={savingTask || loading}
        error={taskError}
        onSubmit={createInboxTask}
      />

      <section className="inbox-content-section" aria-label="Inbox content">
        <div className="panel-heading">
          <Inbox size={17} aria-hidden="true" />
          <h3>Triage queue</h3>
        </div>
        <ItemFeed
          ariaLabel="Inbox items"
          disabledActions={["archive", "delete", "inspect"]}
          emptyDescription="Captured work will appear here before it is moved into a project."
          emptyTitle="Inbox is clear"
          error={error}
          items={items.map(toItemViewModel)}
          loading={loading}
          renderContent={renderItemContent}
          onAction={handleItemAction}
        />
      </section>

      <MoveToContainerDialog
        containers={projectTargets}
        error={moveError}
        itemTitle={movingItem === null ? null : movingItem.title}
        moving={moving}
        open={movingItem !== null}
        onCancel={() => {
          if (!moving) {
            setMovingItem(null);
            setMoveError(null);
          }
        }}
        onMove={moveItemToProject}
      />
    </section>
  );
}

function mergeTaskDetails(
  items: readonly ItemSummary[],
  tasks: readonly TaskSummary[]
): FeedItemSummary[] {
  const tasksByItemId = new Map(tasks.map((task) => [task.id, task]));

  return items.map((item) => tasksByItemId.get(item.id) ?? item);
}

function toItemViewModel(item: FeedItemSummary): InboxTaskViewModel {
  const task = isTaskSummary(item) ? item : null;

  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    status: task?.taskStatus ?? item.status,
    categoryLabel: item.categoryId,
    dueLabel: formatDateLabel(task?.dueAt),
    updatedLabel: item.updatedAt,
    pinned: item.pinned,
    ...(task === null
      ? {}
      : {
          taskStatus: task.taskStatus,
          dueAt: task.dueAt,
          startAt: task.startAt,
          priority: task.priority,
          allDay: task.allDay,
          timezone: task.timezone,
          metadata:
            task.priority === null
              ? []
              : [{ label: "Priority", value: String(task.priority) }]
        })
  };
}

function toMoveTarget(project: ProjectSummary): MoveTargetContainer {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color
  };
}

function isTaskSummary(item: FeedItemSummary): item is TaskSummary {
  return item.type === "task" && "taskStatus" in item;
}

function isTaskCardViewModel(
  item: UniversalItemViewModel
): item is TaskCardViewModel {
  return item.type === "task" && "taskStatus" in item;
}

function formatDateLabel(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.length === 0) {
    return null;
  }

  return value.slice(0, 10);
}
