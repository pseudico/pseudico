import { Inbox, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ConfirmDialog,
  CreateListForm,
  ItemInspectorPanel,
  ItemFeed,
  ListCardContent,
  MoveItemDialog,
  TaskCardContent,
  TaskQuickAdd,
  type CreateListFormValues,
  type ItemActionId,
  type ItemInspectorActivity,
  type ItemInspectorItem,
  type ListCardItemViewModel,
  type ListCardViewModel,
  type MoveTargetContainer,
  type TaskCardViewModel,
  type TaskQuickAddValues,
  type UniversalItemViewModel
} from "@local-work-os/ui";
import type {
  ActivitySummary,
  InboxSummary,
  ItemSummary,
  ListItemSummary,
  ListSummary,
  LocalWorkOsApi,
  ProjectSummary,
  TaskSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type FeedItemSummary = ItemSummary | TaskSummary;
type FeedListSummary = ListSummary;
type InboxFeedItemSummary = FeedItemSummary | FeedListSummary;
type InboxTaskViewModel = TaskCardViewModel & {
  taskStatus?: TaskSummary["taskStatus"];
  dueAt?: string | null;
  priority?: number | null;
  allDay?: boolean;
  timezone?: string | null;
};
type InboxListViewModel = ListCardViewModel & {
  listItems: ListCardItemViewModel[];
};
type InboxFeedViewModel =
  | InboxTaskViewModel
  | InboxListViewModel
  | UniversalItemViewModel;

type PendingConfirmAction = {
  action: "archive" | "delete";
  item: InboxFeedItemSummary;
};

type InboxPageProps = {
  apiClient?: LocalWorkOsApi;
  initialItems?: InboxFeedItemSummary[];
  initialProjects?: ProjectSummary[];
};

export function InboxPage({
  apiClient = desktopApiClient,
  initialItems = [],
  initialProjects = []
}: InboxPageProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const [inbox, setInbox] = useState<InboxSummary | null>(null);
  const [items, setItems] = useState<InboxFeedItemSummary[]>(initialItems);
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [itemActionBusy, setItemActionBusy] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingList, setSavingList] = useState(false);
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);
  const [listBusyId, setListBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [itemActionError, setItemActionError] = useState<string | null>(null);
  const [movingItem, setMovingItem] = useState<InboxFeedItemSummary | null>(
    null
  );
  const [confirmAction, setConfirmAction] =
    useState<PendingConfirmAction | null>(null);
  const [inspector, setInspector] = useState<{
    item: ItemInspectorItem;
    activity: ItemInspectorActivity[];
  } | null>(null);
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

    const [tasksResult, listsResult] = await Promise.all([
      apiClient.tasks.listByContainer(inboxResult.data.id),
      apiClient.lists.listByContainer(inboxResult.data.id)
    ]);

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

    if (!listsResult.ok) {
      setError(listsResult.error.message);
      return;
    }

    setInbox(inboxResult.data);
    setItems(mergeFeedDetails(itemsResult.data, tasksResult.data, listsResult.data));
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

      const [tasksResult, listsResult] = await Promise.all([
        apiClient.tasks.listByContainer(inboxResult.data.id),
        apiClient.lists.listByContainer(inboxResult.data.id)
      ]);

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

      if (!listsResult.ok) {
        setError(listsResult.error.message);
        return;
      }

      setInbox(inboxResult.data);
      setItems(
        mergeFeedDetails(itemsResult.data, tasksResult.data, listsResult.data)
      );
      setProjects(projectsResult.data);
    }

    void loadActiveInbox();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace]);

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

  async function createInboxList(
    values: CreateListFormValues
  ): Promise<boolean> {
    if (currentWorkspace === null) {
      return false;
    }

    setSavingList(true);
    setListError(null);

    const activeInbox = await resolveInbox(currentWorkspace.id);

    if (activeInbox === null) {
      setSavingList(false);
      return false;
    }

    const result = await apiClient.lists.create({
      workspaceId: currentWorkspace.id,
      containerId: activeInbox.id,
      title: values.title
    });

    if (!result.ok) {
      setSavingList(false);
      setListError(result.error.message);
      return false;
    }

    await loadInbox(currentWorkspace.id);
    setSavingList(false);
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

    const result = await apiClient.items.move({
      itemId: movingItem.id,
      targetContainerId: projectId
    });

    setMoving(false);

    if (!result.ok) {
      setMoveError(result.error.message);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== movingItem.id));
    setMovingItem(null);
  }

  async function confirmItemAction(): Promise<void> {
    if (currentWorkspace === null || confirmAction === null) {
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

    setItems((current) =>
      current.filter((item) => item.id !== confirmAction.item.id)
    );
    setConfirmAction(null);
    await loadInbox(currentWorkspace.id);
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

  async function addListItem(
    item: ListCardViewModel,
    title: string
  ): Promise<boolean> {
    if (currentWorkspace === null) {
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

    await loadInbox(currentWorkspace.id);
    setListBusyId(null);
    return true;
  }

  async function bulkAddListItems(
    item: ListCardViewModel,
    text: string
  ): Promise<boolean> {
    if (currentWorkspace === null) {
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

    await loadInbox(currentWorkspace.id);
    setListBusyId(null);
    return true;
  }

  async function toggleListItem(
    item: ListCardViewModel,
    listItem: ListCardItemViewModel
  ): Promise<void> {
    if (currentWorkspace === null) {
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

    await loadInbox(currentWorkspace.id);
    setListBusyId(null);
  }

  function renderItemContent(item: UniversalItemViewModel): React.ReactNode {
    if (isListCardViewModel(item)) {
      return (
        <ListCardContent
          disabled={listBusyId === item.id}
          error={listBusyId === item.id ? listError : null}
          item={item}
          onAddItem={addListItem}
          onBulkAddItems={bulkAddListItems}
          onToggleItem={toggleListItem}
        />
      );
    }

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

      <CreateListForm
        contextLabel="Inbox"
        disabled={savingList || loading}
        error={listBusyId === null ? listError : null}
        onSubmit={createInboxList}
      />

      <section className="inbox-content-section" aria-label="Inbox content">
        <div className="panel-heading">
          <Inbox size={17} aria-hidden="true" />
          <h3>Triage queue</h3>
        </div>
        <ItemFeed
          ariaLabel="Inbox items"
          emptyDescription="Captured work will appear here before it is moved into a project."
          emptyTitle="Inbox is clear"
          error={error}
          items={items.map(toItemViewModel)}
          loading={loading}
          renderContent={renderItemContent}
          onAction={handleItemAction}
        />
      </section>

      {itemActionError === null ? null : (
        <p className="form-message form-message-error">{itemActionError}</p>
      )}

      <MoveItemDialog
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

      <ConfirmDialog
        confirmLabel={confirmAction?.action === "archive" ? "Archive" : "Delete"}
        description={
          confirmAction?.action === "archive"
            ? "The item will leave active feeds and can be restored by a later archive management flow."
            : "The item will be soft-deleted and removed from active feeds. The database row remains for audit and future recovery."
        }
        error={itemActionError}
        open={confirmAction !== null}
        title={
          confirmAction === null
            ? ""
            : `${confirmAction.action === "archive" ? "Archive" : "Delete"} ${confirmAction.item.title}?`
        }
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

function mergeFeedDetails(
  items: readonly ItemSummary[],
  tasks: readonly TaskSummary[],
  lists: readonly ListSummary[]
): InboxFeedItemSummary[] {
  const tasksByItemId = new Map(tasks.map((task) => [task.id, task]));
  const listsByItemId = new Map(lists.map((list) => [list.id, list]));

  const mergedItems = items.map(
    (item) => tasksByItemId.get(item.id) ?? listsByItemId.get(item.id) ?? item
  );
  const mergedItemIds = new Set(mergedItems.map((item) => item.id));
  const missingLists = lists.filter((list) => !mergedItemIds.has(list.id));

  return [...mergedItems, ...missingLists].sort(compareFeedSummaries);
}

function toItemViewModel(item: InboxFeedItemSummary): InboxFeedViewModel {
  const task = isTaskSummary(item) ? item : null;

  if (isListSummary(item)) {
    return toInboxListViewModel(item);
  }

  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    status: task?.taskStatus ?? item.status,
    categoryLabel: item.categoryId,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    dueLabel: formatDateLabel(task?.dueAt),
    updatedLabel: item.updatedAt,
    pinned: item.pinned,
    tags: item.tags ?? [],
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

function toInboxListViewModel(list: ListSummary): InboxListViewModel {
  return {
    id: list.id,
    type: "list",
    title: list.title,
    body: list.body,
    status: list.status,
    categoryLabel: list.categoryId,
    sortOrder: list.sortOrder,
    createdAt: list.createdAt,
    updatedLabel: list.updatedAt,
    pinned: list.pinned,
    tags: list.tags ?? [],
    progressMode: list.progressMode,
    showCompleted: list.showCompleted,
    listItems: list.items.map(toListCardItemViewModel)
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

function compareFeedSummaries(
  left: InboxFeedItemSummary,
  right: InboxFeedItemSummary
): number {
  const sortDelta = left.sortOrder - right.sortOrder;

  if (sortDelta !== 0) {
    return sortDelta;
  }

  return left.createdAt.localeCompare(right.createdAt);
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

function toInspectorActivity(activity: ActivitySummary): ItemInspectorActivity {
  return {
    id: activity.id,
    action: activity.action,
    actorType: activity.actorType,
    summary: activity.summary,
    createdAt: activity.createdAt
  };
}

function isTaskSummary(item: InboxFeedItemSummary): item is TaskSummary {
  return item.type === "task" && "taskStatus" in item;
}

function isListSummary(item: InboxFeedItemSummary): item is ListSummary {
  return item.type === "list" && "items" in item;
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

function formatDateLabel(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.length === 0) {
    return null;
  }

  return value.slice(0, 10);
}
