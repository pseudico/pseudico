import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  apiOk,
  type CategorySummary,
  type DatabaseHealthStatus,
  type InboxSummary,
  type IpcModuleStatus,
  type ItemSummary,
  type ListItemSummary,
  type ListSummary,
  type LocalWorkOsApi,
  type NoteSummary,
  type ProjectHealthSummary,
  type ProjectSummary,
  type TaskSummary,
  type TodayViewModelSummary,
  type WorkspaceSummary
} from "../../src/preload/api";
import { InboxPage } from "../../src/renderer/pages/InboxPage";
import { workspaceStore } from "../../src/renderer/state/workspaceStore";

const workspace: WorkspaceSummary = {
  id: "workspace_1",
  name: "Personal Work",
  rootPath: "C:\\Work\\Personal",
  openedAt: "2026-05-01T00:00:00.000Z",
  schemaVersion: 1
};

const inboxItem: ItemSummary = {
  id: "item_1",
  workspaceId: "workspace_1",
  containerId: "container_inbox",
  containerTabId: null,
  type: "task",
  title: "Call supplier",
  body: "Ask about Friday delivery.",
  categoryId: "category_ops",
  status: "active",
  sortOrder: 1024,
  pinned: false,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  completedAt: null,
  archivedAt: null,
  deletedAt: null
};

const project: ProjectSummary = {
  id: "container_project_1",
  workspaceId: "workspace_1",
  type: "project",
  name: "Launch Plan",
  slug: "launch-plan",
  description: "Coordinate the launch work.",
  status: "active",
  categoryId: null,
  color: "#245c55",
  isFavorite: false,
  sortOrder: 0,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  archivedAt: null,
  deletedAt: null
};

function projectHealthSummary(
  sourceProject: ProjectSummary
): ProjectHealthSummary {
  return {
    projectId: sourceProject.id,
    workspaceId: sourceProject.workspaceId,
    name: sourceProject.name,
    status: sourceProject.status,
    color: sourceProject.color,
    generatedAt: "2026-05-01T01:00:00.000Z",
    openTaskCount: 1,
    completedTaskCount: 0,
    overdueTaskCount: 0,
    totalTaskCount: 1,
    nextDueTask: null,
    recentActivity: []
  };
}

describe("Inbox renderer page", () => {
  afterEach(() => {
    workspaceStore.reset();
  });

  it("asks for a workspace before showing Inbox content", () => {
    const html = renderToString(
      <MemoryRouter>
        <InboxPage apiClient={createMockApi()} />
      </MemoryRouter>
    );

    expect(html).toContain("Open or create a local workspace");
  });

  it("renders Inbox items with move-only triage actions", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter>
        <InboxPage
          apiClient={createMockApi()}
          initialItems={[inboxItem]}
          initialProjects={[
            project,
            {
              ...project,
              id: "container_project_waiting",
              name: "Waiting Project",
              status: "waiting"
            }
          ]}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Triage queue");
    expect(html).toContain("Call supplier");
    expect(html).toContain("Ask about Friday delivery.");
    expect(html).toContain("Move");
    expect(html).toContain("Launch Plan");
    expect(html).not.toContain("Waiting Project");
  });
});

function moduleStatus(module: IpcModuleStatus["module"]): IpcModuleStatus {
  return {
    module,
    available: true,
    implemented: false,
    message: `${module} placeholder`
  };
}

function createMockApi(): LocalWorkOsApi {
  const health: DatabaseHealthStatus = {
    connected: true,
    schemaVersion: 1,
    workspaceExists: true,
    inboxExists: true,
    defaultDashboardExists: true,
    activityLogAvailable: true,
    searchIndexAvailable: true,
    databasePath: "C:\\Work\\Personal\\data\\local-work-os.sqlite",
    error: null
  };

  return {
    workspace: {
      createWorkspace: async () => apiOk(workspace),
      openWorkspace: async () => apiOk(workspace),
      validateWorkspace: async () =>
        apiOk({
          ok: true,
          workspaceRootPath: workspace.rootPath,
          paths: {
            workspaceRootPath: workspace.rootPath,
            manifestPath: `${workspace.rootPath}\\workspace.json`,
            dataPath: `${workspace.rootPath}\\data`,
            databasePath: health.databasePath!,
            attachmentsPath: `${workspace.rootPath}\\attachments`,
            backupsPath: `${workspace.rootPath}\\backups`,
            exportsPath: `${workspace.rootPath}\\exports`,
            logsPath: `${workspace.rootPath}\\logs`
          },
          problems: []
        }),
      getCurrentWorkspace: async () => apiOk(workspace),
      listRecentWorkspaces: async () => apiOk([])
    },
    database: {
      getHealthStatus: async () => apiOk(health)
    },
    inbox: {
      getInbox: async () => apiOk(inboxSummary()),
      listItems: async () => apiOk([inboxItem]),
      moveItemToProject: async () =>
        apiOk({
          ...inboxItem,
          containerId: project.id
        })
    },
    tasks: {
      create: async () => apiOk(taskSummary()),
      update: async () => apiOk(taskSummary()),
      complete: async () =>
        apiOk({
          ...taskSummary(),
          status: "completed",
          taskStatus: "done"
      }),
      reopen: async () => apiOk(taskSummary()),
      snooze: async () => apiOk(taskSummary()),
      reschedule: async () => apiOk(taskSummary()),
      listByContainer: async () => apiOk([taskSummary()]),
      createTask: async () => apiOk(taskSummary()),
      updateTask: async () => apiOk(taskSummary()),
      completeTask: async () =>
        apiOk({
          ...taskSummary(),
          status: "completed",
          taskStatus: "done"
        }),
      reopenTask: async () => apiOk(taskSummary()),
      snoozeTask: async () => apiOk(taskSummary()),
      rescheduleTask: async () => apiOk(taskSummary())
    },
    lists: {
      create: async () => apiOk(listSummary()),
      addItem: async () => apiOk(listItemSummary()),
      updateItem: async () => apiOk(listItemSummary()),
      completeItem: async () =>
        apiOk({
          ...listItemSummary(),
          status: "done",
          completedAt: "2026-05-01T01:00:00.000Z"
        }),
      reopenItem: async () => apiOk(listItemSummary()),
      enablePipelineMode: async () =>
        apiOk({ ...listSummary(), displayMode: "pipeline" }),
      disablePipelineMode: async () => apiOk(listSummary()),
      getPipelineViewModel: async () =>
        apiOk({ list: listSummary(), stages: [] }),
      movePipelineCard: async () => apiOk(listItemSummary()),
      bulkAddItems: async () => apiOk([listItemSummary()]),
      listByContainer: async () => apiOk([listSummary()]),
      createList: async () => apiOk(listSummary()),
      saveAsTemplate: async () =>
        apiOk({
          id: "template_1",
          workspaceId: "workspace_1",
          kind: "list",
          name: "List template",
          description: null,
          sourceType: "list",
          sourceId: "item_list_1",
          templateJson: "{}",
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          deletedAt: null
        }),
      createFromTemplate: async () => apiOk(listSummary()),
      listTemplates: async () => apiOk([])
    },
    notes: {
      create: async () => apiOk(noteSummary()),
      update: async () => apiOk(noteSummary()),
      listByContainer: async () => apiOk([noteSummary()]),
      createNote: async () => apiOk(noteSummary()),
      updateNote: async () => apiOk(noteSummary())
    },
    links: {
      create: async () => apiOk(null as never),
      update: async () => apiOk(null as never),
      listByContainer: async () => apiOk([]),
      openExternal: async () =>
        apiOk({
          itemId: "item_link_1",
          url: "example.com/brief",
          normalizedUrl: "https://example.com/brief"
        }),
      openUrlExternal: async () =>
        apiOk({
          url: "https://example.com/inline",
          normalizedUrl: "https://example.com/inline"
        }),
      createLink: async () => apiOk(null as never),
      updateLink: async () => apiOk(null as never)
    },
    projects: {
      create: async () => apiOk({ project, defaultTabId: "container_tab_1" }),
      update: async () => apiOk(project),
      archive: async () =>
        apiOk({
          ...project,
          status: "archived",
          archivedAt: "2026-05-01T01:00:00.000Z"
        }),
      softDelete: async () =>
        apiOk({
          ...project,
          deletedAt: "2026-05-01T01:00:00.000Z"
        }),
      list: async () => apiOk([project]),
      get: async () => apiOk(project),
      getHealth: async () => apiOk(projectHealthSummary(project)),
      createProject: async () =>
        apiOk({ project, defaultTabId: "container_tab_1" }),
      updateProject: async () => apiOk(project),
      archiveProject: async () =>
        apiOk({
          ...project,
          status: "archived",
          archivedAt: "2026-05-01T01:00:00.000Z"
        }),
      softDeleteProject: async () =>
        apiOk({
          ...project,
          deletedAt: "2026-05-01T01:00:00.000Z"
        }),
      listProjects: async () => apiOk([project]),
      getProject: async () => apiOk(project),
      getProjectHealth: async () => apiOk(projectHealthSummary(project))
    },
    contacts: {
      create: async () =>
        apiOk({
          contact: { ...project, id: "container_contact_1", type: "contact" },
          defaultTabId: "container_tab_contact_1",
          fields: []
        }),
      update: async () =>
        apiOk({ ...project, id: "container_contact_1", type: "contact" }),
      list: async () => apiOk([]),
      get: async () => apiOk(null),
      addField: async () =>
        apiOk({
          id: "contact_field_1",
          workspaceId: workspace.id,
          containerId: "container_contact_1",
          label: "Email",
          value: "alex@example.com",
          type: "email",
          sortOrder: 0,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          deletedAt: null
        }),
      updateField: async () =>
        apiOk({
          id: "contact_field_1",
          workspaceId: workspace.id,
          containerId: "container_contact_1",
          label: "Email",
          value: "alex@example.com",
          type: "email",
          sortOrder: 0,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          deletedAt: null
        }),
      createContact: async () =>
        apiOk({
          contact: { ...project, id: "container_contact_1", type: "contact" },
          defaultTabId: "container_tab_contact_1",
          fields: []
        }),
      updateContact: async () =>
        apiOk({ ...project, id: "container_contact_1", type: "contact" }),
      listContacts: async () => apiOk([]),
      getContact: async () => apiOk(null)
    },
    tabs: {
      list: async () => apiOk([]),
      listManaged: async () => apiOk([]),
      listSummaries: async () => apiOk([]),
      listTemplates: async () => apiOk([]),
      create: async () => apiOk(null as never),
      createFromTemplate: async () => apiOk(null as never),
      rename: async () => apiOk(null as never),
      reorder: async () => apiOk([]),
      hide: async () => apiOk(null as never),
      show: async () => apiOk(null as never),
      duplicate: async () => apiOk(null as never),
      archive: async () => apiOk(null as never),
      delete: async () => apiOk(null as never),
      listTabs: async () => apiOk([]),
      listManagedTabs: async () => apiOk([]),
      listTabSummaries: async () => apiOk([]),
      createTab: async () => apiOk(null as never),
      createTabFromTemplate: async () => apiOk(null as never),
      renameTab: async () => apiOk(null as never),
      reorderTabs: async () => apiOk([]),
      hideTab: async () => apiOk(null as never),
      showTab: async () => apiOk(null as never),
      duplicateTab: async () => apiOk(null as never),
      archiveTab: async () => apiOk(null as never),
      deleteTab: async () => apiOk(null as never)
    },
    relationships: {
      linkContactToProject: async () =>
        apiOk({
          relationship: {
            id: "relationship_1",
            workspaceId: "workspace_1",
            sourceType: "container",
            sourceId: "container_contact_1",
            targetType: "container",
            targetId: "container_project_1",
            relationType: "related",
            label: "project_contact",
            createdAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null
          },
          changed: true
        }),
      unlinkContactFromProject: async () =>
        apiOk({
          relationship: {
            id: "relationship_1",
            workspaceId: "workspace_1",
            sourceType: "container",
            sourceId: "container_contact_1",
            targetType: "container",
            targetId: "container_project_1",
            relationType: "related",
            label: "project_contact",
            createdAt: "2026-05-01T00:00:00.000Z",
            deletedAt: "2026-05-01T01:00:00.000Z"
          },
          changed: true
        }),
      listContactsForProject: async () => apiOk([]),
      listProjectsForContact: async () => apiOk([])
    },
    categories: {
      create: async () => apiOk(categorySummary()),
      update: async () => apiOk(categorySummary()),
      delete: async () =>
        apiOk({
          ...categorySummary(),
          deletedAt: "2026-05-01T01:00:00.000Z"
        }),
      list: async () => apiOk([categorySummary()]),
      assignToProject: async () =>
        apiOk({
          ...project,
          categoryId: categorySummary().id
        }),
      assignToItem: async () =>
        apiOk({
          ...inboxItem,
          categoryId: categorySummary().id
        }),
      createCategory: async () => apiOk(categorySummary()),
      updateCategory: async () => apiOk(categorySummary()),
      deleteCategory: async () =>
        apiOk({
          ...categorySummary(),
          deletedAt: "2026-05-01T01:00:00.000Z"
        }),
      listCategories: async () => apiOk([categorySummary()])
    },
    metadata: {
      listTagsWithCounts: async () => apiOk([]),
      listCategoriesWithCounts: async () => apiOk([]),
      listTargetsByMetadata: async () => apiOk([]),
      getProjectTagBrowser: async () =>
        apiOk({
          workspaceId: "workspace_1",
          generatedAt: "2026-05-01T00:00:00.000Z",
          filters: { tagSlugs: [], categoryId: null, status: null },
          selectedTags: [],
          tagFacets: [],
          categoryFacets: [],
          statusFacets: [],
          projects: [],
          totalProjectCount: 0
        }),
      getContactLabelBrowser: async () =>
        apiOk({
          workspaceId: 'workspace_1',
          generatedAt: '2026-05-01T00:00:00.000Z',
          filters: { fieldFilters: [], company: null, role: null, location: null, emailDomain: null, tagSlugs: [], categoryId: null, status: null, groupBy: 'company', fieldGroupLabel: null },
          selectedTags: [],
          fieldFacets: [],
          companyFacets: [],
          roleFacets: [],
          locationFacets: [],
          emailDomainFacets: [],
          tagFacets: [],
          categoryFacets: [],
          statusFacets: [],
          contacts: [],
          groups: [],
          totalContactCount: 0
        }),
      addTagToTarget: async () =>
        apiOk({ id: "tag_1", name: "Inbox", slug: "inbox", source: "manual" }),
      removeTagFromTarget: async () =>
        apiOk({ id: "tag_1", name: "Inbox", slug: "inbox", source: "manual" })
    },
    search: {
      searchWorkspace: async () => apiOk([])
    },
    collections: {
      listCollections: async () => apiOk([]),
      createTagCollection: async () => apiOk(collectionSummary()),
      createKeywordCollection: async () => apiOk({
        ...collectionSummary(),
        kind: "keyword",
        tagSlug: null,
        keyword: "supplier"
      }),
      evaluateCollection: async () =>
        apiOk({ collection: collectionSummary(), total: 0, results: [], groups: [] }),
      createTaskInCollection: async () => apiOk(taskSummary()),
      listSmartLists: async () => apiOk([]),
      createSmartList: async () => apiOk(smartListSummary()),
      updateSmartList: async () => apiOk(smartListSummary()),
      previewSmartList: async () =>
        apiOk({ query: {}, total: 0, results: [], groups: [] })
    },
    today: {
      getViewModel: async () => apiOk(todayViewModelSummary()),
      getOrCreateDailyPlan: async () => apiOk(dailyPlanSummary()),
      planTask: async () => apiOk(dailyPlanItemSummary()),
      unplanTask: async () => apiOk([dailyPlanItemSummary()]),
      reorderPlannedTask: async () => apiOk(dailyPlanItemSummary()),
      getPlannedTasks: async () => apiOk([])
    },
    dashboard: {
      getDefault: async () =>
        apiOk({
          dashboard: {
            id: "dashboard_1",
            workspaceId: "workspace_1",
            name: "Dashboard",
            isDefault: true,
            layoutJson: "{}",
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null
          },
          widgets: []
        })
    },
    activity: {
      listRecent: async () => apiOk([]),
      listForTarget: async () => apiOk([]),
      listRecentActivity: async () => apiOk([]),
      listActivityForTarget: async () => apiOk([])
    },
    containers: {
      getStatus: async () => apiOk(moduleStatus("containers"))
    },
    items: {
      getStatus: async () => apiOk(moduleStatus("items")),
      move: async () => apiOk(inboxItem),
      archive: async () => apiOk({ ...inboxItem, status: "archived" }),
      softDelete: async () =>
        apiOk({
          ...inboxItem,
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      getActivity: async () => apiOk([]),
      openInspector: async () =>
        apiOk({
          item: inboxItem,
          activity: []
        }),
      moveItem: async () => apiOk(inboxItem),
      archiveItem: async () => apiOk({ ...inboxItem, status: "archived" }),
      softDeleteItem: async () =>
        apiOk({
          ...inboxItem,
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      getItemActivity: async () => apiOk([]),
      openItemInspector: async () =>
        apiOk({
          item: inboxItem,
          activity: []
        })
    },
    files: {
      getStatus: async () => apiOk(moduleStatus("files")),
      attachFileToContainer: async () => apiOk(null as never),
      attachFileToItem: async () => apiOk(null as never),
      chooseAndAttach: async () => apiOk(null),
      listByContainer: async () => apiOk([]),
      openAttachment: async () =>
        apiOk({
          attachmentId: "attachment_1",
          itemId: "item_file_1",
          exists: true,
          storagePath: "attachments/2026/05/attachment_1/Brief.pdf"
        }),
      revealAttachment: async () =>
        apiOk({
          attachmentId: "attachment_1",
          itemId: "item_file_1",
          exists: true,
          storagePath: "attachments/2026/05/attachment_1/Brief.pdf"
        }),
      updateMetadata: async () => apiOk(null as never),
      verifyAttachment: async () =>
        apiOk({
          attachmentId: "attachment_1",
          itemId: "item_file_1",
          exists: true,
          storagePath: "attachments/2026/05/attachment_1/Brief.pdf"
        }),
      createFileSnapshot: async () =>
        apiOk({
          attachment: {
            id: "attachment_1",
            workspaceId: "workspace_1",
            itemId: "item_file_1",
            originalName: "Brief.pdf",
            storedName: "Brief.pdf",
            mimeType: null,
            sizeBytes: 12,
            checksum: "abc123",
            storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
            description: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null
          },
          version: {
            id: "version_1",
            workspaceId: "workspace_1",
            attachmentId: "attachment_1",
            versionNumber: 1,
            originalName: "Brief.pdf",
            storedName: "Brief.pdf",
            sizeBytes: 12,
            checksum: "abc123",
            storagePath: "attachments/2026/05/attachment_1/versions/v1/Brief.pdf",
            note: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null
          }
        }),
      listFileVersions: async () => apiOk([]),
      openFileVersion: async () =>
        apiOk({
          versionId: "version_1",
          attachmentId: "attachment_1",
          exists: true,
          storagePath: "attachments/2026/05/attachment_1/versions/v1/Brief.pdf"
        }),
      restoreFileVersion: async () =>
        apiOk({
          attachment: {
            id: "attachment_1",
            workspaceId: "workspace_1",
            itemId: "item_file_1",
            originalName: "Brief.pdf",
            storedName: "Brief.pdf",
            mimeType: null,
            sizeBytes: 12,
            checksum: "abc123",
            storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
            description: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null
          },
          version: {
            id: "version_1",
            workspaceId: "workspace_1",
            attachmentId: "attachment_1",
            versionNumber: 1,
            originalName: "Brief.pdf",
            storedName: "Brief.pdf",
            sizeBytes: 12,
            checksum: "abc123",
            storagePath: "attachments/2026/05/attachment_1/versions/v1/Brief.pdf",
            note: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null
          }
        })
    },
    backup: {
      createManualBackup: async () => apiOk(null as never),
      listBackups: async () => apiOk([]),
      validateRestoreSource: async () => apiOk(null as never),
      restoreBackupToNewWorkspace: async () => apiOk(null as never),
      restoreExportToNewWorkspace: async () => apiOk(null as never)
    },
    import: {
      validateWorkspaceExportJson: async () => apiOk(null as never),
      chooseAndValidateWorkspaceExportJson: async () => apiOk(null)
    },
    export: {
      exportWorkspaceJson: async () => apiOk(null as never),
      exportProjectMarkdown: async () => apiOk(null as never),
      exportTasksCsv: async () => apiOk(null as never)
    },
    appearance: {
      getSettings: async () =>
        apiOk({
          workspaceId: "workspace_1",
          theme: "system",
          density: "comfortable",
          fontSize: "medium",
          updatedAt: null
        }),
      updateSettings: async () =>
        apiOk({
          workspaceId: "workspace_1",
          theme: "system",
          density: "comfortable",
          fontSize: "medium",
          updatedAt: "2026-05-10T03:20:00.000Z"
        })
    },
    diagnostics: {
      runWorkspaceIntegrityCheck: async () => apiOk(null as never)
    },
    navigation: {
      listRecentTargets: async () => apiOk([]),
      recordTarget: async () => apiOk([]),
      listPinnedFavorites: async () => apiOk([]),
      listAppTabs: async () =>
        apiOk({ workspaceId: "workspace_1", tabs: [], activeTabId: null }),
      openAppTab: async () =>
        apiOk({ workspaceId: "workspace_1", tabs: [], activeTabId: null }),
      closeAppTab: async () =>
        apiOk({ workspaceId: "workspace_1", tabs: [], activeTabId: null }),
      reorderAppTabs: async () =>
        apiOk({ workspaceId: "workspace_1", tabs: [], activeTabId: null }),
      setActiveAppTab: async () =>
        apiOk({ workspaceId: "workspace_1", tabs: [], activeTabId: null })
    }
  };
}

function inboxSummary(): InboxSummary {
  return {
    id: "container_inbox",
    workspaceId: "workspace_1",
    type: "inbox",
    name: "Inbox",
    slug: "inbox",
    description: null,
    status: "active",
    categoryId: null,
    color: null,
    isFavorite: true,
    sortOrder: 0,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    archivedAt: null,
    deletedAt: null
  };
}

function categorySummary(): CategorySummary {
  return {
    id: "category_ops",
    workspaceId: "workspace_1",
    name: "Operations",
    slug: "operations",
    description: null,
    color: "#3b82f6",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    deletedAt: null
  };
}

function taskSummary(): TaskSummary {
  return {
    ...inboxItem,
    type: "task",
    taskStatus: "open",
    priority: null,
    startAt: null,
    dueAt: "2026-05-03T00:00:00.000Z",
    allDay: true,
    timezone: null,
    taskCompletedAt: null,
    taskCreatedAt: "2026-05-01T00:00:00.000Z",
    taskUpdatedAt: "2026-05-01T00:00:00.000Z"
  };
}

function listItemSummary(): ListItemSummary {
  return {
    id: "list_item_1",
    workspaceId: "workspace_1",
    listItemParentId: null,
    listId: "item_list_1",
    title: "Sort captured links",
    body: null,
    status: "open",
    depth: 0,
    sortOrder: 1024,
    startAt: null,
    dueAt: null,
    completedAt: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    archivedAt: null,
    deletedAt: null
  };
}

function listSummary(): ListSummary {
  return {
    ...inboxItem,
    id: "item_list_1",
    type: "list",
    title: "Inbox checklist",
    displayMode: "checklist",
    showCompleted: true,
    progressMode: "count",
    listCreatedAt: "2026-05-01T00:00:00.000Z",
    listUpdatedAt: "2026-05-01T00:00:00.000Z",
    items: [listItemSummary()]
  };
}

function noteSummary(): NoteSummary {
  return {
    ...inboxItem,
    id: "item_note_1",
    type: "note",
    title: "Inbox note",
    body: "Captured note",
    format: "markdown",
    content: "# Captured note",
    preview: "Captured note",
    noteCreatedAt: "2026-05-01T00:00:00.000Z",
    noteUpdatedAt: "2026-05-01T00:00:00.000Z"
  };
}

function collectionSummary() {
  return {
    id: "saved_view_1",
    workspaceId: "workspace_1",
    name: "Finance",
    description: null,
    kind: "tag" as const,
    tagSlug: "finance",
    keyword: null,
    isFavorite: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
}

function smartListSummary() {
  return {
    id: "saved_view_smart_1",
    workspaceId: "workspace_1",
    name: "Waiting tasks",
    description: null,
    criteria: {
      itemTypes: ["task"],
      taskStatuses: ["waiting"]
    },
    query: {
      version: 1,
      match: "all",
      conditions: []
    },
    isFavorite: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
}

function todayViewModelSummary(): TodayViewModelSummary {
  return {
    workspaceId: "workspace_1",
    generatedAt: "2026-05-01T00:00:00.000Z",
    localDate: "2026-05-01",
    backlogDays: 14,
    ranges: {
      today: {
        startInclusive: "2026-05-01T00:00:00.000Z",
        endExclusive: "2026-05-02T00:00:00.000Z"
      },
      overdueBacklog: {
        startInclusive: "2026-04-17T00:00:00.000Z",
        endExclusive: "2026-05-01T00:00:00.000Z"
      },
      tomorrow: {
        startInclusive: "2026-05-02T00:00:00.000Z",
        endExclusive: "2026-05-03T00:00:00.000Z"
      }
    },
    dueToday: [],
    overdueBacklog: [],
    tomorrowPreview: []
  };
}

function dailyPlanSummary() {
  return {
    id: "daily_plan_1",
    workspaceId: "workspace_1",
    planDate: "2026-05-01",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
}

function dailyPlanItemSummary() {
  return {
    id: "daily_plan_item_1",
    workspaceId: "workspace_1",
    dailyPlanId: "daily_plan_1",
    itemType: "task" as const,
    itemId: "item_1",
    lane: "today" as const,
    sortOrder: 1024,
    addedManually: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
}


