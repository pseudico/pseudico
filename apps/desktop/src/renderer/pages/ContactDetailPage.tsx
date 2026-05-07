import { ArrowLeft, Contact, RefreshCw, StickyNote, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CategoryBadge,
  ContactFieldsEditor,
  ItemFeed,
  NoteCardContent,
  NoteEditor,
  RecentActivityList,
  RelatedProjectsPanel,
  TaskCardContent,
  TaskQuickAdd,
  type ContactFieldDraft,
  type ContactFieldViewModel,
  type NoteCardViewModel,
  type NoteEditorValues,
  type RecentActivityViewModel,
  type RelatedProjectViewModel,
  type TaskCardViewModel,
  type TaskQuickAddValues,
  type UniversalItemViewModel
} from "@local-work-os/ui";
import type {
  ActivitySummary,
  CategorySummary,
  ContactDetailSummary,
  ContactFieldSummary,
  ContactSummary,
  LocalWorkOsApi,
  NoteSummary,
  ProjectSummary,
  RelatedProjectSummary,
  TaskSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";

type ContactTaskViewModel = TaskCardViewModel & {
  categoryId?: string | null;
  taskStatus?: TaskSummary["taskStatus"];
  dueAt?: string | null;
  priority?: number | null;
  allDay?: boolean;
  timezone?: string | null;
};
type ContactNoteViewModel = NoteCardViewModel & {
  categoryId?: string | null;
  format: NoteSummary["format"];
};
type ContactFeedViewModel =
  | ContactTaskViewModel
  | ContactNoteViewModel
  | UniversalItemViewModel;

type ContactDetailPageProps = {
  apiClient?: LocalWorkOsApi;
  initialContactDetail?: ContactDetailSummary | null;
  initialCategories?: CategorySummary[];
  initialItems?: UniversalItemViewModel[];
  initialActivity?: RecentActivityViewModel[];
  initialAvailableProjects?: ProjectSummary[];
  initialRelatedProjects?: RelatedProjectSummary[];
};

const emptyContactItems: UniversalItemViewModel[] = [];
const CONTACT_FEED_PAGE_SIZE = 50;

export function ContactDetailPage({
  apiClient = desktopApiClient,
  initialContactDetail,
  initialCategories = [],
  initialItems = emptyContactItems,
  initialActivity = [],
  initialAvailableProjects = [],
  initialRelatedProjects = []
}: ContactDetailPageProps): React.JSX.Element {
  const { contactId } = useParams();
  const [contact, setContact] = useState<ContactSummary | null>(
    initialContactDetail?.contact ?? null
  );
  const [fields, setFields] = useState<ContactFieldSummary[]>(
    initialContactDetail?.fields ?? []
  );
  const [items, setItems] = useState<ContactFeedViewModel[]>(initialItems);
  const [visibleItemCount, setVisibleItemCount] = useState(
    Math.max(CONTACT_FEED_PAGE_SIZE, initialItems.length)
  );
  const [categories, setCategories] =
    useState<CategorySummary[]>(initialCategories);
  const [activity, setActivity] =
    useState<RecentActivityViewModel[]>(initialActivity);
  const [projects, setProjects] =
    useState<ProjectSummary[]>(initialAvailableProjects);
  const [relatedProjects, setRelatedProjects] = useState<RelatedProjectSummary[]>(
    initialRelatedProjects
  );
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialContactDetail === undefined);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [savingField, setSavingField] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);
  const [noteBusyId, setNoteBusyId] = useState<string | null>(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteErrorItemId, setNoteErrorItemId] = useState<string | null>(null);

  useEffect(() => {
    if (contactId === undefined) {
      setLoading(false);
      setError("Contact id is missing.");
      return;
    }

    let active = true;
    const activeContactId = contactId;

    async function loadContact(): Promise<void> {
      setLoading(true);
      setItemsLoading(true);
      setError(null);
      setItemError(null);

      const [
        contactResult,
        categoriesResult,
        activityResult,
        tasksResult,
        notesResult,
        projectsResult,
        relatedProjectsResult
      ] = await Promise.all([
        apiClient.contacts.get(activeContactId),
        apiClient.categories.list(),
        apiClient.activity.listForTarget({
          targetType: "container",
          targetId: activeContactId
        }),
        apiClient.tasks.listByContainer(activeContactId),
        apiClient.notes.listByContainer(activeContactId),
        apiClient.projects.list(),
        apiClient.relationships.listProjectsForContact(activeContactId)
      ]);

      if (!active) {
        return;
      }

      setLoading(false);
      setItemsLoading(false);

      if (!contactResult.ok) {
        setError(contactResult.error.message);
        return;
      }

      if (!categoriesResult.ok) {
        setItemError(categoriesResult.error.message);
        return;
      }

      if (!activityResult.ok) {
        setItemError(activityResult.error.message);
        return;
      }

      if (!tasksResult.ok) {
        setItemError(tasksResult.error.message);
        return;
      }

      if (!notesResult.ok) {
        setItemError(notesResult.error.message);
        return;
      }

      if (!projectsResult.ok) {
        setItemError(projectsResult.error.message);
        return;
      }

      if (!relatedProjectsResult.ok) {
        setItemError(relatedProjectsResult.error.message);
        return;
      }

      setContact(contactResult.data?.contact ?? null);
      setFields(contactResult.data?.fields ?? []);
      setProjects(projectsResult.data);
      setRelatedProjects(relatedProjectsResult.data);
      setSelectedProjectId(selectFirstUnlinkedProjectId(
        projectsResult.data,
        relatedProjectsResult.data
      ));
      setCategories(categoriesResult.data);
      setActivity(activityResult.data.map(toRecentActivityViewModel));
      setItems(mergeContactContent(tasksResult.data, notesResult.data, categoriesResult.data));
      setVisibleItemCount(CONTACT_FEED_PAGE_SIZE);
    }

    void loadContact();

    return () => {
      active = false;
    };
  }, [apiClient, contactId]);

  async function refreshContact(activeContactId: string): Promise<void> {
    const result = await apiClient.contacts.get(activeContactId);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setContact(result.data?.contact ?? null);
    setFields(result.data?.fields ?? []);
  }

  async function refreshContactContent(activeContactId: string): Promise<void> {
    setItemsLoading(true);
    setItemError(null);

    const [tasksResult, notesResult] = await Promise.all([
      apiClient.tasks.listByContainer(activeContactId),
      apiClient.notes.listByContainer(activeContactId)
    ]);

    setItemsLoading(false);

    if (!tasksResult.ok) {
      setItemError(tasksResult.error.message);
      return;
    }

    if (!notesResult.ok) {
      setItemError(notesResult.error.message);
      return;
    }

    const mergedItems = mergeContactContent(
      tasksResult.data,
      notesResult.data,
      categories
    );

    setItems(mergedItems);
    setVisibleItemCount((current) =>
      Math.min(Math.max(current, CONTACT_FEED_PAGE_SIZE), mergedItems.length)
    );
  }

  async function refreshContactActivity(activeContactId: string): Promise<void> {
    const result = await apiClient.activity.listForTarget({
      targetType: "container",
      targetId: activeContactId
    });

    if (!result.ok) {
      setItemError(result.error.message);
      return;
    }

    setActivity(result.data.map(toRecentActivityViewModel));
  }

  async function refreshRelatedProjects(activeContactId: string): Promise<void> {
    setRelationshipError(null);

    const result = await apiClient.relationships.listProjectsForContact(
      activeContactId
    );

    if (!result.ok) {
      setRelationshipError(result.error.message);
      return;
    }

    setRelatedProjects(result.data);
    setSelectedProjectId((current) =>
      current.trim().length > 0 &&
      !result.data.some((summary) => summary.project.id === current)
        ? current
        : selectFirstUnlinkedProjectId(projects, result.data)
    );
  }

  async function linkSelectedProject(): Promise<void> {
    if (contact === null || selectedProjectId.trim().length === 0) {
      return;
    }

    setRelationshipBusy(true);
    setRelationshipError(null);

    const result = await apiClient.relationships.linkContactToProject({
      workspaceId: contact.workspaceId,
      contactId: contact.id,
      projectId: selectedProjectId
    });

    if (!result.ok) {
      setRelationshipBusy(false);
      setRelationshipError(result.error.message);
      return;
    }

    await refreshRelatedProjects(contact.id);
    await refreshContactActivity(contact.id);
    setRelationshipBusy(false);
  }

  async function unlinkRelatedProject(relationshipId: string): Promise<void> {
    if (contact === null) {
      return;
    }

    setRelationshipBusy(true);
    setRelationshipError(null);

    const result = await apiClient.relationships.unlinkContactFromProject(
      relationshipId
    );

    if (!result.ok) {
      setRelationshipBusy(false);
      setRelationshipError(result.error.message);
      return;
    }

    await refreshRelatedProjects(contact.id);
    await refreshContactActivity(contact.id);
    setRelationshipBusy(false);
  }

  async function addContactField(field: ContactFieldDraft): Promise<boolean> {
    if (contact === null) {
      return false;
    }

    setSavingField(true);
    setFieldError(null);

    const result = await apiClient.contacts.addField({
      contactId: contact.id,
      ...field
    });

    setSavingField(false);

    if (!result.ok) {
      setFieldError(result.error.message);
      return false;
    }

    await refreshContact(contact.id);
    await refreshContactActivity(contact.id);
    return true;
  }

  async function updateContactField(
    fieldId: string,
    field: ContactFieldDraft
  ): Promise<boolean> {
    if (contact === null) {
      return false;
    }

    setSavingField(true);
    setFieldError(null);

    const result = await apiClient.contacts.updateField({
      fieldId,
      ...field
    });

    setSavingField(false);

    if (!result.ok) {
      setFieldError(result.error.message);
      return false;
    }

    await refreshContact(contact.id);
    await refreshContactActivity(contact.id);
    return true;
  }

  async function createContactTask(
    values: TaskQuickAddValues
  ): Promise<boolean> {
    if (contact === null) {
      return false;
    }

    setSavingTask(true);
    setTaskError(null);

    const result = await apiClient.tasks.create({
      workspaceId: contact.workspaceId,
      containerId: contact.id,
      title: values.title,
      dueAt: values.dueDate.length === 0 ? null : values.dueDate
    });

    if (!result.ok) {
      setSavingTask(false);
      setTaskError(result.error.message);
      return false;
    }

    await refreshContactContent(contact.id);
    await refreshContactActivity(contact.id);
    setSavingTask(false);
    return true;
  }

  async function createContactNote(
    values: NoteEditorValues
  ): Promise<boolean> {
    if (contact === null) {
      return false;
    }

    setSavingNote(true);
    setNoteError(null);
    setNoteErrorItemId(null);

    const result = await apiClient.notes.create({
      workspaceId: contact.workspaceId,
      containerId: contact.id,
      title: values.title,
      content: values.content
    });

    if (!result.ok) {
      setSavingNote(false);
      setNoteError(result.error.message);
      return false;
    }

    await refreshContactContent(contact.id);
    await refreshContactActivity(contact.id);
    setSavingNote(false);
    setNoteEditorOpen(false);
    return true;
  }

  async function updateContactNote(
    item: NoteCardViewModel,
    values: NoteEditorValues
  ): Promise<boolean> {
    if (contact === null) {
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

    await refreshContactContent(contact.id);
    setNoteBusyId(null);
    setNoteErrorItemId(null);
    return true;
  }

  async function toggleTaskComplete(item: TaskCardViewModel): Promise<void> {
    if (contact === null) {
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

    await refreshContactContent(contact.id);
    setTaskBusyId(null);
  }

  async function updateTaskDueDate(
    item: TaskCardViewModel,
    dueDate: string
  ): Promise<void> {
    if (contact === null) {
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

    await refreshContactContent(contact.id);
    setTaskBusyId(null);
  }

  function renderItemContent(item: ContactFeedViewModel): React.JSX.Element {
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

    if (isNoteCardViewModel(item)) {
      return (
        <NoteCardContent
          disabled={noteBusyId === item.id}
          error={noteErrorItemId === item.id ? noteError : null}
          item={item}
          onSave={updateContactNote}
        />
      );
    }

    return item.body === undefined || item.body === null ? <></> : <p>{item.body}</p>;
  }

  if (loading) {
    return <p className="muted-text">Loading contact...</p>;
  }

  if (error !== null) {
    return <p className="form-message form-message-error">{error}</p>;
  }

  if (contact === null) {
    return (
      <section className="project-detail-page">
        <Link className="text-link" to="/contacts">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to contacts
        </Link>
        <div className="projects-empty-state">
          <Contact size={28} aria-hidden="true" />
          <h3>Contact not found</h3>
          <p>The contact may have been archived, deleted, or moved.</p>
        </div>
      </section>
    );
  }

  const contactCategory =
    categories.find((category) => category.id === contact.categoryId) ?? null;
  const relatedProjectIds = new Set(
    relatedProjects.map((summary) => summary.project.id)
  );
  const availableProjects = projects
    .filter((project) => !relatedProjectIds.has(project.id))
    .map((project) => ({
      id: project.id,
      name: project.name
    }));
  const relatedProjectViewModels = relatedProjects.map(
    toRelatedProjectViewModel
  );
  const visibleItems = items.slice(0, visibleItemCount);
  const hasMoreItems = visibleItemCount < items.length;

  return (
    <section className="project-detail-page">
      <Link className="text-link page-action-link" to="/contacts">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to contacts
      </Link>

      <header className="project-detail-header">
        <span
          className="project-detail-color"
          style={{ backgroundColor: contact.color ?? "#2c6b8f" }}
          aria-hidden="true"
        />
        <div>
          <p className="top-eyebrow">Contact</p>
          <h2>{contact.name}</h2>
          <p>{contact.description ?? "No description added yet."}</p>
        </div>
      </header>

      <dl className="project-meta-grid">
        <div>
          <dt>Status</dt>
          <dd>{contact.status}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>
            <CategoryBadge category={contactCategory} />
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

      <ContactFieldsEditor
        disabled={savingField}
        error={fieldError}
        fields={fields.map(toContactFieldViewModel)}
        onAddField={addContactField}
        onUpdateField={updateContactField}
      />

      <RelatedProjectsPanel
        availableProjects={availableProjects}
        busy={relationshipBusy}
        error={relationshipError}
        relatedProjects={relatedProjectViewModels}
        selectedProjectId={selectedProjectId}
        onLinkProject={() => void linkSelectedProject()}
        onSelectedProjectChange={setSelectedProjectId}
        onUnlinkProject={(relationshipId) => void unlinkRelatedProject(relationshipId)}
      />

      <RecentActivityList
        activity={activity}
        emptyMessage="No contact activity recorded yet."
      />

      <section className="project-content-section" aria-label="Contact content">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <Contact size={17} aria-hidden="true" />
            <h3>Content feed</h3>
          </div>
          <button
            className="secondary-button compact-button"
            disabled={itemsLoading}
            type="button"
            onClick={() => void refreshContactContent(contact.id)}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <TaskQuickAdd
          contextLabel={contact.name}
          disabled={savingTask || itemsLoading}
          error={taskError}
          onSubmit={createContactTask}
        />

        {noteEditorOpen ? (
          <NoteEditor
            contextLabel={contact.name}
            disabled={savingNote || itemsLoading}
            error={noteErrorItemId === null ? noteError : null}
            resetOnSubmit
            submitLabel="Add note"
            onCancel={() => {
              setNoteEditorOpen(false);
              setNoteError(null);
              setNoteErrorItemId(null);
            }}
            onSubmit={createContactNote}
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
          ariaLabel="Contact content items"
          emptyDescription="Follow-up tasks and notes created for this contact will appear here with inline controls."
          emptyTitle="No contact content yet"
          error={itemError}
          items={visibleItems}
          loading={itemsLoading}
          renderContent={renderItemContent}
        />
        {hasMoreItems ? (
          <button
            className="secondary-button load-more-button"
            disabled={itemsLoading}
            type="button"
            onClick={() =>
              setVisibleItemCount((current) =>
                Math.min(current + CONTACT_FEED_PAGE_SIZE, items.length)
              )
            }
          >
            Load more
          </button>
        ) : null}
      </section>
    </section>
  );
}

function toContactFieldViewModel(
  field: ContactFieldSummary
): ContactFieldViewModel {
  return {
    id: field.id,
    label: field.label,
    value: field.value,
    type: field.type,
    sortOrder: field.sortOrder
  };
}

function toContactTaskViewModel(
  task: TaskSummary,
  categories: readonly CategorySummary[]
): ContactTaskViewModel {
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

function toContactNoteViewModel(
  note: NoteSummary,
  categories: readonly CategorySummary[]
): ContactNoteViewModel {
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

function mergeContactContent(
  tasks: readonly TaskSummary[],
  notes: readonly NoteSummary[],
  categories: readonly CategorySummary[] = []
): ContactFeedViewModel[] {
  return [
    ...tasks.map((task) => toContactTaskViewModel(task, categories)),
    ...notes.map((note) => toContactNoteViewModel(note, categories))
  ].sort(compareFeedItems);
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

function toRecentActivityViewModel(
  activity: ActivitySummary
): RecentActivityViewModel {
  return {
    id: activity.id,
    action: activity.action,
    actionLabel: activity.actionLabel,
    actorLabel: activity.actorLabel,
    targetLabel: activity.targetLabel,
    summary: activity.summary,
    description: activity.description,
    createdAt: activity.createdAt
  };
}

function toRelatedProjectViewModel(
  summary: RelatedProjectSummary
): RelatedProjectViewModel {
  return {
    relationshipId: summary.relationshipId,
    projectId: summary.project.id,
    name: summary.project.name,
    description: summary.project.description,
    status: summary.project.status,
    openTaskCount: summary.openTaskCount,
    recentActivityCount: summary.recentActivityCount,
    recentActivity: summary.recentActivity.map((activity) => ({
      id: activity.id,
      description: activity.description,
      createdAt: activity.createdAt
    }))
  };
}

function selectFirstUnlinkedProjectId(
  projects: readonly ProjectSummary[],
  relatedProjects: readonly RelatedProjectSummary[]
): string {
  const relatedIds = new Set(
    relatedProjects.map((summary) => summary.project.id)
  );

  return projects.find((project) => !relatedIds.has(project.id))?.id ?? "";
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
