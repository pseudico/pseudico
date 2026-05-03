import { ArrowLeft, FolderKanban, RefreshCw, StickyNote, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CategoryBadge,
  CategoryPicker,
  ConfirmDialog,
  CreateListForm,
  ItemInspectorPanel,
  ItemFeed,
  ListCardContent,
  MoveItemDialog,
  NoteCardContent,
  NoteEditor,
  TaskCardContent,
  TaskQuickAdd,
  type CreateListFormValues,
  type ItemActionId,
  type ItemInspectorActivity,
  type ItemInspectorItem,
  type ListCardItemViewModel,
  type ListCardViewModel,
  type MoveTargetContainer,
  type NoteCardViewModel,
  type NoteEditorValues,
  type TaskCardViewModel,
  type TaskQuickAddValues,
  type UniversalItemViewModel
} from "@local-work-os/ui";
import type {
  ActivitySummary,
  CategorySummary,
  ItemSummary,
  ListItemSummary,
  ListSummary,
  LocalWorkOsApi,
  NoteSummary,
  ProjectSummary,
  TaskSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";

type ProjectTaskViewModel = TaskCardViewModel & {
  categoryId?: string | null;
  taskStatus?: TaskSummary["taskStatus"];
  dueAt?: string | null;
  priority?: number | null;
  allDay?: boolean;
  timezone?: string | null;
};
type ProjectListViewModel = ListCardViewModel & {
  categoryId?: string | null;
  listItems: ListCardItemViewModel[];
};
type ProjectNoteViewModel = NoteCardViewModel & {
  categoryId?: string | null;
  format: NoteSummary["format"];
};
type ProjectFeedViewModel =
  | ProjectTaskViewModel
  | ProjectListViewModel
  | ProjectNoteViewModel
  | UniversalItemViewModel;

type PendingConfirmAction = {
  action: "archive" | "delete";
  item: ProjectFeedViewModel;
};

type ProjectDetailPageProps = {
  apiClient?: LocalWorkOsApi;
  initialProject?: ProjectSummary | null;
  initialCategories?: CategorySummary[];
  initialItems?: UniversalItemViewModel[];
};

const emptyProjectItems: UniversalItemViewModel[] = [];

export function ProjectDetailPage({
  apiClient = desktopApiClient,
  initialProject,
  initialCategories = [],
  initialItems = emptyProjectItems
}: ProjectDetailPageProps): React.JSX.Element {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectSummary | null>(
    initialProject ?? null
  );
  const [items, setItems] = useState<ProjectFeedViewModel[]>(initialItems);
  const [categories, setCategories] =
    useState<CategorySummary[]>(initialCategories);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(initialProject === undefined);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingList, setSavingList] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);
  const [listBusyId, setListBusyId] = useState<string | null>(null);
  const [noteBusyId, setNoteBusyId] = useState<string | null>(null);
  const [noteErrorItemId, setNoteErrorItemId] = useState<string | null>(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [itemActionError, setItemActionError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [movingItem, setMovingItem] = useState<ProjectFeedViewModel | null>(null);
  const [confirmAction, setConfirmAction] =
    useState<PendingConfirmAction | null>(null);
  const [itemActionBusy, setItemActionBusy] = useState(false);
  const [inspector, setInspector] = useState<{
    item: ItemInspectorItem;
    activity: ItemInspectorActivity[];
  } | null>(null);

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

      const [
        projectResult,
        projectsResult,
        categoriesResult,
        tasksResult,
        listsResult,
        notesResult
      ] = await Promise.all([
        apiClient.projects.get(activeProjectId),
        apiClient.projects.list(),
        apiClient.categories.list(),
        apiClient.tasks.listByContainer(activeProjectId),
        apiClient.lists.listByContainer(activeProjectId),
        apiClient.notes.listByContainer(activeProjectId)
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

      if (!projectsResult.ok) {
        setItemError(projectsResult.error.message);
        return;
      }

      if (!categoriesResult.ok) {
        setItemError(categoriesResult.error.message);
        return;
      }

      if (!listsResult.ok) {
        setItemError(listsResult.error.message);
        return;
      }

      if (!notesResult.ok) {
        setItemError(notesResult.error.message);
        return;
      }

      setProject(projectResult.data);
      setProjects(projectsResult.data);
      setCategories(categoriesResult.data);
      setItems(
        mergeProjectContent(
          tasksResult.data,
          listsResult.data,
          notesResult.data,
          categoriesResult.data
        )
      );
    }

    void loadProject();

    return () => {
      active = false;
    };
  }, [apiClient, projectId]);

  async function refreshProjectContent(activeProjectId: string): Promise<void> {
    setItemsLoading(true);
    setItemError(null);

    const [tasksResult, listsResult, notesResult] = await Promise.all([
      apiClient.tasks.listByContainer(activeProjectId),
      apiClient.lists.listByContainer(activeProjectId),
      apiClient.notes.listByContainer(activeProjectId)
    ]);

    setItemsLoading(false);

    if (!tasksResult.ok) {
      setItemError(tasksResult.error.message);
      return;
    }

    if (!listsResult.ok) {
      setItemError(listsResult.error.message);
      return;
    }

    if (!notesResult.ok) {
      setItemError(notesResult.error.message);
      return;
    }

    setItems(
      mergeProjectContent(
        tasksResult.data,
        listsResult.data,
        notesResult.data,
        categories
      )
    );
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

    await refreshProjectContent(project.id);
    setSavingTask(false);
    return true;
  }

  async function createProjectList(
    values: CreateListFormValues
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setSavingList(true);
    setListError(null);

    const result = await apiClient.lists.create({
      workspaceId: project.workspaceId,
      containerId: project.id,
      title: values.title
    });

    if (!result.ok) {
      setSavingList(false);
      setListError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    setSavingList(false);
    return true;
  }

  async function createProjectNote(
    values: NoteEditorValues
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setSavingNote(true);
    setNoteError(null);
    setNoteErrorItemId(null);

    const result = await apiClient.notes.create({
      workspaceId: project.workspaceId,
      containerId: project.id,
      title: values.title,
      content: values.content
    });

    if (!result.ok) {
      setSavingNote(false);
      setNoteError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    setSavingNote(false);
    setNoteEditorOpen(false);
    return true;
  }

  async function updateProjectNote(
    item: NoteCardViewModel,
    values: NoteEditorValues
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setNoteBusyId(item.id);
    setNoteError(null);
    setNoteErrorItemId(item.id);

    const result = await apiClient.notes.update({
      itemId: item.id,
      title: values.title,
      content: values.content
    });

    if (!result.ok) {
      setNoteBusyId(null);
      setNoteError(result.error.message);
      setNoteErrorItemId(item.id);
      return false;
    }

    await refreshProjectContent(project.id);
    setNoteBusyId(null);
    setNoteErrorItemId(null);
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

    await refreshProjectContent(project.id);
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

    await refreshProjectContent(project.id);
    setTaskBusyId(null);
  }

  async function addListItem(
    item: ListCardViewModel,
    title: string
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setListBusyId(item.id);
    setListError(null);

    const result = await apiClient.lists.addItem({
      listId: item.id,
      title
    });

    if (!result.ok) {
      setListBusyId(null);
      setListError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    setListBusyId(null);
    return true;
  }

  async function bulkAddListItems(
    item: ListCardViewModel,
    text: string
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setListBusyId(item.id);
    setListError(null);

    const result = await apiClient.lists.bulkAddItems({
      listId: item.id,
      text
    });

    if (!result.ok) {
      setListBusyId(null);
      setListError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    setListBusyId(null);
    return true;
  }

  async function toggleListItem(
    item: ListCardViewModel,
    listItem: ListCardItemViewModel
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setListBusyId(item.id);
    setListError(null);

    const result =
      listItem.status === "done"
        ? await apiClient.lists.reopenItem(listItem.id)
        : await apiClient.lists.completeItem(listItem.id);

    if (!result.ok) {
      setListBusyId(null);
      setListError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    setListBusyId(null);
  }

  function handleItemAction(action: ItemActionId, itemId: string): void {
    const item = items.find((candidate) => candidate.id === itemId);

    if (item === undefined) {
      return;
    }

    setItemActionError(null);

    if (action === "move") {
      setMoveError(null);
      setMovingItem(item);
      return;
    }

    if (action === "archive" || action === "delete") {
      setConfirmAction({ action, item });
      return;
    }

    if (action === "inspect") {
      void openInspector(item.id);
    }
  }

  async function moveItemToProject(containerId: string): Promise<void> {
    if (project === null || movingItem === null) {
      return;
    }

    setMoving(true);
    setMoveError(null);

    const result = await apiClient.items.move({
      itemId: movingItem.id,
      targetContainerId: containerId
    });

    setMoving(false);

    if (!result.ok) {
      setMoveError(result.error.message);
      return;
    }

    setMovingItem(null);
    await refreshProjectContent(project.id);
  }

  async function confirmItemAction(): Promise<void> {
    if (project === null || confirmAction === null) {
      return;
    }

    setItemActionBusy(true);
    setItemActionError(null);

    const result =
      confirmAction.action === "archive"
        ? await apiClient.items.archive(confirmAction.item.id)
        : await apiClient.items.softDelete(confirmAction.item.id);

    setItemActionBusy(false);

    if (!result.ok) {
      setItemActionError(result.error.message);
      return;
    }

    setConfirmAction(null);
    await refreshProjectContent(project.id);
  }

  async function openInspector(itemId: string): Promise<void> {
    setItemActionError(null);

    const result = await apiClient.items.openInspector(itemId);

    if (!result.ok) {
      setItemActionError(result.error.message);
      return;
    }

    setInspector({
      item: toInspectorItem(result.data.item),
      activity: result.data.activity.map(toInspectorActivity)
    });
  }

  async function assignProjectCategory(categoryId: string | null): Promise<void> {
    if (project === null) {
      return;
    }

    setError(null);

    const result = await apiClient.categories.assignToProject({
      projectId: project.id,
      categoryId
    });

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setProject(result.data);
  }

  async function assignItemCategory(
    itemId: string,
    categoryId: string | null
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setItemActionError(null);

    const result = await apiClient.categories.assignToItem({
      itemId,
      categoryId
    });

    if (!result.ok) {
      setItemActionError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
  }

  function renderItemContent(item: UniversalItemViewModel): React.ReactNode {
    const categoryPicker = (
      <CategoryPicker
        categories={categories}
        label="Item category"
        value={findCategoryIdForItem(item, categories)}
        onChange={(categoryId) => void assignItemCategory(item.id, categoryId)}
      />
    );

    if (isListCardViewModel(item)) {
      return (
        <>
          {categoryPicker}
          <ListCardContent
            disabled={listBusyId === item.id}
            error={listBusyId === item.id ? listError : null}
            item={item}
            onAddItem={addListItem}
            onBulkAddItems={bulkAddListItems}
            onToggleItem={toggleListItem}
          />
        </>
      );
    }

    if (isTaskCardViewModel(item)) {
      return (
        <>
          {categoryPicker}
          <TaskCardContent
            disabled={taskBusyId === item.id}
            item={item}
            onDueDateChange={updateTaskDueDate}
            onToggleComplete={toggleTaskComplete}
          />
        </>
      );
    }

    if (isNoteCardViewModel(item)) {
      return (
        <>
          {categoryPicker}
          <NoteCardContent
            disabled={noteBusyId === item.id}
            error={noteErrorItemId === item.id ? noteError : null}
            item={item}
            onSave={updateProjectNote}
          />
        </>
      );
    }

    return (
      <>
        {categoryPicker}
        {item.body === undefined || item.body === null ? null : <p>{item.body}</p>}
      </>
    );
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

  const moveTargets = projects
    .filter((candidate) => candidate.status === "active" && candidate.id !== project.id)
    .map(toMoveTarget);
  const confirmTitle =
    confirmAction === null
      ? ""
      : confirmAction.action === "archive"
        ? `Archive ${confirmAction.item.title}?`
        : `Delete ${confirmAction.item.title}?`;
  const confirmDescription =
    confirmAction === null
      ? ""
      : confirmAction.action === "archive"
        ? "The item will leave active feeds and can be restored by a later archive management flow."
        : "The item will be soft-deleted and removed from active feeds. The database row remains for audit and future recovery.";
  const projectCategory =
    categories.find((category) => category.id === project.categoryId) ?? null;

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
          <dd>
            <CategoryBadge category={projectCategory} />
          </dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>
            <Tag size={15} aria-hidden="true" />
            Placeholder
          </dd>
        </div>
      </dl>

      <div className="category-inline-picker">
        <CategoryPicker
          categories={categories}
          label="Project category"
          value={project.categoryId}
          onChange={(categoryId) => void assignProjectCategory(categoryId)}
        />
      </div>

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
            onClick={() => void refreshProjectContent(project.id)}
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

        <CreateListForm
          contextLabel={project.name}
          disabled={savingList || itemsLoading}
          error={listBusyId === null ? listError : null}
          onSubmit={createProjectList}
        />

        {noteEditorOpen ? (
          <NoteEditor
            contextLabel={project.name}
            disabled={savingNote || itemsLoading}
            error={noteErrorItemId === null ? noteError : null}
            resetOnSubmit
            submitLabel="Add note"
            onCancel={() => {
              setNoteEditorOpen(false);
              setNoteError(null);
              setNoteErrorItemId(null);
            }}
            onSubmit={createProjectNote}
          />
        ) : (
          <button
            className="secondary-button note-create-button"
            disabled={itemsLoading}
            type="button"
            onClick={() => {
              setNoteEditorOpen(true);
              setNoteError(null);
              setNoteErrorItemId(null);
            }}
          >
            <StickyNote size={17} aria-hidden="true" />
            New note
          </button>
        )}

        <ItemFeed
          ariaLabel="Project content items"
          emptyDescription="Tasks, checklists, and notes created for this project will appear here with inline controls."
          emptyTitle="No project content yet"
          error={itemError}
          items={items}
          loading={itemsLoading}
          renderContent={renderItemContent}
          onAction={handleItemAction}
        />
      </section>

      {itemActionError === null ? null : (
        <p className="form-message form-message-error">{itemActionError}</p>
      )}

      <MoveItemDialog
        containers={moveTargets}
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

      <ConfirmDialog
        confirmLabel={confirmAction?.action === "archive" ? "Archive" : "Delete"}
        description={confirmDescription}
        error={itemActionError}
        open={confirmAction !== null}
        title={confirmTitle}
        tone={confirmAction?.action === "delete" ? "danger" : "normal"}
        busy={itemActionBusy}
        onCancel={() => {
          if (!itemActionBusy) {
            setConfirmAction(null);
            setItemActionError(null);
          }
        }}
        onConfirm={confirmItemAction}
      />

      {inspector === null ? null : (
        <ItemInspectorPanel
          activity={inspector.activity}
          item={inspector.item}
          open
          onClose={() => setInspector(null)}
        />
      )}
    </section>
  );
}

function toProjectTaskViewModel(
  task: TaskSummary,
  categories: readonly CategorySummary[]
): ProjectTaskViewModel {
  return {
    id: task.id,
    type: "task",
    title: task.title,
    body: task.body,
    status: task.taskStatus,
    categoryId: task.categoryId,
    categoryLabel: findCategoryName(task.categoryId, categories),
    sortOrder: task.sortOrder,
    createdAt: task.createdAt,
    dueLabel: formatDateLabel(task.dueAt),
    updatedLabel: task.updatedAt,
    pinned: task.pinned,
    taskStatus: task.taskStatus,
    dueAt: task.dueAt,
    startAt: task.startAt,
    priority: task.priority,
    allDay: task.allDay,
    timezone: task.timezone,
    tags: task.tags ?? [],
    metadata:
      task.priority === null
        ? []
        : [{ label: "Priority", value: String(task.priority) }]
  };
}

function toProjectListViewModel(
  list: ListSummary,
  categories: readonly CategorySummary[]
): ProjectListViewModel {
  return {
    id: list.id,
    type: "list",
    title: list.title,
    body: list.body,
    status: list.status,
    categoryId: list.categoryId,
    categoryLabel: findCategoryName(list.categoryId, categories),
    sortOrder: list.sortOrder,
    createdAt: list.createdAt,
    updatedLabel: list.updatedAt,
    pinned: list.pinned,
    progressMode: list.progressMode,
    showCompleted: list.showCompleted,
    tags: list.tags ?? [],
    listItems: list.items.map(toListCardItemViewModel)
  };
}

function toProjectNoteViewModel(
  note: NoteSummary,
  categories: readonly CategorySummary[]
): ProjectNoteViewModel {
  return {
    id: note.id,
    type: "note",
    title: note.title,
    body: note.preview,
    status: note.status,
    categoryId: note.categoryId,
    categoryLabel: findCategoryName(note.categoryId, categories),
    sortOrder: note.sortOrder,
    createdAt: note.createdAt,
    updatedLabel: note.updatedAt,
    pinned: note.pinned,
    tags: note.tags ?? [],
    content: note.content,
    preview: note.preview,
    format: note.format
  };
}

function toListCardItemViewModel(
  listItem: ListItemSummary
): ListCardItemViewModel {
  return {
    id: listItem.id,
    title: listItem.title,
    body: listItem.body,
    status: listItem.status,
    depth: listItem.depth,
    sortOrder: listItem.sortOrder
  };
}

function mergeProjectContent(
  tasks: readonly TaskSummary[],
  lists: readonly ListSummary[],
  notes: readonly NoteSummary[],
  categories: readonly CategorySummary[] = []
): ProjectFeedViewModel[] {
  return [
    ...tasks.map((task) => toProjectTaskViewModel(task, categories)),
    ...lists.map((list) => toProjectListViewModel(list, categories)),
    ...notes.map((note) => toProjectNoteViewModel(note, categories))
  ].sort(compareFeedItems);
}

function toMoveTarget(project: ProjectSummary): MoveTargetContainer {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color
  };
}

function toInspectorItem(item: ItemSummary): ItemInspectorItem {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    categoryLabel: item.categoryId,
    containerId: item.containerId,
    containerTabId: item.containerTabId,
    status: item.status,
    sortOrder: item.sortOrder,
    pinned: item.pinned,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    archivedAt: item.archivedAt,
    deletedAt: item.deletedAt
  };
}

function findCategoryName(
  categoryId: string | null | undefined,
  categories: readonly CategorySummary[]
): string | null {
  if (categoryId === undefined || categoryId === null) {
    return null;
  }

  return categories.find((category) => category.id === categoryId)?.name ?? categoryId;
}

function findCategoryIdForItem(
  item: UniversalItemViewModel,
  categories: readonly CategorySummary[]
): string | null {
  if ("categoryId" in item && typeof item.categoryId === "string") {
    return item.categoryId;
  }

  if (item.categoryLabel === undefined || item.categoryLabel === null) {
    return null;
  }

  return (
    categories.find((category) => category.name === item.categoryLabel)?.id ?? null
  );
}

function toInspectorActivity(activity: ActivitySummary): ItemInspectorActivity {
  return {
    id: activity.id,
    action: activity.action,
    actorType: activity.actorType,
    summary: activity.summary,
    createdAt: activity.createdAt
  };
}

function compareFeedItems(
  left: UniversalItemViewModel,
  right: UniversalItemViewModel
): number {
  const sortDelta = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);

  if (sortDelta !== 0) {
    return sortDelta;
  }

  return (left.createdAt ?? "").localeCompare(right.createdAt ?? "");
}

function isTaskCardViewModel(
  item: UniversalItemViewModel
): item is TaskCardViewModel {
  return item.type === "task" && "taskStatus" in item;
}

function isListCardViewModel(
  item: UniversalItemViewModel
): item is ListCardViewModel {
  return item.type === "list" && "listItems" in item;
}

function isNoteCardViewModel(
  item: UniversalItemViewModel
): item is NoteCardViewModel {
  return item.type === "note" && "content" in item;
}

function formatDateLabel(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.length === 0) {
    return null;
  }

  return value.slice(0, 10);
}
