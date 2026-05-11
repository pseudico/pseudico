import { ArrowLeft, Contact, Printer, RefreshCw, StickyNote, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ParsedDateRange } from "@local-work-os/core";
import {
  CategoryBadge,
  ContactTimeline,
  ContactFieldsEditor,
  ContainerMediaPreview,
  ContainerTabSummaryCards,
  FollowUpSummaryCard,
  ItemFeed,
  NoteCardContent,
  NoteEditor,
  RecentActivityList,
  RelatedContentGraphPanel,
  RelatedProjectsPanel,
  TaskCardContent,
  TaskQuickAdd,
  type ContainerTabSummaryCardViewModel,
  type ContactFieldDraft,
  type ContactFieldViewModel,
  type ItemActionId,
  type NoteCardViewModel,
  type NoteEditorSaveMeta,
  type NoteEditorSaveResult,
  type NoteEditorValues,
  type NoteWikilinkSuggestion,
  type RecentActivityViewModel,
  type RelatedContentEndpointViewModel,
  type RelatedContentGraphViewModel,
  type RelatedContentTargetOption,
  type RelatedProjectViewModel,
  type SnoozePreset,
  type TaskCardStatus,
  type TaskCardViewModel,
  type TaskQuickAddValues,
  type UniversalItemViewModel,
  type WikilinkTargetViewModel,
  type WikilinkViewModel
} from "@local-work-os/ui";
import type {
  ActivitySummary,
  CategorySummary,
  ContainerPreferencesSummary,
  ContainerTabContentSummary,
  ContainerTabSummary,
  ContactDetailSummary,
  ContactFieldSummary,
  ContactSummary,
  ContactTimelineFilter,
  ContactTimelineSummary,
  ContainerMediaSummary,
  LocalWorkOsApi,
  NoteSummary,
  ProjectSummary,
  RelatedProjectSummary,
  RelationshipEndpointInput,
  RelationshipGraphSummary,
  RelationshipType,
  TabTemplateSummary,
  TaskSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import {
  ContainerPreferencesPanel,
  type ContainerPreferencesDraft
} from "../components/ContainerPreferencesPanel";
import { ContainerTabsPanel } from "../components/ContainerTabsPanel";
import { openQuickStartFromContainer } from "../components/QuickAddModal";

type ContactTaskViewModel = TaskCardViewModel & {
  categoryId?: string | null;
  containerTabId?: string | null;
  taskStatus?: TaskSummary["taskStatus"];
  dueAt?: string | null;
  priority?: number | null;
  allDay?: boolean;
  timezone?: string | null;
};
type ContactNoteViewModel = NoteCardViewModel & {
  categoryId?: string | null;
  containerTabId?: string | null;
  format: NoteSummary["format"];
  wikilinks: readonly WikilinkViewModel[];
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
  initialTabs?: ContainerTabSummary[];
  initialTabSummaries?: ContainerTabContentSummary[];
  initialAvailableProjects?: ProjectSummary[];
  initialRelatedProjects?: RelatedProjectSummary[];
  initialTimeline?: ContactTimelineSummary | null;
  initialPreferences?: ContainerPreferencesSummary | null;
};

const emptyContactItems: UniversalItemViewModel[] = [];
const CONTACT_FEED_PAGE_SIZE = 50;

export function ContactDetailPage({
  apiClient = desktopApiClient,
  initialContactDetail,
  initialCategories = [],
  initialItems = emptyContactItems,
  initialActivity = [],
  initialTabs = [],
  initialTabSummaries = [],
  initialAvailableProjects = [],
  initialRelatedProjects = [],
  initialTimeline = null,
  initialPreferences = null
}: ContactDetailPageProps): React.JSX.Element {
  const { contactId } = useParams();
  const navigate = useNavigate();
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
  const [tabs, setTabs] = useState<ContainerTabSummary[]>(initialTabs);
  const [managedTabs, setManagedTabs] = useState<ContainerTabSummary[]>(initialTabs);
  const [tabTemplates, setTabTemplates] = useState<TabTemplateSummary[]>([]);
  const [tabSummaries, setTabSummaries] =
    useState<ContainerTabContentSummary[]>(initialTabSummaries);
  const [activeTabId, setActiveTabId] = useState<string | null>(
    selectInitialTabId(initialTabs)
  );
  const [containerPreferences, setContainerPreferences] =
    useState<ContainerPreferencesSummary | null>(initialPreferences);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [tabBusy, setTabBusy] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);
  const [projects, setProjects] =
    useState<ProjectSummary[]>(initialAvailableProjects);
  const [contactMedia, setContactMedia] = useState<ContainerMediaSummary | null>(null);
  const [contactMediaBusy, setContactMediaBusy] = useState(false);
  const [contactMediaError, setContactMediaError] = useState<string | null>(null);
  const [relatedProjects, setRelatedProjects] = useState<RelatedProjectSummary[]>(
    initialRelatedProjects
  );
  const [timeline, setTimeline] = useState<ContactTimelineSummary | null>(
    initialTimeline
  );
  const [timelineFilter, setTimelineFilter] = useState<ContactTimelineFilter>(
    initialTimeline?.filter ?? "all"
  );
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [relationshipGraph, setRelationshipGraph] =
    useState<RelationshipGraphSummary | null>(null);
  const [relationshipGraphFilter, setRelationshipGraphFilter] =
    useState<RelationshipType | "all">("all");
  const [selectedGraphTargetKey, setSelectedGraphTargetKey] = useState("");
  const [selectedGraphRelationType, setSelectedGraphRelationType] =
    useState<RelationshipType>("related");
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
  const [printBusy, setPrintBusy] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);

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
        tabsResult,
        managedTabsResult,
        tabSummariesResult,
        tabTemplatesResult,
        tasksResult,
        notesResult,
        projectsResult,
        relatedProjectsResult,
        timelineResult,
        preferencesResult
      ] = await Promise.all([
        apiClient.contacts.get(activeContactId),
        apiClient.categories.list(),
        apiClient.activity.listForTarget({
          targetType: "container",
          targetId: activeContactId
        }),
        apiClient.tabs.list(activeContactId),
        apiClient.tabs.listManaged(activeContactId),
        apiClient.tabs.listSummaries(activeContactId),
        apiClient.tabs.listTemplates(),
        apiClient.tasks.listByContainer(activeContactId),
        apiClient.notes.listByContainer(activeContactId),
        apiClient.projects.list(),
        apiClient.relationships.listProjectsForContact(activeContactId),
        apiClient.contacts.getTimeline?.({
          contactId: activeContactId,
          filter: timelineFilter
        }) ?? Promise.resolve(null),
        apiClient.containers.getPreferences(activeContactId)
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

      if (!tabsResult.ok) {
        setItemError(tabsResult.error.message);
        return;
      }

      if (!managedTabsResult.ok) {
        setItemError(managedTabsResult.error.message);
        return;
      }

      if (!tabSummariesResult.ok) {
        setItemError(tabSummariesResult.error.message);
        return;
      }

      if (!tabTemplatesResult.ok) {
        setItemError(tabTemplatesResult.error.message);
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

      if (timelineResult !== null && !timelineResult.ok) {
        setTimelineError(timelineResult.error.message);
        return;
      }

      if (!preferencesResult.ok) {
        setItemError(preferencesResult.error.message);
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
      setTabs(tabsResult.data);
      setManagedTabs(managedTabsResult.data);
      setTabSummaries(tabSummariesResult.data);
      setTabTemplates(tabTemplatesResult.data);
      setContainerPreferences(preferencesResult.data);
      setActiveTabId((current) =>
        selectAvailableTabId(
          tabsResult.data,
          preferencesResult.data.defaultView === "tab"
            ? preferencesResult.data.defaultTabId
            : current
        )
      );
      setActivity(activityResult.data.map(toRecentActivityViewModel));
      setItems(mergeContactContent(tasksResult.data, notesResult.data, categoriesResult.data));
      setTimeline(timelineResult?.data ?? null);
      setVisibleItemCount(CONTACT_FEED_PAGE_SIZE);
    }

    void loadContact();

    return () => {
      active = false;
    };
  }, [apiClient, contactId]);

  useEffect(() => {
    if (contactId === undefined) {
      setRelationshipGraph(null);
      return;
    }

    void refreshRelationshipGraph(contactId);
  }, [apiClient, contactId, relationshipGraphFilter]);

  useEffect(() => {
    if (contactId === undefined || apiClient.containerMedia === undefined) {
      return;
    }

    let active = true;
    void apiClient.containerMedia
      .getActive({ containerId: contactId, role: "contact_avatar" })
      .then((result) => {
        if (!active) {
          return;
        }
        if (result.ok) {
          setContactMedia(result.data);
        } else {
          setContactMediaError(result.error.message);
        }
      });

    return () => {
      active = false;
    };
  }, [apiClient, contactId]);

  async function saveContainerPreferences(
    draft: ContainerPreferencesDraft
  ): Promise<void> {
    if (contact === null) {
      return;
    }

    setPreferencesSaving(true);
    setPreferencesError(null);

    const result = await apiClient.containers.updatePreferences({
      containerId: contact.id,
      ...draft
    });

    if (!result.ok) {
      setPreferencesSaving(false);
      setPreferencesError(result.error.message);
      return;
    }

    setContainerPreferences(result.data);
    if (result.data.defaultView === "tab" && result.data.defaultTabId !== null) {
      setActiveTabId((current) =>
        selectAvailableTabId(tabs, result.data.defaultTabId ?? current)
      );
    }
    setPreferencesSaving(false);
    setPreferencesOpen(false);
  }

  function openContactDefaultQuickAdd(): void {
    if (contact === null) {
      return;
    }

    if (containerPreferences?.defaultQuickAddType === "note") {
      setNoteEditorOpen(true);
      setNoteError(null);
      setNoteErrorItemId(null);
      return;
    }

    openQuickStartFromContainer({
      containerId: contact.id,
      containerType: "contact",
      containerTabId: activeTabId
    });
  }

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
    await refreshContactTabSummaries(activeContactId);
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

  async function refreshContactTimeline(
    activeContactId: string,
    filter: ContactTimelineFilter = timelineFilter
  ): Promise<void> {
    setTimelineLoading(true);
    setTimelineError(null);

    const result = await apiClient.contacts.getTimeline?.({
      contactId: activeContactId,
      filter
    }) ?? null;

    setTimelineLoading(false);

    if (result === null) {
      setTimelineError("Contact timeline API is not available.");
      return;
    }

    if (!result.ok) {
      setTimelineError(result.error.message);
      return;
    }

    setTimeline(result.data);
  }

  async function refreshContactTabs(activeContactId: string): Promise<void> {
    setTabError(null);

    const [result, managedResult, templatesResult] = await Promise.all([
      apiClient.tabs.list(activeContactId),
      apiClient.tabs.listManaged(activeContactId),
      apiClient.tabs.listTemplates()
    ]);

    if (!result.ok) {
      setTabError(result.error.message);
      return;
    }

    setTabs(result.data);
    if (managedResult.ok) {
      setManagedTabs(managedResult.data);
    }
    if (templatesResult.ok) {
      setTabTemplates(templatesResult.data);
    }
    setActiveTabId((current) => selectAvailableTabId(result.data, current));
  }

  async function refreshContactTabSummaries(activeContactId: string): Promise<void> {
    const result = await apiClient.tabs.listSummaries(activeContactId);

    if (!result.ok) {
      setItemError(result.error.message);
      return;
    }

    setTabSummaries(result.data);
  }

  async function createContactTab(name: string): Promise<boolean> {
    if (contact === null) {
      return false;
    }

    setTabBusy(true);
    setTabError(null);

    const result = await apiClient.tabs.create({
      containerId: contact.id,
      name
    });

    setTabBusy(false);

    if (!result.ok) {
      setTabError(result.error.message);
      return false;
    }

    await refreshContactTabs(contact.id);
    await refreshContactTabSummaries(contact.id);
    setActiveTabId(result.data.id);
    await refreshContactActivity(contact.id);
    return true;
  }

  async function renameContactTab(
    tabId: string,
    name: string
  ): Promise<boolean> {
    if (contact === null) {
      return false;
    }

    setTabBusy(true);
    setTabError(null);

    const result = await apiClient.tabs.rename({ tabId, name });

    setTabBusy(false);

    if (!result.ok) {
      setTabError(result.error.message);
      return false;
    }

    await refreshContactTabs(contact.id);
    await refreshContactTabSummaries(contact.id);
    await refreshContactActivity(contact.id);
    return true;
  }

  async function reorderContactTabs(tabIds: string[]): Promise<void> {
    if (contact === null) {
      return;
    }

    setTabBusy(true);
    setTabError(null);

    const result = await apiClient.tabs.reorder({
      containerId: contact.id,
      tabIds
    });

    setTabBusy(false);

    if (!result.ok) {
      setTabError(result.error.message);
      return;
    }

    setTabs(result.data);
    await refreshContactTabSummaries(contact.id);
    await refreshContactActivity(contact.id);
  }

  async function deleteContactTab(tabId: string): Promise<void> {
    if (contact === null) {
      return;
    }

    setTabBusy(true);
    setTabError(null);

    const result = await apiClient.tabs.delete(tabId);

    setTabBusy(false);

    if (!result.ok) {
      setTabError(result.error.message);
      return;
    }

    await refreshContactTabs(contact.id);
    await refreshContactTabSummaries(contact.id);
    await refreshContactActivity(contact.id);
  }

  async function createContactTabFromTemplate(templateId: string): Promise<void> {
    if (contact === null) {
      return;
    }

    setTabBusy(true);
    setTabError(null);

    const result = await apiClient.tabs.createFromTemplate({
      containerId: contact.id,
      templateId
    });

    setTabBusy(false);

    if (!result.ok) {
      setTabError(result.error.message);
      return;
    }

    await refreshContactTabs(contact.id);
    await refreshContactTabSummaries(contact.id);
    setActiveTabId(result.data.id);
    await refreshContactActivity(contact.id);
  }

  async function mutateContactTab(
    tabId: string,
    operation: "hide" | "show" | "duplicate" | "archive"
  ): Promise<void> {
    if (contact === null) {
      return;
    }

    setTabBusy(true);
    setTabError(null);

    const result = await apiClient.tabs[operation](tabId);

    setTabBusy(false);

    if (!result.ok) {
      setTabError(result.error.message);
      return;
    }

    await refreshContactTabs(contact.id);
    await refreshContactTabSummaries(contact.id);
    await refreshContactActivity(contact.id);
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
    await refreshContactTimeline(contact.id);
    await refreshRelationshipGraph(contact.id);
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
    await refreshContactTimeline(contact.id);
    await refreshRelationshipGraph(contact.id);
    setRelationshipBusy(false);
  }

  async function refreshRelationshipGraph(activeContactId: string): Promise<void> {
    setRelationshipError(null);

    const result = await apiClient.relationships.getGraph({
      root: { type: "container", id: activeContactId },
      relationType: relationshipGraphFilter,
      maxDepth: 2
    });

    if (!result.ok) {
      setRelationshipError(result.error.message);
      return;
    }

    setRelationshipGraph(result.data);
  }

  async function linkSelectedGraphTarget(): Promise<void> {
    if (contact === null || selectedGraphTargetKey.length === 0) {
      return;
    }

    const target = parseRelationshipTargetKey(selectedGraphTargetKey);
    if (target === null) {
      setRelationshipError("Select a valid related content target.");
      return;
    }

    setRelationshipBusy(true);
    setRelationshipError(null);

    const result = await apiClient.relationships.createRelationship({
      workspaceId: contact.workspaceId,
      source: { type: "container", id: contact.id },
      target,
      relationType: selectedGraphRelationType
    });

    if (!result.ok) {
      setRelationshipBusy(false);
      setRelationshipError(result.error.message);
      return;
    }

    setSelectedGraphTargetKey("");
    await refreshRelatedProjects(contact.id);
    await refreshContactActivity(contact.id);
    await refreshContactTimeline(contact.id);
    await refreshRelationshipGraph(contact.id);
    setRelationshipBusy(false);
  }

  async function removeGraphRelationship(relationshipId: string): Promise<void> {
    if (contact === null) {
      return;
    }

    setRelationshipBusy(true);
    setRelationshipError(null);

    const result = await apiClient.relationships.removeRelationship(relationshipId);

    if (!result.ok) {
      setRelationshipBusy(false);
      setRelationshipError(result.error.message);
      return;
    }

    await refreshRelatedProjects(contact.id);
    await refreshContactActivity(contact.id);
    await refreshContactTimeline(contact.id);
    await refreshRelationshipGraph(contact.id);
    setRelationshipBusy(false);
  }

  function openRelationshipTarget(target: RelatedContentEndpointViewModel): void {
    if (target.kind === "project") {
      navigate(`/projects/${encodeURIComponent(target.id)}`);
      return;
    }

    if (target.kind === "contact") {
      navigate(`/contacts/${encodeURIComponent(target.id)}`);
      return;
    }

    if (target.type === "item" && target.containerId !== null) {
      navigate(`/contacts/${encodeURIComponent(target.containerId)}`);
    }
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
    await refreshContactTimeline(contact.id);
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
    await refreshContactTimeline(contact.id);
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
      containerTabId: activeTabId,
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
    await refreshContactTimeline(contact.id);
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
      containerTabId: activeTabId,
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
    await refreshContactTimeline(contact.id);
    setSavingNote(false);
    setNoteEditorOpen(false);
    return true;
  }

  async function updateContactNote(
    item: NoteCardViewModel,
    values: NoteEditorValues,
    meta: NoteEditorSaveMeta
  ): Promise<NoteEditorSaveResult | boolean> {
    if (contact === null) {
      return false;
    }

    setNoteBusyId(item.id);
    setNoteError(null);
    setNoteErrorItemId(item.id);

    const result = await apiClient.notes.update({
      itemId: item.id,
      ...(meta.expectedVersion === undefined
        ? {}
        : { expectedNoteUpdatedAt: meta.expectedVersion }),
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
    await refreshContactTimeline(contact.id);
    setNoteBusyId(null);
    setNoteErrorItemId(null);
    return {
      savedValues: values,
      savedVersion: result.data.noteUpdatedAt,
      status: "saved"
    };
  }

  async function autosaveContactNote(
    item: NoteCardViewModel,
    values: NoteEditorValues,
    meta: NoteEditorSaveMeta
  ): Promise<NoteEditorSaveResult | boolean> {
    if (contact === null) {
      return false;
    }

    const result = await apiClient.notes.update({
      itemId: item.id,
      ...(meta.expectedVersion === undefined
        ? {}
        : { expectedNoteUpdatedAt: meta.expectedVersion }),
      title: values.title,
      content: values.content
    });

    if (!result.ok) {
      setNoteError(result.error.message);
      setNoteErrorItemId(item.id);
      return result.error.message.toLocaleLowerCase().includes("changed since editing")
        ? { status: "conflict" }
        : false;
    }

    await refreshContactContent(contact.id);
    await refreshContactTimeline(contact.id);
    setNoteError(null);
    setNoteErrorItemId(null);
    return {
      savedValues: values,
      savedVersion: result.data.noteUpdatedAt,
      status: "saved"
    };
  }

  async function openContactInlineExternalLink(url: string): Promise<void> {
    setItemError(null);

    const result = await apiClient.links.openUrlExternal(url);

    if (!result.ok) {
      setItemError(result.error.message);
    }
  }

  async function copyContactInlineExternalLink(url: string): Promise<void> {
    try {
      await globalThis.navigator.clipboard.writeText(url);
      setItemError(null);
    } catch {
      setItemError("Unable to copy link to clipboard.");
    }
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
    await refreshContactTimeline(contact.id);
    setTaskBusyId(null);
  }

  async function updateTaskDateRange(
    item: TaskCardViewModel,
    range: ParsedDateRange
  ): Promise<void> {
    if (contact === null) {
      return;
    }

    setTaskBusyId(item.id);
    setTaskError(null);

    const result = await apiClient.tasks.update({
      itemId: item.id,
      startAt: range.startAt,
      dueAt: range.dueAt,
      allDay: range.allDay,
      timezone: range.timezone
    });

    if (!result.ok) {
      setTaskBusyId(null);
      setTaskError(result.error.message);
      return;
    }

    await refreshContactContent(contact.id);
    await refreshContactTimeline(contact.id);
    setTaskBusyId(null);
  }

  async function updateTaskPriority(
    item: TaskCardViewModel,
    priority: number | null
  ): Promise<void> {
    await updateTaskVisualState(item, { priority });
  }

  async function updateTaskStatus(
    item: TaskCardViewModel,
    status: TaskCardStatus
  ): Promise<void> {
    await updateTaskVisualState(item, { status });
  }

  async function updateTaskVisualState(
    item: TaskCardViewModel,
    patch: { priority?: number | null; status?: TaskCardStatus }
  ): Promise<void> {
    if (contact === null) {
      return;
    }

    setTaskBusyId(item.id);
    setTaskError(null);

    const result = await apiClient.tasks.update({
      itemId: item.id,
      ...patch
    });

    if (!result.ok) {
      setTaskBusyId(null);
      setTaskError(result.error.message);
      return;
    }

    await refreshContactContent(contact.id);
    await refreshContactTimeline(contact.id);
    setTaskBusyId(null);
  }

  async function snoozeTask(
    item: TaskCardViewModel,
    preset: SnoozePreset
  ): Promise<void> {
    if (contact === null) {
      return;
    }

    setTaskBusyId(item.id);
    setTaskError(null);

    const result = await apiClient.tasks.snooze({
      itemId: item.id,
      preset
    });

    if (!result.ok) {
      setTaskBusyId(null);
      setTaskError(result.error.message);
      return;
    }

    await refreshContactContent(contact.id);
    await refreshContactTimeline(contact.id);
    setTaskBusyId(null);
  }

  async function rescheduleTask(
    item: TaskCardViewModel,
    dueAt: string | null
  ): Promise<void> {
    if (contact === null) {
      return;
    }

    setTaskBusyId(item.id);
    setTaskError(null);

    const result = await apiClient.tasks.reschedule({
      itemId: item.id,
      dueAt,
      allDay: true
    });

    if (!result.ok) {
      setTaskBusyId(null);
      setTaskError(result.error.message);
      return;
    }

    await refreshContactContent(contact.id);
    await refreshContactTimeline(contact.id);
    setTaskBusyId(null);
  }


  function openWikilinkTarget(target: WikilinkTargetViewModel): void {
    if (target.kind === "project" && target.id.trim().length > 0) {
      navigate(`/projects/${encodeURIComponent(target.id)}`);
      return;
    }

    if (target.kind === "contact" && target.id.trim().length > 0) {
      navigate(`/contacts/${encodeURIComponent(target.id)}`);
      return;
    }

    if (target.kind === "item" && target.containerId !== undefined) {
      const itemRoute = target.containerType === "contact" ? "contacts" : "projects";
      navigate(
        `/${itemRoute}/${encodeURIComponent(target.containerId)}?item=${encodeURIComponent(target.id)}`
      );
    }
  }

  function renderItemContent(item: ContactFeedViewModel): React.JSX.Element {
    if (isTaskCardViewModel(item)) {
      return (
        <TaskCardContent
          disabled={taskBusyId === item.id}
          item={item}
          onDateRangeChange={updateTaskDateRange}
          onPriorityChange={updateTaskPriority}
          onRescheduleTask={rescheduleTask}
          onSnoozeTask={snoozeTask}
          onStatusChange={updateTaskStatus}
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
          wikilinkSuggestions={createContactWikilinkSuggestions(contact, projects, items)}
          onExternalLinkCopy={copyContactInlineExternalLink}
          onExternalLinkOpen={openContactInlineExternalLink}
          onAutosave={autosaveContactNote}
          onSave={updateContactNote}
          onWikilinkOpen={openWikilinkTarget}
        />
      );
    }

    return item.body === undefined || item.body === null ? <></> : <p>{item.body}</p>;
  }

  async function printContactPdf(): Promise<void> {
    if (contact === null) {
      return;
    }

    setPrintBusy(true);
    setPrintMessage(null);
    setItemError(null);

    const result = await apiClient.print?.printPdf({
      containerId: contact.id,
      title: contact.name,
      workspaceId: contact.workspaceId
    });

    setPrintBusy(false);

    if (result === undefined) {
      setItemError("Print/PDF export is not available.");
      return;
    }

    if (!result.ok) {
      setItemError(result.error.message);
      return;
    }

    setPrintMessage(`Contact PDF created at ${result.data.relativePath}.`);
    await refreshContactActivity(contact.id);
  }

  async function printContactItemPdf(item: ContactFeedViewModel): Promise<void> {
    if (contact === null) {
      return;
    }

    setPrintBusy(true);
    setPrintMessage(null);
    setItemError(null);

    const result = await apiClient.print?.printPdf({
      itemIds: [item.id],
      title: item.title,
      workspaceId: contact.workspaceId
    });

    setPrintBusy(false);

    if (result === undefined) {
      setItemError("Print/PDF export is not available.");
      return;
    }

    if (!result.ok) {
      setItemError(result.error.message);
      return;
    }

    setPrintMessage(`Item PDF created at ${result.data.relativePath}.`);
    await refreshContactActivity(contact.id);
  }

  function handleItemAction(action: ItemActionId, itemId: string): void {
    const item = items.find((candidate) => candidate.id === itemId);

    if (item === undefined) {
      return;
    }

    if (action === "print") {
      void printContactItemPdf(item);
      return;
    }

    setItemError("That context menu action is not available in this view yet.");
  }

  async function setContactAvatar(): Promise<void> {
    if (contact === null || apiClient.containerMedia === undefined) {
      return;
    }

    setContactMediaBusy(true);
    setContactMediaError(null);
    const result = await apiClient.containerMedia.chooseAndSet({
      containerId: contact.id,
      role: "contact_avatar",
      altText: `${contact.name} photo`
    });
    setContactMediaBusy(false);

    if (!result.ok) {
      setContactMediaError(result.error.message);
      return;
    }

    if (result.data !== null) {
      setContactMedia(result.data);
      await refreshContactActivity(contact.id);
    }
  }

  async function removeContactAvatar(): Promise<void> {
    if (contact === null || apiClient.containerMedia === undefined) {
      return;
    }

    setContactMediaBusy(true);
    setContactMediaError(null);
    const result = await apiClient.containerMedia.remove({
      containerId: contact.id,
      role: "contact_avatar"
    });
    setContactMediaBusy(false);

    if (!result.ok) {
      setContactMediaError(result.error.message);
      return;
    }

    setContactMedia(null);
    await refreshContactActivity(contact.id);
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
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const tabItems = applyContainerPreferenceOrdering(
    items
      .filter((item) => isItemVisibleForTab(item, activeTab))
      .filter((item) =>
        containerPreferences?.showCompleted === false
          ? !isCompletedFeedItem(item)
          : true
      ),
    containerPreferences?.grouping ?? "none"
  );
  const visibleItems = tabItems.slice(0, visibleItemCount);
  const hasMoreItems = visibleItemCount < tabItems.length;
  const tabSummaryCards = (
    <ContainerTabSummaryCards
      activeTabId={activeTabId}
      busy={itemsLoading || tabBusy}
      summaries={tabSummaries.map(toContainerTabSummaryCardViewModel)}
      onOpenItem={(_itemId, tabId) => {
        setActiveTabId(tabId);
        setVisibleItemCount(CONTACT_FEED_PAGE_SIZE);
      }}
      onSelectTab={(tabId) => {
        setActiveTabId(tabId);
        setVisibleItemCount(CONTACT_FEED_PAGE_SIZE);
      }}
    />
  );
  const showSummaryFirst =
    containerPreferences?.summaryFirst === true ||
    containerPreferences?.defaultView === "summary";
  const relationshipGraphTargets = createRelationshipTargetOptions({
    currentContainerId: contact.id,
    projects,
    items
  });

  return (
    <section
      className={`project-detail-page${
        containerPreferences?.compactMode === true
          ? " container-preferences-compact"
          : ""
      }`}
    >
      <Link className="text-link page-action-link" to="/contacts">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to contacts
      </Link>

      <header className="project-detail-header">
        <ContainerMediaPreview
          busy={contactMediaBusy}
          error={contactMediaError}
          media={contactMedia}
          title={contact.name}
          variant="avatar"
          onRemove={() => void removeContactAvatar()}
          onSet={() => void setContactAvatar()}
        />
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
        <div className="button-row">
          <button
            className="secondary-button compact-button"
            disabled={printBusy}
            type="button"
            onClick={() => void printContactPdf()}
          >
            <Printer size={16} aria-hidden="true" />
            Print / PDF
          </button>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={() => {
              setPreferencesOpen(true);
              setPreferencesError(null);
            }}
          >
            Display settings
          </button>
        </div>
      </header>

      <ContainerPreferencesPanel
        error={preferencesError}
        open={preferencesOpen}
        preferences={containerPreferences}
        saving={preferencesSaving}
        tabs={tabs}
        onClose={() => setPreferencesOpen(false)}
        onSave={(draft) => void saveContainerPreferences(draft)}
      />

      {printMessage === null ? null : (
        <p className="form-message">{printMessage}</p>
      )}

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

      {showSummaryFirst ? tabSummaryCards : null}

      <RelatedContentGraphPanel
        availableTargets={relationshipGraphTargets}
        busy={relationshipBusy}
        error={relationshipError}
        graph={relationshipGraph as RelatedContentGraphViewModel | null}
        relationFilter={relationshipGraphFilter}
        selectedRelationType={selectedGraphRelationType}
        selectedTargetKey={selectedGraphTargetKey}
        onCreateRelationship={() => void linkSelectedGraphTarget()}
        onOpenTarget={openRelationshipTarget}
        onRelationFilterChange={(relationType) =>
          setRelationshipGraphFilter(relationType)
        }
        onRemoveRelationship={(relationshipId) =>
          void removeGraphRelationship(relationshipId)
        }
        onSelectedRelationTypeChange={setSelectedGraphRelationType}
        onSelectedTargetChange={setSelectedGraphTargetKey}
      />

      <FollowUpSummaryCard
        summary={
          timeline?.followUpSummary ?? {
            generatedAt: "",
            nextDueTask: null,
            openFollowUpCount: 0,
            openFollowUps: [],
            overdueTaskCount: 0
          }
        }
      />

      <ContactTimeline
        entries={timeline?.entries ?? []}
        error={timelineError}
        filter={timelineFilter}
        loading={timelineLoading}
        onFilterChange={(filter) => {
          setTimelineFilter(filter);
          void refreshContactTimeline(contact.id, filter);
        }}
      />

      <RecentActivityList
        activity={activity}
        emptyMessage="No contact activity recorded yet."
      />

      <ContainerTabsPanel
        activeTabId={activeTabId}
        busy={tabBusy}
        error={tabError}
        managedTabs={managedTabs}
        tabs={tabs}
        templates={tabTemplates}
        onArchiveTab={(tabId) => void mutateContactTab(tabId, "archive")}
        onCreateTab={createContactTab}
        onCreateTabFromTemplate={(templateId) => void createContactTabFromTemplate(templateId)}
        onDeleteTab={(tabId) => void deleteContactTab(tabId)}
        onDuplicateTab={(tabId) => void mutateContactTab(tabId, "duplicate")}
        onHideTab={(tabId) => void mutateContactTab(tabId, "hide")}
        onRenameTab={renameContactTab}
        onReorderTabs={(tabIds) => void reorderContactTabs(tabIds)}
        onSelectTab={(tabId) => {
          setActiveTabId(tabId);
          setVisibleItemCount(CONTACT_FEED_PAGE_SIZE);
        }}
        onShowTab={(tabId) => void mutateContactTab(tabId, "show")}
      />

      {showSummaryFirst ? null : tabSummaryCards}

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
          <button
            className="primary-button compact-button"
            disabled={itemsLoading}
            type="button"
            onClick={openContactDefaultQuickAdd}
          >
            Quick Start ({formatQuickAddType(containerPreferences?.defaultQuickAddType)})
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
            draftKey={`local-work-os:note-draft:${contact.workspaceId}:${contact.id}:${activeTabId ?? "feed"}:new`}
            error={noteErrorItemId === null ? noteError : null}
            resetOnSubmit
            submitLabel="Add note"
            onCancel={() => {
              setNoteEditorOpen(false);
              setNoteError(null);
              setNoteErrorItemId(null);
            }}
            wikilinkSuggestions={createContactWikilinkSuggestions(contact, projects, items)}
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
          emptyTitle={
            activeTab === null
              ? "No contact content yet"
              : `No content in ${activeTab.name} yet`
          }
          error={itemError}
          items={visibleItems}
          loading={itemsLoading}
          renderContent={renderItemContent}
          onAction={handleItemAction}
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


function toContainerTabSummaryCardViewModel(
  summary: ContainerTabContentSummary
): ContainerTabSummaryCardViewModel {
  return {
    tabId: summary.tab.id,
    name: summary.tab.name,
    isDefault: summary.tab.isDefault,
    totalItemCount: summary.totalItemCount,
    openTaskCount: summary.openTaskCount,
    completedTaskCount: summary.completedTaskCount,
    overdueTaskCount: summary.overdueTaskCount,
    upcomingTaskCount: summary.upcomingTaskCount,
    noteCount: summary.noteCount,
    fileCount: summary.fileCount,
    linkCount: summary.linkCount,
    listCount: summary.listCount,
    openTaskPreviews: summary.openTaskPreviews,
    recentContentPreviews: summary.recentContentPreviews
  };
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
    containerTabId: task.containerTabId,
    categoryLabel: findCategoryName(task.categoryId, categories),
    categoryColor: findCategoryColor(task.categoryId, categories),
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
    containerTabId: note.containerTabId,
    categoryLabel: findCategoryName(note.categoryId, categories),
    sortOrder: note.sortOrder,
    createdAt: note.createdAt,
    updatedLabel: note.updatedAt,
    pinned: note.pinned,
    tags: note.tags ?? [],
    content: note.content,
    preview: note.preview,
    format: note.format,
    noteUpdatedAt: note.noteUpdatedAt,
    wikilinks: note.wikilinks ?? []
  };
}


function createContactWikilinkSuggestions(
  contact: ContactSummary | null,
  projects: readonly ProjectSummary[],
  items: readonly ContactFeedViewModel[]
): NoteWikilinkSuggestion[] {
  return [
    ...(contact === null
      ? []
      : [{ id: contact.id, title: contact.name, kind: "contact" as const }]),
    ...projects.map((project) => ({
      id: project.id,
      title: project.name,
      kind: "project" as const
    })),
    ...items.map((item) => ({
      id: item.id,
      title: item.title,
      kind: "item" as const
    }))
  ];
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

function findCategoryColor(
  categoryId: string | null | undefined,
  categories: readonly CategorySummary[]
): string | null {
  if (categoryId === undefined || categoryId === null) {
    return null;
  }

  return categories.find((category) => category.id === categoryId)?.color ?? null;
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

function createRelationshipTargetOptions(input: {
  currentContainerId: string;
  projects: readonly ProjectSummary[];
  items: readonly ContactFeedViewModel[];
}): RelatedContentTargetOption[] {
  return [
    ...input.projects.map((project) => ({
      type: "container" as const,
      id: project.id,
      label: `Project · ${project.name}`,
      helperText: project.description
    })),
    ...input.items.map((item) => ({
      type: "item" as const,
      id: item.id,
      label: `${item.type} · ${item.title}`,
      helperText:
        "description" in item && typeof item.description === "string"
          ? item.description
          : null
    }))
  ].filter((target) => target.id !== input.currentContainerId);
}

function parseRelationshipTargetKey(
  key: string
): RelationshipEndpointInput | null {
  const [type, ...idParts] = key.split(":");
  const id = idParts.join(":");

  if (
    (type === "container" || type === "item" || type === "list_item") &&
    id.length > 0
  ) {
    return { type, id };
  }

  return null;
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

function applyContainerPreferenceOrdering<T extends UniversalItemViewModel>(
  items: readonly T[],
  grouping: ContainerPreferencesSummary["grouping"]
): T[] {
  if (grouping === "none") {
    return [...items];
  }

  return [...items].sort((left, right) => {
    const groupDelta = getContainerPreferenceGroup(left, grouping).localeCompare(
      getContainerPreferenceGroup(right, grouping)
    );

    return groupDelta === 0 ? compareFeedItems(left, right) : groupDelta;
  });
}

function getContainerPreferenceGroup(
  item: UniversalItemViewModel,
  grouping: ContainerPreferencesSummary["grouping"]
): string {
  switch (grouping) {
    case "type":
      return item.type;
    case "tab":
      return "containerTabId" in item && typeof item.containerTabId === "string"
        ? item.containerTabId
        : "";
    case "status":
      return item.status ?? "";
    default:
      return "";
  }
}

function isCompletedFeedItem(item: UniversalItemViewModel): boolean {
  if (isTaskCardViewModel(item)) {
    return item.taskStatus === "done" || item.status === "completed";
  }

  return item.status === "completed";
}

function formatQuickAddType(
  type: ContainerPreferencesSummary["defaultQuickAddType"] | undefined
): string {
  switch (type) {
    case "note":
      return "Note";
    case "list":
      return "List";
    case "link":
      return "Link";
    case "file":
      return "File";
    default:
      return "Task";
  }
}

function selectInitialTabId(
  tabs: readonly ContainerTabSummary[]
): string | null {
  return tabs.find((tab) => tab.isDefault)?.id ?? tabs[0]?.id ?? null;
}

function selectAvailableTabId(
  tabs: readonly ContainerTabSummary[],
  currentTabId: string | null
): string | null {
  if (
    currentTabId !== null &&
    tabs.some((tab) => tab.id === currentTabId)
  ) {
    return currentTabId;
  }

  return selectInitialTabId(tabs);
}

function isItemVisibleForTab(
  item: ContactFeedViewModel,
  tab: ContainerTabSummary | null
): boolean {
  if (tab === null) {
    return true;
  }

  const itemTabId =
    "containerTabId" in item && typeof item.containerTabId === "string"
      ? item.containerTabId
      : null;

  return itemTabId === tab.id || (itemTabId === null && tab.isDefault);
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
