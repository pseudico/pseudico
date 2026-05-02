import { ArrowLeft, FolderKanban, RefreshCw, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ItemFeed,
  TaskCardContent,
  TaskQuickAdd,
  type ItemActionId,
  type TaskCardViewModel,
  type TaskQuickAddValues,
  type UniversalItemViewModel
} from "@local-work-os/ui";
import type {
  LocalWorkOsApi,
  ProjectSummary,
  TaskSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";

type ProjectTaskViewModel = TaskCardViewModel & {
  taskStatus?: TaskSummary["taskStatus"];
  dueAt?: string | null;
  priority?: number | null;
  allDay?: boolean;
  timezone?: string | null;
};

type ProjectDetailPageProps = {
  apiClient?: LocalWorkOsApi;
  initialProject?: ProjectSummary | null;
  initialItems?: UniversalItemViewModel[];
};

const emptyProjectItems: UniversalItemViewModel[] = [];

export function ProjectDetailPage({
  apiClient = desktopApiClient,
  initialProject,
  initialItems = emptyProjectItems
}: ProjectDetailPageProps): React.JSX.Element {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectSummary | null>(
    initialProject ?? null
  );
  const [items, setItems] = useState<UniversalItemViewModel[]>(initialItems);
  const [loading, setLoading] = useState(initialProject === undefined);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId === undefined) {
      setLoading(false);
      setError("Project id is missing.");
      return;
    }

    let active = true;
    const activeProjectId = projectId;

    async function loadProject(): Promise<void> {
      setLoading(true);
      setItemsLoading(true);
      setError(null);
      setItemError(null);

      const [projectResult, tasksResult] = await Promise.all([
        apiClient.projects.get(activeProjectId),
        apiClient.tasks.listByContainer(activeProjectId)
      ]);

      if (!active) {
        return;
      }

      setLoading(false);
      setItemsLoading(false);

      if (!projectResult.ok) {
        setError(projectResult.error.message);
        return;
      }

      if (!tasksResult.ok) {
        setItemError(tasksResult.error.message);
        return;
      }

      setProject(projectResult.data);
      setItems(tasksResult.data.map(toProjectTaskViewModel));
    }

    void loadProject();

    return () => {
      active = false;
    };
  }, [apiClient, projectId]);

  async function refreshProjectTasks(activeProjectId: string): Promise<void> {
    setItemsLoading(true);
    setItemError(null);

    const result = await apiClient.tasks.listByContainer(activeProjectId);

    setItemsLoading(false);

    if (!result.ok) {
      setItemError(result.error.message);
      return;
    }

    setItems(result.data.map(toProjectTaskViewModel));
  }

  async function createProjectTask(
    values: TaskQuickAddValues
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setSavingTask(true);
    setTaskError(null);

    const result = await apiClient.tasks.create({
      workspaceId: project.workspaceId,
      containerId: project.id,
      title: values.title,
      dueAt: values.dueDate.length === 0 ? null : values.dueDate
    });

    if (!result.ok) {
      setSavingTask(false);
      setTaskError(result.error.message);
      return false;
    }

    await refreshProjectTasks(project.id);
    setSavingTask(false);
    return true;
  }

  async function toggleTaskComplete(item: TaskCardViewModel): Promise<void> {
    if (project === null) {
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

    await refreshProjectTasks(project.id);
    setTaskBusyId(null);
  }

  async function updateTaskDueDate(
    item: TaskCardViewModel,
    dueDate: string
  ): Promise<void> {
    if (project === null) {
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

    await refreshProjectTasks(project.id);
    setTaskBusyId(null);
  }

  function handlePlaceholderItemAction(
    action: ItemActionId,
    itemId: string
  ): void {
    void action;
    void itemId;
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

  if (loading) {
    return <p className="muted-text">Loading project...</p>;
  }

  if (error !== null) {
    return <p className="form-message form-message-error">{error}</p>;
  }

  if (project === null) {
    return (
      <section className="project-detail-page">
        <Link className="text-link" to="/projects">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to projects
        </Link>
        <div className="projects-empty-state">
          <FolderKanban size={28} aria-hidden="true" />
          <h3>Project not found</h3>
          <p>The project may have been archived, deleted, or moved.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="project-detail-page">
      <Link className="text-link page-action-link" to="/projects">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to projects
      </Link>

      <header className="project-detail-header">
        <span
          className="project-detail-color"
          style={{ backgroundColor: project.color ?? "#245c55" }}
          aria-hidden="true"
        />
        <div>
          <p className="top-eyebrow">Project</p>
          <h2>{project.name}</h2>
          <p>{project.description ?? "No description added yet."}</p>
        </div>
      </header>

      <dl className="project-meta-grid">
        <div>
          <dt>Status</dt>
          <dd>{project.status}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{project.categoryId ?? "Not assigned"}</dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>
            <Tag size={15} aria-hidden="true" />
            Placeholder
          </dd>
        </div>
      </dl>

      <section className="project-content-section" aria-label="Project content">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <FolderKanban size={17} aria-hidden="true" />
            <h3>Content feed</h3>
          </div>
          <button
            className="secondary-button compact-button"
            disabled={itemsLoading}
            type="button"
            onClick={() => void refreshProjectTasks(project.id)}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <TaskQuickAdd
          contextLabel={project.name}
          disabled={savingTask || itemsLoading}
          error={taskError}
          onSubmit={createProjectTask}
        />

        <ItemFeed
          ariaLabel="Project content items"
          emptyDescription="Tasks created for this project will appear here with completion and due-date controls."
          emptyTitle="No project tasks yet"
          error={itemError}
          items={items}
          loading={itemsLoading}
          renderContent={renderItemContent}
          onAction={handlePlaceholderItemAction}
        />
      </section>
    </section>
  );
}

function toProjectTaskViewModel(task: TaskSummary): ProjectTaskViewModel {
  return {
    id: task.id,
    type: "task",
    title: task.title,
    body: task.body,
    status: task.taskStatus,
    categoryLabel: task.categoryId,
    dueLabel: formatDateLabel(task.dueAt),
    updatedLabel: task.updatedAt,
    pinned: task.pinned,
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
  };
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
