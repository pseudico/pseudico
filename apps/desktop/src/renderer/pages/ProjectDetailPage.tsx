import {
  ArrowLeft,
  Download,
  FolderKanban,
  Link2,
  MapPin,
  Paperclip,
  Printer,
  RefreshCw,
  StickyNote,
  Tag
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  moveIdBeforeTarget,
  type InspectorTarget,
  type ParsedDateRange
} from "@local-work-os/core";
import {
  CategoryBadge,
  CategoryPicker,
  ContainerTabSummaryCards,
  ConfirmDialog,
  ContainerMediaPreview,
  CreateListForm,
  FileCardContent,
  ItemInspectorPanel,
  ItemFeed,
  LinkCardContent,
  LinkEditor,
  LocationCardContent,
  LocationEditor,
  ListCardContent,
  MoveItemDialog,
  NoteCardContent,
  NoteEditor,
  ProjectHealthCard,
  RecentActivityList,
  RelatedContentGraphPanel,
  RelatedContactsPanel,
  TaskCardContent,
  TaskQuickAdd,
  ViewModeSwitcher,
  type ChecklistBulkAction,
  type ContainerTabSummaryCardViewModel,
  type CreateListFormValues,
  type FileCardViewModel,
  type FileMetadataEditorValues,
  type FileVersionViewModel,
  type ItemActionId,
  type ItemInspectorActivity,
  type ItemInspectorItem,
  type InspectorCategoryOption,
  type LinkCardViewModel,
  type LinkEditorValues,
  type LinkWidgetSettingsPatch,
  type LocationCardViewModel,
  type LocationEditorValues,
  type ListCardItemViewModel,
  type ListCardViewModel,
  type MoveTargetContainer,
  type NoteCardViewModel,
  type NoteEditorSaveMeta,
  type NoteEditorSaveResult,
  type NoteEditorValues,
  type NoteWikilinkSuggestion,
  type ProjectHealthViewModel,
  type RecentActivityViewModel,
  type RelatedContentEndpointViewModel,
  type RelatedContentGraphViewModel,
  type RelatedContentTargetOption,
  type RelatedContactViewModel,
  type TagBadgeViewModel,
  type SnoozePreset,
  type TaskCardStatus,
  type TaskCardViewModel,
  type TaskQuickAddValues,
  type UniversalItemViewModel,
  type ViewMode,
  type WikilinkTargetViewModel,
  type WikilinkViewModel
} from "@local-work-os/ui";
import type {
  ActivitySummary,
  AttachmentVersionSummary,
  CategorySummary,
  ContainerTabContentSummary,
  ContainerTabSummary,
  ContainerPreferencesSummary,
  ContactSummary,
  FileItemSummary,
  ContainerMediaSummary,
  ItemSummary,
  LinkSummary,
  LocationSummary,
  ListItemSummary,
  ListSummary,
  LocalWorkOsApi,
  NoteSummary,
  ProjectSummary,
  ProjectHealthSummary,
  RelatedContactSummary,
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
import {
  formatEmailDropImportMessage,
  importEmailDropSources,
  splitEmailDropSourcePaths
} from "../utils/emailDropImport";

type ProjectTaskViewModel = TaskCardViewModel & {
  categoryId?: string | null;
  containerTabId?: string | null;
  taskStatus?: TaskSummary["taskStatus"];
  dueAt?: string | null;
  priority?: number | null;
  allDay?: boolean;
  timezone?: string | null;
};
type ProjectListViewModel = ListCardViewModel & {
  categoryId?: string | null;
  containerTabId?: string | null;
  listItems: ListCardItemViewModel[];
};
type ProjectNoteViewModel = NoteCardViewModel & {
  categoryId?: string | null;
  containerTabId?: string | null;
  format: NoteSummary["format"];
  wikilinks: readonly WikilinkViewModel[];
};
type ProjectLinkViewModel = LinkCardViewModel & {
  categoryId?: string | null;
  containerTabId?: string | null;
};
type ProjectLocationViewModel = LocationCardViewModel & {
  categoryId?: string | null;
  containerTabId?: string | null;
};
type ProjectFileViewModel = FileCardViewModel & {
  categoryId?: string | null;
  containerTabId?: string | null;
};
type ProjectFeedViewModel =
  | ProjectTaskViewModel
  | ProjectListViewModel
  | ProjectNoteViewModel
  | ProjectLinkViewModel
  | ProjectLocationViewModel
  | ProjectFileViewModel
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
  initialActivity?: RecentActivityViewModel[];
  initialTabs?: ContainerTabSummary[];
  initialTabSummaries?: ContainerTabContentSummary[];
  initialProjectHealth?: ProjectHealthViewModel | null;
  initialAvailableContacts?: ContactSummary[];
  initialRelatedContacts?: RelatedContactSummary[];
  initialPreferences?: ContainerPreferencesSummary | null;
  initialWebWidgetsEnabled?: boolean;
};

const emptyProjectItems: UniversalItemViewModel[] = [];
const PROJECT_FEED_PAGE_SIZE = 50;

export function ProjectDetailPage({
  apiClient = desktopApiClient,
  initialProject,
  initialCategories = [],
  initialItems = emptyProjectItems,
  initialActivity = [],
  initialTabs = [],
  initialTabSummaries = [],
  initialProjectHealth = null,
  initialAvailableContacts = [],
  initialRelatedContacts = [],
  initialPreferences = null,
  initialWebWidgetsEnabled = false
}: ProjectDetailPageProps): React.JSX.Element {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedItemId = searchParams.get("item");
  const [project, setProject] = useState<ProjectSummary | null>(
    initialProject ?? null
  );
  const [items, setItems] = useState<ProjectFeedViewModel[]>(initialItems);
  const [visibleItemCount, setVisibleItemCount] = useState(
    Math.max(PROJECT_FEED_PAGE_SIZE, initialItems.length)
  );
  const [categories, setCategories] =
    useState<CategorySummary[]>(initialCategories);
  const [projectActivity, setProjectActivity] =
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
  const [webWidgetsEnabled, setWebWidgetsEnabled] = useState(
    initialWebWidgetsEnabled
  );
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [viewModeSaving, setViewModeSaving] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [tabBusy, setTabBusy] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);
  const [projectHealth, setProjectHealth] =
    useState<ProjectHealthViewModel | null>(initialProjectHealth);
  const [projectMedia, setProjectMedia] = useState<ContainerMediaSummary | null>(null);
  const [projectMediaBusy, setProjectMediaBusy] = useState(false);
  const [projectMediaError, setProjectMediaError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [contacts, setContacts] =
    useState<ContactSummary[]>(initialAvailableContacts);
  const [relatedContacts, setRelatedContacts] = useState<RelatedContactSummary[]>(
    initialRelatedContacts
  );
  const [selectedContactId, setSelectedContactId] = useState("");
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [relationshipGraph, setRelationshipGraph] =
    useState<RelationshipGraphSummary | null>(null);
  const [relationshipGraphFilter, setRelationshipGraphFilter] =
    useState<RelationshipType | "all">("all");
  const [selectedGraphTargetKey, setSelectedGraphTargetKey] = useState("");
  const [selectedGraphRelationType, setSelectedGraphRelationType] =
    useState<RelationshipType>("related");
  const [loading, setLoading] = useState(initialProject === undefined);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingList, setSavingList] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);
  const [listBusyId, setListBusyId] = useState<string | null>(null);
  const [noteBusyId, setNoteBusyId] = useState<string | null>(null);
  const [linkBusyId, setLinkBusyId] = useState<string | null>(null);
  const [locationBusyId, setLocationBusyId] = useState<string | null>(null);
  const [fileBusyId, setFileBusyId] = useState<string | null>(null);
  const [noteErrorItemId, setNoteErrorItemId] = useState<string | null>(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [itemActionError, setItemActionError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [movingItem, setMovingItem] = useState<ProjectFeedViewModel | null>(null);
  const [confirmAction, setConfirmAction] =
    useState<PendingConfirmAction | null>(null);

  useEffect(() => {
    if (project === null) {
      return;
    }

    let cancelled = false;
    if (apiClient.viewModes === undefined) {
      return;
    }

    void apiClient.viewModes
      .getViewMode({ contextType: "container", contextId: project.id })
      .then((result) => {
        if (!cancelled && result.ok) {
          setViewMode(result.data.mode);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, project?.id]);

  async function changeProjectViewMode(mode: ViewMode): Promise<void> {
    if (project === null || mode === viewMode) {
      return;
    }

    setViewModeSaving(true);
    setItemError(null);
    if (apiClient.viewModes === undefined) {
      setViewMode(mode);
      return;
    }

    const result = await apiClient.viewModes.setViewMode({
      contextType: "container",
      contextId: project.id,
      mode
    });
    setViewModeSaving(false);

    if (!result.ok) {
      setItemError(result.error.message);
      return;
    }

    setViewMode(result.data.mode);
  }

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
        activityResult,
        tabsResult,
        managedTabsResult,
        tabSummariesResult,
        tabTemplatesResult,
        healthResult,
        tasksResult,
        listsResult,
        notesResult,
        linksResult,
        locationsResult,
        filesResult,
        contactsResult,
        relatedContactsResult,
        preferencesResult,
        privacyResult
      ] = await Promise.all([
        apiClient.projects.get(activeProjectId),
        apiClient.projects.list(),
        apiClient.categories.list(),
        apiClient.activity.listForTarget({
          targetType: "container",
          targetId: activeProjectId
        }),
        apiClient.tabs.list(activeProjectId),
        apiClient.tabs.listManaged(activeProjectId),
        apiClient.tabs.listSummaries(activeProjectId),
        apiClient.tabs.listTemplates(),
        apiClient.projects.getHealth(activeProjectId),
        apiClient.tasks.listByContainer(activeProjectId),
        apiClient.lists.listByContainer(activeProjectId),
        apiClient.notes.listByContainer(activeProjectId),
        apiClient.links.listByContainer(activeProjectId),
        apiClient.locations.listByContainer(activeProjectId),
        apiClient.files.listByContainer(activeProjectId),
        apiClient.contacts.list(),
        apiClient.relationships.listContactsForProject(activeProjectId),
        apiClient.containers.getPreferences(activeProjectId),
        apiClient.privacy?.getSettings()
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

      if (!healthResult.ok) {
        setItemError(healthResult.error.message);
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

      if (!linksResult.ok) {
        setItemError(linksResult.error.message);
        return;
      }

      if (!locationsResult.ok) {
        setItemError(locationsResult.error.message);
        return;
      }

      if (!filesResult.ok) {
        setItemError(filesResult.error.message);
        return;
      }

      if (!contactsResult.ok) {
        setItemError(contactsResult.error.message);
        return;
      }

      if (!relatedContactsResult.ok) {
        setItemError(relatedContactsResult.error.message);
        return;
      }

      if (!preferencesResult.ok) {
        setItemError(preferencesResult.error.message);
        return;
      }

      setProject(projectResult.data);
      setProjects(projectsResult.data);
      setContacts(contactsResult.data);
      setRelatedContacts(relatedContactsResult.data);
      setSelectedContactId(selectFirstUnlinkedContactId(
        contactsResult.data,
        relatedContactsResult.data
      ));
      setCategories(categoriesResult.data);
      setTabs(tabsResult.data);
      setManagedTabs(managedTabsResult.data);
      setTabSummaries(tabSummariesResult.data);
      setTabTemplates(tabTemplatesResult.data);
      setContainerPreferences(preferencesResult.data);
      setWebWidgetsEnabled(
        privacyResult !== undefined && privacyResult.ok
          ? privacyResult.data.webWidgetsEnabled
          : false
      );
      setActiveTabId((current) =>
        selectAvailableTabId(
          tabsResult.data,
          preferencesResult.data.defaultView === "tab"
            ? preferencesResult.data.defaultTabId
            : current
        )
      );
      setProjectActivity(activityResult.data.map(toRecentActivityViewModel));
      setProjectHealth(toProjectHealthViewModel(healthResult.data));
      const hydratedFiles = await loadFileVersions(filesResult.data);
      if (!hydratedFiles.ok) {
        setItemError(hydratedFiles.error);
        return;
      }
      const mergedItems = mergeProjectContent(
        tasksResult.data,
        listsResult.data,
        notesResult.data,
        linksResult.data,
        locationsResult.data,
        hydratedFiles.data,
        categoriesResult.data
      );

      setItems(mergedItems);
      setVisibleItemCount(PROJECT_FEED_PAGE_SIZE);
    }

    void loadProject();

    return () => {
      active = false;
    };
  }, [apiClient, projectId]);

  useEffect(() => {
    if (projectId === undefined || apiClient.containerMedia === undefined) {
      return;
    }

    let active = true;
    void apiClient.containerMedia
      .getActive({ containerId: projectId, role: "project_banner" })
      .then((result) => {
        if (!active) {
          return;
        }
        if (result.ok) {
          setProjectMedia(result.data);
        } else {
          setProjectMediaError(result.error.message);
        }
      });

    return () => {
      active = false;
    };
  }, [apiClient, projectId]);

  useEffect(() => {
    if (projectId === undefined) {
      setRelationshipGraph(null);
      return;
    }

    void refreshRelationshipGraph(projectId);
  }, [apiClient, projectId, relationshipGraphFilter]);

  useEffect(() => {
    if (
      selectedItemId === null ||
      selectedItemId.trim().length === 0 ||
      inspector?.item.id === selectedItemId ||
      !items.some((item) => item.id === selectedItemId)
    ) {
      return;
    }

    void openInspector(selectedItemId);
  }, [inspector?.item.id, items, selectedItemId]);

  async function refreshProjectContent(activeProjectId: string): Promise<void> {
    setItemsLoading(true);
    setItemError(null);

    const [tasksResult, listsResult, notesResult, linksResult, locationsResult, filesResult] = await Promise.all([
      apiClient.tasks.listByContainer(activeProjectId),
      apiClient.lists.listByContainer(activeProjectId),
      apiClient.notes.listByContainer(activeProjectId),
      apiClient.links.listByContainer(activeProjectId),
      apiClient.locations.listByContainer(activeProjectId),
      apiClient.files.listByContainer(activeProjectId)
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

    if (!linksResult.ok) {
      setItemError(linksResult.error.message);
      return;
    }

    if (!locationsResult.ok) {
      setItemError(locationsResult.error.message);
      return;
    }

    if (!filesResult.ok) {
      setItemError(filesResult.error.message);
      return;
    }

    const hydratedFiles = await loadFileVersions(filesResult.data);

    if (!hydratedFiles.ok) {
      setItemError(hydratedFiles.error);
      return;
    }

    const mergedItems = mergeProjectContent(
      tasksResult.data,
      listsResult.data,
      notesResult.data,
      linksResult.data,
      locationsResult.data,
      hydratedFiles.data,
      categories
    );

    setItems(mergedItems);
    await refreshProjectTabSummaries(activeProjectId);
    setVisibleItemCount((current) =>
      Math.min(Math.max(current, PROJECT_FEED_PAGE_SIZE), mergedItems.length)
    );
  }

  async function loadFileVersions(
    files: readonly FileItemSummary[]
  ): Promise<{
    ok: true;
    data: Array<FileItemSummary & { versions: AttachmentVersionSummary[] }>;
  } | {
    ok: false;
    error: string;
  }> {
    const versionResults = await Promise.all(
      files.map((file) => apiClient.files.listFileVersions(file.attachment.id))
    );
    const failed = versionResults.find((result) => !result.ok);

    if (failed !== undefined && !failed.ok) {
      return {
        ok: false,
        error: failed.error.message
      };
    }

    return {
      ok: true,
      data: files.map((file, index) => ({
        ...file,
        versions: versionResults[index]?.ok === true
          ? versionResults[index].data
          : []
      }))
    };
  }

  async function refreshProjectActivity(activeProjectId: string): Promise<void> {
    setItemError(null);

    const result = await apiClient.activity.listForTarget({
      targetType: "container",
      targetId: activeProjectId
    });

    if (!result.ok) {
      setItemError(result.error.message);
      return;
    }

    setProjectActivity(result.data.map(toRecentActivityViewModel));
  }

  async function refreshProjectHealth(activeProjectId: string): Promise<void> {
    setItemError(null);

    const result = await apiClient.projects.getHealth(activeProjectId);

    if (!result.ok) {
      setItemError(result.error.message);
      return;
    }

    setProjectHealth(toProjectHealthViewModel(result.data));
  }

  async function refreshProjectTabs(activeProjectId: string): Promise<void> {
    setTabError(null);

    const [result, managedResult, templatesResult] = await Promise.all([
      apiClient.tabs.list(activeProjectId),
      apiClient.tabs.listManaged(activeProjectId),
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

  async function refreshProjectTabSummaries(activeProjectId: string): Promise<void> {
    const result = await apiClient.tabs.listSummaries(activeProjectId);

    if (!result.ok) {
      setItemError(result.error.message);
      return;
    }

    setTabSummaries(result.data);
  }

  async function createProjectTab(name: string): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setTabBusy(true);
    setTabError(null);

    const result = await apiClient.tabs.create({
      containerId: project.id,
      name
    });

    setTabBusy(false);

    if (!result.ok) {
      setTabError(result.error.message);
      return false;
    }

    await refreshProjectTabs(project.id);
    await refreshProjectTabSummaries(project.id);
    setActiveTabId(result.data.id);
    await refreshProjectActivity(project.id);
    return true;
  }

  async function renameProjectTab(
    tabId: string,
    name: string
  ): Promise<boolean> {
    if (project === null) {
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

    await refreshProjectTabs(project.id);
    await refreshProjectTabSummaries(project.id);
    await refreshProjectActivity(project.id);
    return true;
  }

  async function reorderProjectTabs(tabIds: string[]): Promise<void> {
    if (project === null) {
      return;
    }

    setTabBusy(true);
    setTabError(null);

    const result = await apiClient.tabs.reorder({
      containerId: project.id,
      tabIds
    });

    setTabBusy(false);

    if (!result.ok) {
      setTabError(result.error.message);
      return;
    }

    setTabs(result.data);
    await refreshProjectTabSummaries(project.id);
    await refreshProjectActivity(project.id);
  }

  async function deleteProjectTab(tabId: string): Promise<void> {
    if (project === null) {
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

    await refreshProjectTabs(project.id);
    await refreshProjectTabSummaries(project.id);
    await refreshProjectActivity(project.id);
  }

  async function createProjectTabFromTemplate(templateId: string): Promise<void> {
    if (project === null) {
      return;
    }

    setTabBusy(true);
    setTabError(null);

    const result = await apiClient.tabs.createFromTemplate({
      containerId: project.id,
      templateId
    });

    setTabBusy(false);

    if (!result.ok) {
      setTabError(result.error.message);
      return;
    }

    await refreshProjectTabs(project.id);
    await refreshProjectTabSummaries(project.id);
    setActiveTabId(result.data.id);
    await refreshProjectActivity(project.id);
  }

  async function mutateProjectTab(
    tabId: string,
    operation: "hide" | "show" | "duplicate" | "archive"
  ): Promise<void> {
    if (project === null) {
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

    await refreshProjectTabs(project.id);
    await refreshProjectTabSummaries(project.id);
    await refreshProjectActivity(project.id);
  }

  async function refreshRelatedContacts(activeProjectId: string): Promise<void> {
    setRelationshipError(null);

    const result = await apiClient.relationships.listContactsForProject(
      activeProjectId
    );

    if (!result.ok) {
      setRelationshipError(result.error.message);
      return;
    }

    setRelatedContacts(result.data);
    setSelectedContactId((current) =>
      current.trim().length > 0 &&
      !result.data.some((summary) => summary.contact.id === current)
        ? current
        : selectFirstUnlinkedContactId(contacts, result.data)
    );
  }

  async function linkSelectedContact(): Promise<void> {
    if (project === null || selectedContactId.trim().length === 0) {
      return;
    }

    setRelationshipBusy(true);
    setRelationshipError(null);

    const result = await apiClient.relationships.linkContactToProject({
      workspaceId: project.workspaceId,
      contactId: selectedContactId,
      projectId: project.id
    });

    if (!result.ok) {
      setRelationshipBusy(false);
      setRelationshipError(result.error.message);
      return;
    }

    await refreshRelatedContacts(project.id);
    await refreshProjectActivity(project.id);
    await refreshRelationshipGraph(project.id);
    setRelationshipBusy(false);
  }

  async function unlinkRelatedContact(relationshipId: string): Promise<void> {
    if (project === null) {
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

    await refreshRelatedContacts(project.id);
    await refreshProjectActivity(project.id);
    await refreshRelationshipGraph(project.id);
    setRelationshipBusy(false);
  }

  async function refreshRelationshipGraph(activeProjectId: string): Promise<void> {
    setRelationshipError(null);

    const result = await apiClient.relationships.getGraph({
      root: { type: "container", id: activeProjectId },
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
    if (project === null || selectedGraphTargetKey.length === 0) {
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
      workspaceId: project.workspaceId,
      source: { type: "container", id: project.id },
      target,
      relationType: selectedGraphRelationType
    });

    if (!result.ok) {
      setRelationshipBusy(false);
      setRelationshipError(result.error.message);
      return;
    }

    setSelectedGraphTargetKey("");
    await refreshRelatedContacts(project.id);
    await refreshProjectActivity(project.id);
    await refreshRelationshipGraph(project.id);
    setRelationshipBusy(false);
  }

  async function removeGraphRelationship(relationshipId: string): Promise<void> {
    if (project === null) {
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

    await refreshRelatedContacts(project.id);
    await refreshProjectActivity(project.id);
    await refreshRelationshipGraph(project.id);
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
      if (target.containerType === "contact") {
        navigate(`/contacts/${encodeURIComponent(target.containerId)}`);
        return;
      }

      navigate(
        `/projects/${encodeURIComponent(target.containerId)}?item=${encodeURIComponent(target.id)}`
      );
    }
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
      containerTabId: activeTabId,
      title: values.title,
      dueAt: values.dueDate.length === 0 ? null : values.dueDate
    });

    if (!result.ok) {
      setSavingTask(false);
      setTaskError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    await refreshProjectHealth(project.id);
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
      containerTabId: activeTabId,
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
      containerTabId: activeTabId,
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

  async function createProjectLink(
    values: LinkEditorValues
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setSavingLink(true);
    setLinkError(null);

    const result = await apiClient.links.create({
      workspaceId: project.workspaceId,
      containerId: project.id,
      containerTabId: activeTabId,
      url: values.url,
      title: values.title.length === 0 ? null : values.title,
      description: values.description.length === 0 ? null : values.description
    });

    if (!result.ok) {
      setSavingLink(false);
      setLinkError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    setSavingLink(false);
    setLinkEditorOpen(false);
    return true;
  }


  async function createProjectLocation(
    values: LocationEditorValues
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setSavingLocation(true);
    setLocationError(null);

    const result = await apiClient.locations.create({
      workspaceId: project.workspaceId,
      containerId: project.id,
      containerTabId: activeTabId,
      title: values.title.length === 0 ? null : values.title,
      address: values.address.length === 0 ? null : values.address,
      latitude: parseOptionalNumber(values.latitude),
      longitude: parseOptionalNumber(values.longitude),
      viewportCenterLat: parseOptionalNumber(values.viewportCenterLat),
      viewportCenterLng: parseOptionalNumber(values.viewportCenterLng),
      viewportZoom: parseOptionalNumber(values.viewportZoom)
    });

    if (!result.ok) {
      setSavingLocation(false);
      setLocationError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    setSavingLocation(false);
    setLocationEditorOpen(false);
    return true;
  }

  async function attachProjectFile(): Promise<void> {
    if (project === null) {
      return;
    }

    setSavingFile(true);
    setFileError(null);
    setFileMessage(null);

    const result = await apiClient.files.chooseAndAttach({
      workspaceId: project.workspaceId,
      containerId: project.id,
      containerTabId: activeTabId
    });

    setSavingFile(false);

    if (!result.ok) {
      setFileError(result.error.message);
      return;
    }

    if (result.data === null) {
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
  }

  async function exportProjectMarkdown(): Promise<void> {
    if (project === null) {
      return;
    }

    setExportBusy(true);
    setExportMessage(null);
    setItemActionError(null);

    const result = await apiClient.export.exportProjectMarkdown({
      projectId: project.id
    });

    setExportBusy(false);

    if (!result.ok) {
      setItemActionError(result.error.message);
      return;
    }

    setExportMessage(
      `Project Markdown export created at ${result.data.relativePath}.`
    );
    await refreshProjectActivity(project.id);
  }

  async function printProjectPdf(): Promise<void> {
    if (project === null) {
      return;
    }

    setExportBusy(true);
    setExportMessage(null);
    setItemActionError(null);

    const result = await apiClient.print?.printPdf({
      containerId: project.id,
      title: project.name,
      workspaceId: project.workspaceId
    });

    setExportBusy(false);

    if (result === undefined) {
      setItemActionError("Print/PDF export is not available.");
      return;
    }

    if (!result.ok) {
      setItemActionError(result.error.message);
      return;
    }

    setExportMessage(`Project PDF created at ${result.data.relativePath}.`);
    await refreshProjectActivity(project.id);
  }

  async function printItemPdf(item: ProjectFeedViewModel): Promise<void> {
    if (project === null) {
      return;
    }

    setItemActionBusy(true);
    setItemActionError(null);

    const result = await apiClient.print?.printPdf({
      itemIds: [item.id],
      title: item.title,
      workspaceId: project.workspaceId
    });

    setItemActionBusy(false);

    if (result === undefined) {
      setItemActionError("Print/PDF export is not available.");
      return;
    }

    if (!result.ok) {
      setItemActionError(result.error.message);
      return;
    }

    setExportMessage(`Item PDF created at ${result.data.relativePath}.`);
    await refreshProjectActivity(project.id);
  }

  async function openProjectFile(item: FileCardViewModel): Promise<void> {
    if (project === null) {
      return;
    }

    setFileBusyId(item.id);
    setFileError(null);

    const result = await apiClient.files.openAttachment(item.attachment.id);

    setFileBusyId(null);

    if (!result.ok) {
      setFileError(result.error.message);
      await refreshProjectContent(project.id);
    }
  }

  async function revealProjectFile(item: FileCardViewModel): Promise<void> {
    if (project === null) {
      return;
    }

    setFileBusyId(item.id);
    setFileError(null);

    const result = await apiClient.files.revealAttachment(item.attachment.id);

    setFileBusyId(null);

    if (!result.ok) {
      setFileError(result.error.message);
      await refreshProjectContent(project.id);
    }
  }

  async function updateProjectFileMetadata(
    item: FileCardViewModel,
    values: FileMetadataEditorValues
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setFileBusyId(item.id);
    setFileError(null);

    const result = await apiClient.files.updateMetadata({
      attachmentId: item.attachment.id,
      title: values.title,
      description: values.description.length === 0 ? null : values.description
    });

    if (!result.ok) {
      setFileBusyId(null);
      setFileError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    setFileBusyId(null);
    return true;
  }

  async function createProjectFileSnapshot(
    item: FileCardViewModel,
    note: string
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setFileBusyId(item.id);
    setFileError(null);

    const result = await apiClient.files.createFileSnapshot({
      attachmentId: item.attachment.id,
      note: note.trim().length === 0 ? null : note
    });

    if (!result.ok) {
      setFileBusyId(null);
      setFileError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    setFileBusyId(null);
    return true;
  }

  async function openProjectFileVersion(
    item: FileCardViewModel,
    version: FileVersionViewModel
  ): Promise<void> {
    setFileBusyId(item.id);
    setFileError(null);

    const result = await apiClient.files.openFileVersion(version.id);

    setFileBusyId(null);

    if (!result.ok) {
      setFileError(result.error.message);
    }
  }

  async function restoreProjectFileVersion(
    item: FileCardViewModel,
    version: FileVersionViewModel
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setFileBusyId(item.id);
    setFileError(null);

    const result = await apiClient.files.restoreFileVersion({
      versionId: version.id
    });

    if (!result.ok) {
      setFileBusyId(null);
      setFileError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    setFileBusyId(null);
  }

  async function openProjectLink(item: LinkCardViewModel): Promise<void> {
    setLinkBusyId(item.id);
    setLinkError(null);

    const result = await apiClient.links.openExternal(item.id);

    setLinkBusyId(null);

    if (!result.ok) {
      setLinkError(result.error.message);
    }
  }


  async function openProjectLocation(item: LocationCardViewModel): Promise<void> {
    setLocationBusyId(item.id);
    setLocationError(null);

    const result = await apiClient.locations.openExternal(item.id);

    setLocationBusyId(null);

    if (!result.ok) {
      setLocationError(result.error.message);
    }
  }

  async function openProjectInlineExternalLink(url: string): Promise<void> {
    setLinkError(null);

    const result = await apiClient.links.openUrlExternal(url);

    if (!result.ok) {
      setLinkError(result.error.message);
    }
  }

  async function copyProjectInlineExternalLink(url: string): Promise<void> {
    try {
      await globalThis.navigator.clipboard.writeText(url);
      setLinkError(null);
    } catch {
      setLinkError("Unable to copy link to clipboard.");
    }
  }

  async function saveContainerPreferences(
    draft: ContainerPreferencesDraft
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setPreferencesSaving(true);
    setPreferencesError(null);

    const result = await apiClient.containers.updatePreferences({
      containerId: project.id,
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

  function openProjectDefaultQuickAdd(): void {
    if (project === null) {
      return;
    }

    switch (containerPreferences?.defaultQuickAddType) {
      case "note":
        setNoteEditorOpen(true);
        setNoteError(null);
        setNoteErrorItemId(null);
        return;
      case "link":
        setLinkEditorOpen(true);
        setLinkError(null);
        return;
      case "file":
        void attachProjectFile();
        return;
      default:
        openQuickStartFromContainer({
          containerId: project.id,
          containerType: "project",
          containerTabId: activeTabId
        });
    }
  }

  async function createProjectLinkFromInlineUrl(url: string): Promise<void> {
    if (project === null) {
      return;
    }

    setSavingLink(true);
    setLinkError(null);

    const result = await apiClient.links.create({
      workspaceId: project.workspaceId,
      containerId: project.id,
      containerTabId: activeTabId,
      url,
      title: url
    });

    if (!result.ok) {
      setSavingLink(false);
      setLinkError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    setSavingLink(false);
  }

  async function updateProjectLink(
    item: LinkCardViewModel,
    values: LinkEditorValues
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setLinkBusyId(item.id);
    setLinkError(null);

    const result = await apiClient.links.update({
      itemId: item.id,
      url: values.url,
      title: values.title.length === 0 ? null : values.title,
      description: values.description.length === 0 ? null : values.description
    });

    if (!result.ok) {
      setLinkBusyId(null);
      setLinkError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    setLinkBusyId(null);
    return true;
  }

  async function updateProjectLinkWidgetSettings(
    item: LinkCardViewModel,
    settings: LinkWidgetSettingsPatch
  ): Promise<void> {
    setLinkBusyId(item.id);
    setLinkError(null);

    const result = await apiClient.links.update({
      itemId: item.id,
      ...settings
    });

    setLinkBusyId(null);

    if (!result.ok) {
      setLinkError(result.error.message);
      return;
    }

    await refreshProjectContent(result.data.containerId);
    await refreshProjectActivity(result.data.containerId);
  }

  async function fetchProjectLinkMetadata(
    item: LinkCardViewModel
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setLinkBusyId(item.id);
    setLinkError(null);

    if (apiClient.links.fetchMetadata === undefined) {
      setLinkBusyId(null);
      setLinkError("Link metadata fetch API is not available.");
      return;
    }

    const result = await apiClient.links.fetchMetadata({
      workspaceId: project.workspaceId,
      itemId: item.id
    });

    if (!result.ok) {
      setLinkBusyId(null);
      setLinkError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    setLinkBusyId(null);
  }


  async function updateProjectLocation(
    item: LocationCardViewModel,
    values: LocationEditorValues
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setLocationBusyId(item.id);
    setLocationError(null);

    const result = await apiClient.locations.update({
      itemId: item.id,
      title: values.title.length === 0 ? null : values.title,
      address: values.address.length === 0 ? null : values.address,
      latitude: parseOptionalNumber(values.latitude),
      longitude: parseOptionalNumber(values.longitude),
      viewportCenterLat: parseOptionalNumber(values.viewportCenterLat),
      viewportCenterLng: parseOptionalNumber(values.viewportCenterLng),
      viewportZoom: parseOptionalNumber(values.viewportZoom)
    });

    if (!result.ok) {
      setLocationBusyId(null);
      setLocationError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    setLocationBusyId(null);
    return true;
  }

  async function updateProjectNote(
    item: NoteCardViewModel,
    values: NoteEditorValues,
    meta: NoteEditorSaveMeta
  ): Promise<NoteEditorSaveResult | boolean> {
    if (project === null) {
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

    await refreshProjectContent(project.id);
    setNoteBusyId(null);
    setNoteErrorItemId(null);
    return {
      savedValues: values,
      savedVersion: result.data.noteUpdatedAt,
      status: "saved"
    };
  }

  async function autosaveProjectNote(
    item: NoteCardViewModel,
    values: NoteEditorValues,
    meta: NoteEditorSaveMeta
  ): Promise<NoteEditorSaveResult | boolean> {
    if (project === null) {
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

    await refreshProjectContent(project.id);
    setNoteError(null);
    setNoteErrorItemId(null);
    return {
      savedValues: values,
      savedVersion: result.data.noteUpdatedAt,
      status: "saved"
    };
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
    await refreshProjectHealth(project.id);
    setTaskBusyId(null);
  }

  async function updateTaskDateRange(
    item: TaskCardViewModel,
    range: ParsedDateRange
  ): Promise<void> {
    if (project === null) {
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

    await refreshProjectContent(project.id);
    await refreshProjectHealth(project.id);
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
    if (project === null) {
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

    await refreshProjectContent(project.id);
    await refreshProjectHealth(project.id);
    setTaskBusyId(null);
  }

  async function snoozeTask(
    item: TaskCardViewModel,
    preset: SnoozePreset
  ): Promise<void> {
    if (project === null) {
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

    await refreshProjectContent(project.id);
    await refreshProjectHealth(project.id);
    setTaskBusyId(null);
  }

  async function rescheduleTask(
    item: TaskCardViewModel,
    dueAt: string | null
  ): Promise<void> {
    if (project === null) {
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

    await refreshProjectContent(project.id);
    await refreshProjectHealth(project.id);
    setTaskBusyId(null);
  }

  async function updateListItemDateRange(
    item: ListCardViewModel,
    listItem: ListCardItemViewModel,
    range: ParsedDateRange
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setListBusyId(item.id);
    setListError(null);

    const result = await apiClient.lists.updateItem({
      listItemId: listItem.id,
      startAt: range.startAt,
      dueAt: range.dueAt
    });

    if (!result.ok) {
      setListBusyId(null);
      setListError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectHealth(project.id);
    setListBusyId(null);
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

  async function toggleListDisplayMode(
    item: ListCardViewModel,
    displayMode: "checklist" | "pipeline"
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setListBusyId(item.id);
    setListError(null);

    const result =
      displayMode === "pipeline"
        ? await apiClient.lists.enablePipelineMode(item.id)
        : await apiClient.lists.disablePipelineMode(item.id);

    if (!result.ok) {
      setListBusyId(null);
      setListError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    setListBusyId(null);
  }

  async function addPipelineCard(
    item: ListCardViewModel,
    stage: ListCardItemViewModel,
    title: string
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setListBusyId(item.id);
    setListError(null);

    const result = await apiClient.lists.addItem({
      listId: item.id,
      title,
      depth: (stage.depth ?? 0) + 1,
      listItemParentId: stage.id
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

  async function movePipelineCard(
    item: ListCardViewModel,
    card: ListCardItemViewModel,
    stage: ListCardItemViewModel
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setListBusyId(item.id);
    setListError(null);

    const targetCards = item.listItems.filter(
      (candidate) => candidate.listItemParentId === stage.id && candidate.id !== card.id
    );
    const maxSortOrder = targetCards.reduce(
      (max, candidate) => Math.max(max, candidate.sortOrder ?? 0),
      0
    );
    const result = await apiClient.lists.movePipelineCard({
      listId: item.id,
      cardId: card.id,
      targetStageId: stage.id,
      sortOrder: maxSortOrder + 1024
    });

    if (!result.ok) {
      setListBusyId(null);
      setListError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    setListBusyId(null);
  }

  async function saveListAsTemplate(item: ListCardViewModel): Promise<void> {
    if (project === null) {
      return;
    }

    setListBusyId(item.id);
    setListError(null);

    const result = await apiClient.lists.saveAsTemplate({
      listId: item.id,
      name: `${item.title} template`
    });

    if (!result.ok) {
      setListBusyId(null);
      setListError(result.error.message);
      return;
    }

    setListBusyId(null);
  }

  function handleItemAction(action: ItemActionId, itemId: string): void {
    const item = items.find((candidate) => candidate.id === itemId);

    if (item === undefined) {
      return;
    }

    setItemActionError(null);

    if (action === "open") {
      if (isFileCardViewModel(item)) {
        void openProjectFile(item);
        return;
      }

      if (isLinkCardViewModel(item)) {
        void openProjectLink(item);
        return;
      }

      if (projectId !== undefined) {
        navigate(
          `/projects/${encodeURIComponent(projectId)}?item=${encodeURIComponent(item.id)}`
        );
      }
      return;
    }

    if (action === "reveal") {
      if (isFileCardViewModel(item)) {
        void revealProjectFile(item);
        return;
      }

      setItemActionError("Reveal in folder is only available for local file items.");
      return;
    }

    if (action === "copyLink") {
      void copyLocalItemLink(item);
      return;
    }

    if (action === "print") {
      void printItemPdf(item);
      return;
    }

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
      if (projectId !== undefined) {
        navigate(
          `/projects/${encodeURIComponent(projectId)}?item=${encodeURIComponent(item.id)}`
        );
      }
      return;
    }

    setItemActionError("That context menu action is not available in this view yet.");
  }

  async function copyLocalItemLink(item: ProjectFeedViewModel): Promise<void> {
    if (projectId === undefined) {
      return;
    }

    const path = `/projects/${encodeURIComponent(projectId)}?item=${encodeURIComponent(item.id)}`;

    try {
      await navigator.clipboard.writeText(path);
    } catch {
      setItemActionError("Could not copy the local item link.");
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

  async function reorderProjectItem(
    draggedItemId: string,
    targetItemId: string
  ): Promise<void> {
    if (project === null) {
      return;
    }

    const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
    const scopedItems = items.filter((item) =>
      isItemVisibleForTab(item, activeTab)
    );

    if (
      !scopedItems.some((item) => item.id === draggedItemId) ||
      !scopedItems.some((item) => item.id === targetItemId)
    ) {
      return;
    }

    setItemsLoading(true);
    setItemError(null);

    if (apiClient.dragDrop === undefined) {
      setItemsLoading(false);
      setItemError("Drag/drop is not available in this runtime.");
      return;
    }

    const result = await apiClient.dragDrop.reorderItems({
      containerId: project.id,
      containerTabId: activeTabId,
      itemIds: moveIdBeforeTarget(
        scopedItems.map((item) => item.id),
        draggedItemId,
        targetItemId
      )
    });

    setItemsLoading(false);

    if (!result.ok) {
      setItemError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
  }

  async function reorderProjectListItem(
    list: ListCardViewModel,
    draggedItemId: string,
    targetItemId: string
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setListBusyId(list.id);
    setListError(null);

    if (apiClient.dragDrop === undefined) {
      setListBusyId(null);
      setListError("Drag/drop is not available in this runtime.");
      return;
    }

    const result = await apiClient.dragDrop.reorderListItems({
      listId: list.id,
      listItemIds: moveIdBeforeTarget(
        list.listItems.map((item) => item.id),
        draggedItemId,
        targetItemId
      )
    });

    setListBusyId(null);

    if (!result.ok) {
      setListError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
  }

  async function indentProjectListItem(
    list: ListCardViewModel,
    listItem: ListCardItemViewModel
  ): Promise<void> {
    await applyProjectListKeyboardMutation(list, () =>
      apiClient.lists.indentItem(listItem.id)
    );
  }

  async function outdentProjectListItem(
    list: ListCardViewModel,
    listItem: ListCardItemViewModel
  ): Promise<void> {
    await applyProjectListKeyboardMutation(list, () =>
      apiClient.lists.outdentItem(listItem.id)
    );
  }

  async function moveProjectListItem(
    list: ListCardViewModel,
    listItem: ListCardItemViewModel,
    direction: "up" | "down"
  ): Promise<void> {
    await applyProjectListKeyboardMutation(list, () =>
      apiClient.lists.moveItem({ listItemId: listItem.id, direction })
    );
  }

  async function moveProjectListItemToList(
    list: ListCardViewModel,
    listItemId: string,
    targetListId: string,
    beforeListItemId?: string
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setListBusyId(list.id);
    setListError(null);

    const result = await apiClient.lists.moveItemToList({
      listItemId,
      targetListId,
      ...(beforeListItemId === undefined ? {} : { beforeListItemId })
    });

    setListBusyId(null);

    if (!result.ok) {
      setListError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    return true;
  }

  async function bulkUpdateProjectListItems(
    list: ListCardViewModel,
    listItems: readonly ListCardItemViewModel[],
    action: ChecklistBulkAction
  ): Promise<boolean> {
    if (project === null) {
      return false;
    }

    setListBusyId(list.id);
    setListError(null);

    const result = await apiClient.lists.bulkUpdateItems({
      listId: list.id,
      listItemIds: listItems.map((listItem) => listItem.id),
      operation: action
    });

    setListBusyId(null);

    if (!result.ok) {
      setListError(result.error.message);
      return false;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    return true;
  }

  async function applyProjectListKeyboardMutation(
    list: ListCardViewModel,
    operation: () => ReturnType<typeof apiClient.lists.indentItem>
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setListBusyId(list.id);
    setListError(null);

    const result = await operation();

    setListBusyId(null);

    if (!result.ok) {
      setListError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
  }

  async function attachDroppedProjectFiles(
    event: React.DragEvent<HTMLElement>
  ): Promise<void> {
    if (project === null || !Array.from(event.dataTransfer.types).includes("Files")) {
      return;
    }

    event.preventDefault();
    setSavingFile(true);
    setFileError(null);
    setFileMessage(null);

    if (apiClient.dragDrop === undefined) {
      setSavingFile(false);
      setFileError("Drag/drop is not available in this runtime.");
      return;
    }

    const sourcePaths = apiClient.dragDrop.getDroppedFilePaths(
      Array.from(event.dataTransfer.files)
    );

    if (sourcePaths.length === 0) {
      setSavingFile(false);
      setFileError("Dropped files could not be read by the local file bridge.");
      return;
    }

    const { emailSourcePaths, attachmentSourcePaths } =
      splitEmailDropSourcePaths(sourcePaths);
    const errors: string[] = [];
    let importedEmailCount = 0;
    let skippedEmailCount = 0;
    let emailIssueCount = 0;

    if (emailSourcePaths.length > 0) {
      const importEmailsAsTasks = apiClient.import.importEmailsAsTasks;

      if (importEmailsAsTasks === undefined) {
        errors.push("Email import is not available in this runtime.");
      } else {
        const summary = await importEmailDropSources(
          emailSourcePaths,
          async (sourcePath) =>
            importEmailsAsTasks({
              sourcePath,
              workspaceId: project.workspaceId,
              containerId: project.id,
              extractTags: true
            })
        );

        importedEmailCount = summary.importedCount;
        skippedEmailCount = summary.skippedCount;
        emailIssueCount = summary.issueCount;
        errors.push(...summary.errors);
      }
    }

    if (attachmentSourcePaths.length > 0) {
      const result = await apiClient.dragDrop.attachFilesToContainer({
        containerId: project.id,
        containerTabId: activeTabId,
        sourcePaths: attachmentSourcePaths
      });

      if (!result.ok) {
        errors.push(result.error.message);
      }
    }

    setSavingFile(false);

    if (errors.length > 0) {
      setFileError(errors.join(" "));
      return;
    }

    if (importedEmailCount > 0 || skippedEmailCount > 0 || emailIssueCount > 0) {
      setFileMessage(
        formatEmailDropImportMessage({
          importedCount: importedEmailCount,
          skippedCount: skippedEmailCount,
          issueCount: emailIssueCount
        })
      );
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
  }

  async function attachDroppedFilesToItem(
    itemId: string,
    files: readonly File[]
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setFileBusyId(itemId);
    setFileError(null);

    if (apiClient.dragDrop === undefined) {
      setFileBusyId(null);
      setFileError("Drag/drop is not available in this runtime.");
      return;
    }

    const sourcePaths = apiClient.dragDrop.getDroppedFilePaths(files);

    if (sourcePaths.length === 0) {
      setFileBusyId(null);
      setFileError("Dropped files could not be read by the local file bridge.");
      return;
    }

    const result = await apiClient.dragDrop.attachFilesToItem({
      itemId,
      sourcePaths
    });

    setFileBusyId(null);

    if (!result.ok) {
      setFileError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
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
      item: toInspectorItem(
        result.data.item,
        categories,
        items.find((item) => item.id === itemId)
      ),
      activity: result.data.activity.map(toInspectorActivity)
    });
  }

  async function refreshOpenInspector(targetId: string): Promise<void> {
    if (inspector?.item.id !== targetId) {
      return;
    }

    await openInspector(targetId);
  }

  async function changeInspectorCategory(
    target: InspectorTarget,
    categoryId: string | null
  ): Promise<void> {
    if (target.type === "container") {
      await assignProjectCategory(categoryId);
      return;
    }

    if (target.type !== "item") {
      setItemActionError("Category editing is not available for this target yet.");
      return;
    }

    await assignItemCategory(target.id, categoryId);
    await refreshOpenInspector(target.id);
  }

  async function addInspectorTag(
    target: InspectorTarget,
    name: string
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setItemActionError(null);
    const result = await apiClient.metadata.addTagToTarget({
      workspaceId: project.workspaceId,
      targetType: target.type,
      targetId: target.id,
      name
    });

    if (!result.ok) {
      setItemActionError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    await refreshOpenInspector(target.id);
  }

  async function removeInspectorTag(
    target: InspectorTarget,
    tag: TagBadgeViewModel
  ): Promise<void> {
    if (project === null) {
      return;
    }

    setItemActionError(null);
    const result = await apiClient.metadata.removeTagFromTarget({
      workspaceId: project.workspaceId,
      targetType: target.type,
      targetId: target.id,
      ...(tag.id === undefined || tag.id === null
        ? { name: tag.name ?? tag.slug }
        : { tagId: tag.id })
    });

    if (!result.ok) {
      setItemActionError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectActivity(project.id);
    await refreshOpenInspector(target.id);
  }

  async function changeInspectorDate(
    target: InspectorTarget,
    field: "startAt" | "dueAt",
    value: string
  ): Promise<void> {
    if (project === null || target.type !== "item") {
      return;
    }

    const item = items.find((candidate) => candidate.id === target.id);

    if (item === undefined || !isTaskCardViewModel(item)) {
      setItemActionError("Date editing is available for task items.");
      return;
    }

    setTaskBusyId(target.id);
    setTaskError(null);

    const result = await apiClient.tasks.update({
      itemId: target.id,
      [field]: value.length === 0 ? null : value
    });

    if (!result.ok) {
      setTaskBusyId(null);
      setTaskError(result.error.message);
      setItemActionError(result.error.message);
      return;
    }

    await refreshProjectContent(project.id);
    await refreshProjectHealth(project.id);
    await refreshOpenInspector(target.id);
    setTaskBusyId(null);
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
    await refreshProjectActivity(project.id);
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
            onBulkActionListItems={bulkUpdateProjectListItems}
            onAddPipelineCard={addPipelineCard}
            onIndentListItem={indentProjectListItem}
            onListItemDateRangeChange={updateListItemDateRange}
            onMoveListItem={moveProjectListItem}
            onMoveListItemToList={moveProjectListItemToList}
            onMovePipelineCard={movePipelineCard}
            onOutdentListItem={outdentProjectListItem}
            onReorderListItem={reorderProjectListItem}
            moveToListTargets={items
              .filter(isListCardViewModel)
              .map((listItem) => ({ id: listItem.id, title: listItem.title }))}
            onSaveAsTemplate={saveListAsTemplate}
            onToggleDisplayMode={toggleListDisplayMode}
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
            onDateRangeChange={updateTaskDateRange}
            onPriorityChange={updateTaskPriority}
            onRescheduleTask={rescheduleTask}
            onSnoozeTask={snoozeTask}
            onStatusChange={updateTaskStatus}
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
            wikilinkSuggestions={createProjectWikilinkSuggestions(projects, contacts, items)}
            onExternalLinkCopy={copyProjectInlineExternalLink}
            onExternalLinkCreate={createProjectLinkFromInlineUrl}
            onExternalLinkOpen={openProjectInlineExternalLink}
            onAutosave={autosaveProjectNote}
            onSave={updateProjectNote}
            onWikilinkOpen={openWikilinkTarget}
          />
        </>
      );
    }

    if (isFileCardViewModel(item)) {
      return (
        <>
          {categoryPicker}
          <FileCardContent
            disabled={fileBusyId === item.id}
            error={fileBusyId === item.id ? fileError : null}
            item={item}
            onOpen={openProjectFile}
            onReveal={revealProjectFile}
            onSave={updateProjectFileMetadata}
            onCreateSnapshot={createProjectFileSnapshot}
            onOpenVersion={openProjectFileVersion}
            onRestoreVersion={restoreProjectFileVersion}
          />
        </>
      );
    }

    if (isLinkCardViewModel(item)) {
      return (
        <>
          {categoryPicker}
          <LinkCardContent
            disabled={linkBusyId === item.id}
            error={linkBusyId === item.id ? linkError : null}
            item={item}
            webWidgetsEnabled={webWidgetsEnabled}
            onFetchMetadata={fetchProjectLinkMetadata}
            onOpen={openProjectLink}
            onSave={updateProjectLink}
            onUpdateWidgetSettings={updateProjectLinkWidgetSettings}
          />
        </>
      );
    }


    if (isLocationCardViewModel(item)) {
      return (
        <>
          {categoryPicker}
          <LocationCardContent
            disabled={locationBusyId === item.id}
            error={locationBusyId === item.id ? locationError : null}
            item={item}
            onOpen={openProjectLocation}
            onSave={updateProjectLocation}
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

  async function setProjectBanner(): Promise<void> {
    if (project === null || apiClient.containerMedia === undefined) {
      return;
    }

    setProjectMediaBusy(true);
    setProjectMediaError(null);
    const result = await apiClient.containerMedia.chooseAndSet({
      containerId: project.id,
      role: "project_banner",
      altText: `${project.name} banner`
    });
    setProjectMediaBusy(false);

    if (!result.ok) {
      setProjectMediaError(result.error.message);
      return;
    }

    if (result.data !== null) {
      setProjectMedia(result.data);
      await refreshProjectActivity(project.id);
    }
  }

  async function removeProjectBanner(): Promise<void> {
    if (project === null || apiClient.containerMedia === undefined) {
      return;
    }

    setProjectMediaBusy(true);
    setProjectMediaError(null);
    const result = await apiClient.containerMedia.remove({
      containerId: project.id,
      role: "project_banner"
    });
    setProjectMediaBusy(false);

    if (!result.ok) {
      setProjectMediaError(result.error.message);
      return;
    }

    setProjectMedia(null);
    await refreshProjectActivity(project.id);
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
  const relatedContactIds = new Set(
    relatedContacts.map((summary) => summary.contact.id)
  );
  const availableContacts = contacts
    .filter((contact) => !relatedContactIds.has(contact.id))
    .map((contact) => ({
      id: contact.id,
      name: contact.name
    }));
  const relatedContactViewModels = relatedContacts.map(
    toRelatedContactViewModel
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
      onOpenItem={(itemId, tabId) => {
        setActiveTabId(tabId);
        setVisibleItemCount(PROJECT_FEED_PAGE_SIZE);
        void openInspector(itemId);
      }}
      onSelectTab={(tabId) => {
        setActiveTabId(tabId);
        setVisibleItemCount(PROJECT_FEED_PAGE_SIZE);
      }}
    />
  );
  const showSummaryFirst =
    containerPreferences?.summaryFirst === true ||
    containerPreferences?.defaultView === "summary";
  const relationshipGraphTargets = createRelationshipTargetOptions({
    currentContainerId: project.id,
    contacts,
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
      <Link className="text-link page-action-link" to="/projects">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to projects
      </Link>

      <header className="project-detail-header">
        <ContainerMediaPreview
          busy={projectMediaBusy}
          error={projectMediaError}
          media={projectMedia}
          title={project.name}
          variant="banner"
          onRemove={() => void removeProjectBanner()}
          onSet={() => void setProjectBanner()}
        />
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
        <div className="button-row">
          <button
            className="secondary-button compact-button"
            disabled={exportBusy}
            type="button"
            onClick={() => void printProjectPdf()}
          >
            <Printer size={16} aria-hidden="true" />
            Print / PDF
          </button>
          <button
            className="secondary-button compact-button"
            disabled={exportBusy}
            type="button"
            onClick={() => void exportProjectMarkdown()}
          >
            <Download size={16} aria-hidden="true" />
            Export Markdown
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

      {exportMessage === null ? null : (
        <p className="form-message">{exportMessage}</p>
      )}

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

      <RelatedContactsPanel
        availableContacts={availableContacts}
        busy={relationshipBusy}
        error={relationshipError}
        relatedContacts={relatedContactViewModels}
        selectedContactId={selectedContactId}
        onLinkContact={() => void linkSelectedContact()}
        onSelectedContactChange={setSelectedContactId}
        onUnlinkContact={(relationshipId) => void unlinkRelatedContact(relationshipId)}
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

      <RecentActivityList
        activity={projectActivity}
        emptyMessage="No project activity recorded yet."
      />

      <ContainerTabsPanel
        activeTabId={activeTabId}
        busy={tabBusy}
        error={tabError}
        managedTabs={managedTabs}
        tabs={tabs}
        templates={tabTemplates}
        onArchiveTab={(tabId) => void mutateProjectTab(tabId, "archive")}
        onCreateTab={createProjectTab}
        onCreateTabFromTemplate={(templateId) => void createProjectTabFromTemplate(templateId)}
        onDeleteTab={(tabId) => void deleteProjectTab(tabId)}
        onDuplicateTab={(tabId) => void mutateProjectTab(tabId, "duplicate")}
        onHideTab={(tabId) => void mutateProjectTab(tabId, "hide")}
        onRenameTab={renameProjectTab}
        onReorderTabs={(tabIds) => void reorderProjectTabs(tabIds)}
        onSelectTab={(tabId) => {
          setActiveTabId(tabId);
          setVisibleItemCount(PROJECT_FEED_PAGE_SIZE);
        }}
        onShowTab={(tabId) => void mutateProjectTab(tabId, "show")}
      />

      {showSummaryFirst ? null : tabSummaryCards}

      {projectHealth === null ? null : (
        <ProjectHealthCard health={projectHealth} />
      )}

      <div className="category-inline-picker">
        <CategoryPicker
          categories={categories}
          label="Project category"
          value={project.categoryId}
          onChange={(categoryId) => void assignProjectCategory(categoryId)}
        />
      </div>

      <section
        className="project-content-section"
        aria-label="Project content"
        onDragOver={(event) => {
          if (Array.from(event.dataTransfer.types).includes("Files")) {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          void attachDroppedProjectFiles(event);
        }}
      >
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <FolderKanban size={17} aria-hidden="true" />
            <h3>Content feed</h3>
          </div>
          <ViewModeSwitcher
            disabled={viewModeSaving}
            value={viewMode}
            onChange={(mode) => void changeProjectViewMode(mode)}
          />
          <button
            className="secondary-button compact-button"
            disabled={itemsLoading}
            type="button"
            onClick={() => void refreshProjectContent(project.id)}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
          <button
            className="primary-button compact-button"
            disabled={itemsLoading}
            type="button"
            onClick={openProjectDefaultQuickAdd}
          >
            Quick Start ({formatQuickAddType(containerPreferences?.defaultQuickAddType)})
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
            draftKey={`local-work-os:note-draft:${project.workspaceId}:${project.id}:${activeTabId ?? "feed"}:new`}
            error={noteErrorItemId === null ? noteError : null}
            resetOnSubmit
            submitLabel="Add note"
            onCancel={() => {
              setNoteEditorOpen(false);
              setNoteError(null);
              setNoteErrorItemId(null);
            }}
            wikilinkSuggestions={createProjectWikilinkSuggestions(projects, contacts, items)}
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

        {linkEditorOpen ? (
          <LinkEditor
            disabled={savingLink || itemsLoading}
            error={linkError}
            resetOnSubmit
            submitLabel="Add link"
            onCancel={() => {
              setLinkEditorOpen(false);
              setLinkError(null);
            }}
            onSubmit={createProjectLink}
          />
        ) : (
          <button
            className="secondary-button note-create-button"
            disabled={itemsLoading}
            type="button"
            onClick={() => {
              setLinkEditorOpen(true);
              setLinkError(null);
            }}
          >
            <Link2 size={17} aria-hidden="true" />
            New link
          </button>
        )}

        {locationEditorOpen ? (
          <LocationEditor
            disabled={savingLocation || itemsLoading}
            error={locationError}
            resetOnSubmit
            submitLabel="Add location"
            onCancel={() => {
              setLocationEditorOpen(false);
              setLocationError(null);
            }}
            onSubmit={createProjectLocation}
          />
        ) : (
          <button
            className="secondary-button note-create-button"
            disabled={itemsLoading}
            type="button"
            onClick={() => {
              setLocationEditorOpen(true);
              setLocationError(null);
            }}
          >
            <MapPin size={17} aria-hidden="true" />
            New location
          </button>
        )}

        <button
          className="secondary-button note-create-button"
          disabled={savingFile || itemsLoading}
          type="button"
          onClick={() => void attachProjectFile()}
        >
          <Paperclip size={17} aria-hidden="true" />
          Attach file
        </button>

        {fileError === null || fileBusyId !== null ? null : (
          <p className="form-message form-message-error">{fileError}</p>
        )}
        {fileMessage === null || fileError !== null || fileBusyId !== null ? null : (
          <p className="form-message form-message-ok">{fileMessage}</p>
        )}
        {linkError === null || linkBusyId !== null || linkEditorOpen ? null : (
          <p className="form-message form-message-error">{linkError}</p>
        )}
        {locationError === null || locationBusyId !== null || locationEditorOpen ? null : (
          <p className="form-message form-message-error">{locationError}</p>
        )}

        {viewMode === "list" ? (
          <ItemFeed
            ariaLabel="Project content items"
            emptyDescription="Tasks, checklists, notes, and files created for this project will appear here with inline controls."
            emptyTitle={
              activeTab === null
                ? "No project content yet"
                : `No content in ${activeTab.name} yet`
            }
            error={itemError}
            getDisabledActions={getDisabledActionsForProjectItem}
            items={visibleItems}
            loading={itemsLoading}
            renderContent={renderItemContent}
            onAction={handleItemAction}
            onDropFilesOnItem={attachDroppedFilesToItem}
            onReorderItem={reorderProjectItem}
          />
        ) : (
          <DatedItemProjection
            items={tabItems}
            mode={viewMode}
            title={viewMode === "timeline" ? "Project timeline" : "Project calendar"}
          />
        )}
        {hasMoreItems ? (
          <button
            className="secondary-button load-more-button"
            disabled={itemsLoading}
            type="button"
            onClick={() =>
              setVisibleItemCount((current) =>
                Math.min(current + PROJECT_FEED_PAGE_SIZE, items.length)
              )
            }
          >
            Load more
          </button>
        ) : null}
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
          categories={categories.map(toInspectorCategoryOption)}
          error={itemActionError}
          item={inspector.item}
          open
          onAddTag={addInspectorTag}
          onCategoryChange={changeInspectorCategory}
          onClose={() => {
            setInspector(null);
            if (projectId !== undefined) {
              navigate(`/projects/${encodeURIComponent(projectId)}`, {
                replace: true
              });
            }
          }}
          onDateChange={changeInspectorDate}
          onRemoveTag={removeInspectorTag}
        />
      )}
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
    containerTabId: list.containerTabId,
    categoryLabel: findCategoryName(list.categoryId, categories),
    sortOrder: list.sortOrder,
    createdAt: list.createdAt,
    updatedLabel: list.updatedAt,
    pinned: list.pinned,
    displayMode: list.displayMode,
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

function toProjectFileViewModel(
  file: FileItemSummary & { versions?: AttachmentVersionSummary[] },
  categories: readonly CategorySummary[]
): ProjectFileViewModel {
  return {
    id: file.id,
    type: "file",
    title: file.title,
    body: file.body,
    status: file.status,
    categoryId: file.categoryId,
    containerTabId: file.containerTabId,
    categoryLabel: findCategoryName(file.categoryId, categories),
    sortOrder: file.sortOrder,
    createdAt: file.createdAt,
    updatedLabel: file.updatedAt,
    pinned: file.pinned,
    tags: file.tags ?? [],
    attachment: {
      id: file.attachment.id,
      originalName: file.attachment.originalName,
      storedName: file.attachment.storedName,
      mimeType: file.attachment.mimeType,
      sizeBytes: file.attachment.sizeBytes,
      checksum: file.attachment.checksum,
      storagePath: file.attachment.storagePath,
      description: file.attachment.description
    },
    missing: file.missing,
    ...(file.preview === undefined ? {} : { preview: file.preview }),
    versions: (file.versions ?? []).map(toFileVersionViewModel)
  };
}

function toFileVersionViewModel(
  version: AttachmentVersionSummary
): FileVersionViewModel {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    originalName: version.originalName,
    sizeBytes: version.sizeBytes,
    checksum: version.checksum,
    storagePath: version.storagePath,
    note: version.note,
    createdAt: version.createdAt
  };
}

function toProjectLinkViewModel(
  link: LinkSummary,
  categories: readonly CategorySummary[]
): ProjectLinkViewModel {
  return {
    id: link.id,
    type: "link",
    title: link.title,
    body: link.body,
    status: link.status,
    categoryId: link.categoryId,
    containerTabId: link.containerTabId,
    categoryLabel: findCategoryName(link.categoryId, categories),
    sortOrder: link.sortOrder,
    createdAt: link.createdAt,
    updatedLabel: link.updatedAt,
    pinned: link.pinned,
    tags: link.tags ?? [],
    url: link.url,
    normalizedUrl: link.normalizedUrl,
    linkTitle: link.linkTitle,
    description: link.description,
    domain: link.domain,
    faviconPath: link.faviconPath,
    previewImagePath: link.previewImagePath,
    renderAsWidget: link.renderAsWidget,
    widgetHeight: link.widgetHeight,
    widgetWarningAcceptedAt: link.widgetWarningAcceptedAt,
    metadata:
      link.domain === null ? [] : [{ label: "Domain", value: link.domain }]
  };
}


function toProjectLocationViewModel(
  location: LocationSummary,
  categories: readonly CategorySummary[]
): ProjectLocationViewModel {
  const coordinates =
    location.latitude === null || location.longitude === null
      ? null
      : `${location.latitude}, ${location.longitude}`;

  return {
    id: location.id,
    type: "location",
    title: location.title,
    body: location.body,
    status: location.status,
    categoryId: location.categoryId,
    containerTabId: location.containerTabId,
    categoryLabel: findCategoryName(location.categoryId, categories),
    sortOrder: location.sortOrder,
    createdAt: location.createdAt,
    updatedLabel: location.updatedAt,
    pinned: location.pinned,
    tags: location.tags ?? [],
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    viewportCenterLat: location.viewportCenterLat,
    viewportCenterLng: location.viewportCenterLng,
    viewportZoom: location.viewportZoom,
    metadata: [
      ...(coordinates === null ? [] : [{ label: "Coordinates", value: coordinates }]),
      { label: "Zoom", value: location.viewportZoom.toString() }
    ]
  };
}

function toListCardItemViewModel(
  listItem: ListItemSummary
): ListCardItemViewModel {
  return {
    id: listItem.id,
    title: listItem.title,
    body: listItem.body,
    listItemParentId: listItem.listItemParentId,
    status: listItem.status,
    depth: listItem.depth,
    sortOrder: listItem.sortOrder,
    startAt: listItem.startAt,
    dueAt: listItem.dueAt
  };
}

function mergeProjectContent(
  tasks: readonly TaskSummary[],
  lists: readonly ListSummary[],
  notes: readonly NoteSummary[],
  links: readonly LinkSummary[],
  locations: readonly LocationSummary[],
  files: ReadonlyArray<FileItemSummary & { versions?: AttachmentVersionSummary[] }>,
  categories: readonly CategorySummary[] = []
): ProjectFeedViewModel[] {
  return [
    ...tasks.map((task) => toProjectTaskViewModel(task, categories)),
    ...lists.map((list) => toProjectListViewModel(list, categories)),
    ...notes.map((note) => toProjectNoteViewModel(note, categories)),
    ...links.map((link) => toProjectLinkViewModel(link, categories)),
    ...locations.map((location) => toProjectLocationViewModel(location, categories)),
    ...files.map((file) => toProjectFileViewModel(file, categories))
  ].sort(compareFeedItems);
}


function createProjectWikilinkSuggestions(
  projects: readonly ProjectSummary[],
  contacts: readonly ContactSummary[],
  items: readonly ProjectFeedViewModel[]
): NoteWikilinkSuggestion[] {
  return [
    ...projects.map((project) => ({
      id: project.id,
      title: project.name,
      kind: "project" as const
    })),
    ...contacts.map((contact) => ({
      id: contact.id,
      title: contact.name,
      kind: "contact" as const
    })),
    ...items.map((item) => ({
      id: item.id,
      title: item.title,
      kind: "item" as const
    }))
  ];
}

function toMoveTarget(project: ProjectSummary): MoveTargetContainer {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color
  };
}

function toInspectorItem(
  item: ItemSummary,
  categories: readonly CategorySummary[],
  sourceItem?: ProjectFeedViewModel
): ItemInspectorItem {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    categoryId: sourceItem !== undefined && "categoryId" in sourceItem
      ? sourceItem.categoryId
      : item.categoryId,
    categoryLabel: sourceItem?.categoryLabel ?? findCategoryName(item.categoryId, categories),
    containerId: item.containerId,
    containerTabId: item.containerTabId,
    status: item.status,
    sortOrder: item.sortOrder,
    pinned: item.pinned,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt,
    archivedAt: item.archivedAt,
    deletedAt: item.deletedAt,
    startAt:
      sourceItem !== undefined && "startAt" in sourceItem
        ? sourceItem.startAt
        : null,
    dueAt:
      sourceItem !== undefined && "dueAt" in sourceItem
        ? sourceItem.dueAt
        : null,
    tags: sourceItem?.tags
  };
}

function toInspectorCategoryOption(
  category: CategorySummary
): InspectorCategoryOption {
  return {
    id: category.id,
    name: category.name,
    color: category.color
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

function findCategoryColor(
  categoryId: string | null | undefined,
  categories: readonly CategorySummary[]
): string | null {
  if (categoryId === undefined || categoryId === null) {
    return null;
  }

  return categories.find((category) => category.id === categoryId)?.color ?? null;
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
    actionLabel: activity.actionLabel,
    actorLabel: activity.actorLabel,
    targetLabel: activity.targetLabel,
    summary: activity.summary,
    description: activity.description,
    createdAt: activity.createdAt
  };
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

function toRelatedContactViewModel(
  summary: RelatedContactSummary
): RelatedContactViewModel {
  return {
    relationshipId: summary.relationshipId,
    contactId: summary.contact.id,
    name: summary.contact.name,
    description: summary.contact.description,
    status: summary.contact.status,
    openTaskCount: summary.openTaskCount,
    recentActivityCount: summary.recentActivityCount,
    recentActivity: summary.recentActivity.map((activity) => ({
      id: activity.id,
      description: activity.description,
      createdAt: activity.createdAt
    }))
  };
}

function selectFirstUnlinkedContactId(
  contacts: readonly ContactSummary[],
  relatedContacts: readonly RelatedContactSummary[]
): string {
  const relatedIds = new Set(
    relatedContacts.map((summary) => summary.contact.id)
  );

  return contacts.find((contact) => !relatedIds.has(contact.id))?.id ?? "";
}

function createRelationshipTargetOptions(input: {
  currentContainerId: string;
  contacts: readonly ContactSummary[];
  projects: readonly ProjectSummary[];
  items: readonly ProjectFeedViewModel[];
}): RelatedContentTargetOption[] {
  return [
    ...input.projects
      .filter((project) => project.id !== input.currentContainerId)
      .map((project) => ({
        type: "container" as const,
        id: project.id,
        label: `Project · ${project.name}`,
        helperText: project.description
      })),
    ...input.contacts.map((contact) => ({
      type: "container" as const,
      id: contact.id,
      label: `Contact · ${contact.name}`,
      helperText: contact.description
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
  ];
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

function toProjectHealthViewModel(
  health: ProjectHealthSummary
): ProjectHealthViewModel {
  return {
    projectId: health.projectId,
    name: health.name,
    status: health.status,
    color: health.color,
    openTaskCount: health.openTaskCount,
    completedTaskCount: health.completedTaskCount,
    overdueTaskCount: health.overdueTaskCount,
    upcomingTaskCount: health.upcomingTaskCount,
    waitingTaskCount: health.waitingTaskCount,
    totalTaskCount: health.totalTaskCount,
    completionRatio: health.completionRatio,
    staleAfterDays: health.staleAfterDays,
    lastActivityAt: health.lastActivityAt,
    isStale: health.isStale,
    hasRecentActivity: health.hasRecentActivity,
    nextDueTask: health.nextDueTask,
    nextTask: health.nextTask,
    healthBadges: health.healthBadges,
    recentActivity: health.recentActivity.map(toRecentActivityViewModel)
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

  if (isListCardViewModel(item)) {
    return (
      item.listItems.length > 0 &&
      item.listItems.every((listItem) => listItem.status === "done")
    );
  }

  return item.status === "completed";
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return parsed;
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
  item: ProjectFeedViewModel,
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

function isFileCardViewModel(
  item: UniversalItemViewModel
): item is FileCardViewModel {
  return item.type === "file" && "attachment" in item;
}

function isLinkCardViewModel(
  item: UniversalItemViewModel
): item is LinkCardViewModel {
  return item.type === "link" && "normalizedUrl" in item;
}

function isLocationCardViewModel(
  item: UniversalItemViewModel
): item is LocationCardViewModel {
  return item.type === "location" && "viewportZoom" in item;
}

function getDisabledActionsForProjectItem(
  item: UniversalItemViewModel
): readonly ItemActionId[] {
  const disabled: ItemActionId[] = ["edit", "tag", "pin", "duplicate"];

  if (item.type !== "file") {
    disabled.push("reveal");
  }

  return disabled;
}

function formatDateLabel(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.length === 0) {
    return null;
  }

  return value.slice(0, 10);
}


function DatedItemProjection({
  items,
  mode,
  title
}: {
  items: readonly UniversalItemViewModel[];
  mode: ViewMode;
  title: string;
}): React.JSX.Element {
  const datedItems = items.filter(
    (item) => "dueAt" in item && typeof item.dueAt === "string" && item.dueAt.length > 0
  );

  if (datedItems.length === 0) {
    return (
      <div className="view-mode-empty-state">
        <h3>{title}</h3>
        <p>Dated tasks from this same filtered content set will appear in {mode} mode.</p>
      </div>
    );
  }

  return (
    <section className="grouped-results-list" aria-label={title}>
      <header className="grouped-results-heading">
        <h3>{title}</h3>
        <span>{datedItems.length}</span>
      </header>
      <div className="grouped-result-items">
        {datedItems.map((item) => (
          <article className="grouped-result-item" key={item.id}>
            <div className="grouped-result-main">
              <strong>{item.title}</strong>
              <div className="grouped-result-meta">
                <span>{"dueAt" in item ? String(item.dueAt).slice(0, 10) : ""}</span>
                <span>{item.type}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
