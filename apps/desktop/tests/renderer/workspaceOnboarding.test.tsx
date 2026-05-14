import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import {
  apiOk,
  type CategorySummary,
  type DatabaseHealthStatus,
  type IpcModuleStatus,
  type ListItemSummary,
  type ListSummary,
  type LocalWorkOsApi,
  type NoteSummary,
  type ProjectHealthSummary,
  type RecentWorkspace,
  type TaskSummary,
  type TodayViewModelSummary,
  type WorkspaceSummary
} from "../../src/preload/api";
import { WelcomePage } from "../../src/renderer/pages/WelcomePage";
import {
  WorkspaceHealthSummary
} from "../../src/renderer/pages/WorkspaceHealthPanel";

const workspace: WorkspaceSummary = {
  id: "workspace_1",
  name: "Personal Work",
  rootPath: "C:\\Work\\Personal",
  openedAt: "2026-05-01T00:00:00.000Z",
  schemaVersion: 1
};

const healthyDatabase: DatabaseHealthStatus = {
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

function projectHealthSummary(): ProjectHealthSummary {
  return {
    projectId: "container_1",
    workspaceId: "workspace_1",
    name: "Launch Plan",
    status: "active",
    color: null,
    generatedAt: "2026-05-01T01:00:00.000Z",
    openTaskCount: 0,
    completedTaskCount: 0,
    overdueTaskCount: 0,
    upcomingTaskCount: 0,
    waitingTaskCount: 0,
    completionRatio: 0,
    staleAfterDays: 14,
    lastActivityAt: "2026-05-04T00:00:00.000Z",
    isStale: false,
    hasRecentActivity: true,
    totalTaskCount: 0,
    nextDueTask: null,
    nextTask: null,
    healthBadges: [],
    recentActivity: []
  };
}

function moduleStatus(module: IpcModuleStatus["module"]): IpcModuleStatus {
  return {
    module,
    available: true,
    implemented: false,
    message: `${module} placeholder`
  };
}

function createMockApi(
  recentWorkspaces: RecentWorkspace[] = []
): LocalWorkOsApi {
  return {
    workspace: {
      createWorkspace: async () => apiOk(workspace),
      createDemoWorkspace: async () => apiOk(workspace),
      openWorkspace: async () => apiOk(workspace),
      validateWorkspace: async () =>
        apiOk({
          ok: true,
          workspaceRootPath: workspace.rootPath,
          paths: {
            workspaceRootPath: workspace.rootPath,
            manifestPath: `${workspace.rootPath}\\workspace.json`,
            dataPath: `${workspace.rootPath}\\data`,
            databasePath: healthyDatabase.databasePath!,
            attachmentsPath: `${workspace.rootPath}\\attachments`,
            backupsPath: `${workspace.rootPath}\\backups`,
            exportsPath: `${workspace.rootPath}\\exports`,
            logsPath: `${workspace.rootPath}\\logs`
          },
          problems: []
        }),
      getCurrentWorkspace: async () => apiOk(null),
      listRecentWorkspaces: async () => apiOk(recentWorkspaces)
    },
    database: {
      getHealthStatus: async () => apiOk(healthyDatabase)
    },
    inbox: {
      getInbox: async () =>
        apiOk({
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
        }),
      listItems: async () => apiOk([]),
      moveItemToProject: async () =>
        apiOk({
          id: "item_1",
          workspaceId: "workspace_1",
          containerId: "container_1",
          containerTabId: null,
          type: "task",
          title: "Call supplier",
          body: null,
          categoryId: null,
          status: "active",
          sortOrder: 1024,
          pinned: false,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          completedAt: null,
          archivedAt: null,
          deletedAt: null
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
      listByContainer: async () => apiOk([]),
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
      indentItem: async () => apiOk({ ...listItemSummary(), depth: 1 }),
      outdentItem: async () => apiOk({ ...listItemSummary(), depth: 0 }),
      moveItem: async () => apiOk(listItemSummary()),
      moveItemToList: async () => apiOk([listItemSummary()]),
      bulkAddItems: async () => apiOk([listItemSummary()]),
      bulkUpdateItems: async () => apiOk({
        listId: 'item_list_1',
        operation: 'complete',
        requestedCount: 1,
        changedCount: 1,
        skippedCount: 0,
        items: [],
        activityId: 'activity_1'
      }),
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
    locations: {
      create: async () => apiOk(null as never),
      update: async () => apiOk(null as never),
      listByContainer: async () => apiOk([]),
      openExternal: async () =>
        apiOk({
          itemId: "item_location_1",
          mapUrl: "https://www.openstreetmap.org/search?query=Launch"
        }),
      createLocation: async () => apiOk(null as never),
      updateLocation: async () => apiOk(null as never)
    },
    projects: {
      create: async () =>
        apiOk({
          project: {
            id: "container_1",
            workspaceId: "workspace_1",
            type: "project",
            name: "Launch Plan",
            slug: "launch-plan",
            description: null,
            status: "active",
            categoryId: null,
            color: null,
            isFavorite: false,
            sortOrder: 0,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            archivedAt: null,
            deletedAt: null
          },
          defaultTabId: "container_tab_1"
        }),
      update: async () =>
        apiOk({
          id: "container_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Launch Plan",
          slug: "launch-plan",
          description: null,
          status: "active",
          categoryId: null,
          color: null,
          isFavorite: false,
          sortOrder: 0,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          archivedAt: null,
          deletedAt: null
        }),
      archive: async () =>
        apiOk({
          id: "container_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Launch Plan",
          slug: "launch-plan",
          description: null,
          status: "archived",
          categoryId: null,
          color: null,
          isFavorite: false,
          sortOrder: 0,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          archivedAt: "2026-05-01T01:00:00.000Z",
          deletedAt: null
        }),
      softDelete: async () =>
        apiOk({
          id: "container_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Launch Plan",
          slug: "launch-plan",
          description: null,
          status: "active",
          categoryId: null,
          color: null,
          isFavorite: false,
          sortOrder: 0,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          archivedAt: null,
          deletedAt: "2026-05-01T01:00:00.000Z"
        }),
      list: async () => apiOk([]),
      get: async () => apiOk(null),
      getHealth: async () => apiOk(projectHealthSummary()),
      createProject: async () =>
        apiOk({
          project: {
            id: "container_1",
            workspaceId: "workspace_1",
            type: "project",
            name: "Launch Plan",
            slug: "launch-plan",
            description: null,
            status: "active",
            categoryId: null,
            color: null,
            isFavorite: false,
            sortOrder: 0,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            archivedAt: null,
            deletedAt: null
          },
          defaultTabId: "container_tab_1"
        }),
      updateProject: async () =>
        apiOk({
          id: "container_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Launch Plan",
          slug: "launch-plan",
          description: null,
          status: "active",
          categoryId: null,
          color: null,
          isFavorite: false,
          sortOrder: 0,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          archivedAt: null,
          deletedAt: null
        }),
      archiveProject: async () =>
        apiOk({
          id: "container_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Launch Plan",
          slug: "launch-plan",
          description: null,
          status: "archived",
          categoryId: null,
          color: null,
          isFavorite: false,
          sortOrder: 0,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          archivedAt: "2026-05-01T01:00:00.000Z",
          deletedAt: null
        }),
      softDeleteProject: async () =>
        apiOk({
          id: "container_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Launch Plan",
          slug: "launch-plan",
          description: null,
          status: "active",
          categoryId: null,
          color: null,
          isFavorite: false,
          sortOrder: 0,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          archivedAt: null,
          deletedAt: "2026-05-01T01:00:00.000Z"
        }),
      listProjects: async () => apiOk([]),
      getProject: async () => apiOk(null),
      getProjectHealth: async () => apiOk(projectHealthSummary())
    },
    contacts: {
      create: async () =>
        apiOk({
          contact: contactSummary(),
          defaultTabId: "container_tab_contact_1",
          fields: []
        }),
      update: async () => apiOk(contactSummary()),
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
          contact: contactSummary(),
          defaultTabId: "container_tab_contact_1",
          fields: []
        }),
      updateContact: async () => apiOk(contactSummary()),
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
      getGraph: async () => apiOk(null as never),
      createRelationship: async () => apiOk(null as never),
      removeRelationship: async () => apiOk(null as never),
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
          id: "container_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Launch Plan",
          slug: "launch-plan",
          description: null,
          status: "active",
          categoryId: categorySummary().id,
          color: null,
          isFavorite: false,
          sortOrder: 0,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          archivedAt: null,
          deletedAt: null
        }),
      assignToItem: async () =>
        apiOk({
          ...taskSummary(),
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
        apiOk({ id: "tag_1", name: "Setup", slug: "setup", source: "manual" }),
      removeTagFromTarget: async () =>
        apiOk({ id: "tag_1", name: "Setup", slug: "setup", source: "manual" })
    },
    search: {
      searchWorkspace: async () => apiOk([]),
      saveSearch: async () => apiOk({ savedViewId: "saved_search_1", name: "Saved search" })
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
      createMetadataCollection: async () => apiOk(collectionSummary()),
      evaluateCollection: async () =>
        apiOk({ collection: collectionSummary(), total: 0, results: [], groups: [] }),
      createTaskInCollection: async () => apiOk(taskSummary()),
      createNoteInCollection: async () => apiOk(noteSummary()),
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
      getPlannedTasks: async () => apiOk([]),
      getPreferences: async () => apiOk(todayPreferencesSummary()),
      updatePreferences: async () => apiOk(todayPreferencesSummary())
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
      getStatus: async () => apiOk(moduleStatus("containers")),
      getPreferences: async (containerId) =>
        apiOk({
          workspaceId: "workspace_1",
          containerId,
          updatedAt: null,
          defaultView: "feed",
          defaultTabId: null,
          showCompleted: true,
          grouping: "none",
          defaultQuickAddType: "task",
          summaryFirst: false,
          compactMode: false
        }),
      updatePreferences: async (input) =>
        apiOk({
          workspaceId: "workspace_1",
          containerId: input.containerId,
          updatedAt: "2026-05-10T10:01:00.000Z",
          defaultView: input.defaultView ?? "feed",
          defaultTabId: input.defaultTabId ?? null,
          showCompleted: input.showCompleted ?? true,
          grouping: input.grouping ?? "none",
          defaultQuickAddType: input.defaultQuickAddType ?? "task",
          summaryFirst: input.summaryFirst ?? false,
          compactMode: input.compactMode ?? false
        }),
      getGrouping: async (input) =>
        apiOk({
          workspaceId: input.workspaceId ?? "workspace_1",
          containerType: input.containerType,
          mode: input.mode ?? (input.containerType === "project" ? "status" : "company"),
          generatedAt: "2026-05-10T10:01:00.000Z",
          staleAfterDays: 30,
          totalCount: 0,
          facets: [],
          preferences: {
            workspaceId: input.workspaceId ?? "workspace_1",
            containerType: input.containerType,
            mode: input.mode ?? (input.containerType === "project" ? "status" : "company"),
            collapsedGroupKeys: [],
            updatedAt: null
          },
          groups: []
        }),
      getGroupingPreferences: async (input) =>
        apiOk({
          workspaceId: input.workspaceId ?? "workspace_1",
          containerType: input.containerType,
          mode: input.containerType === "project" ? "status" : "company",
          collapsedGroupKeys: [],
          updatedAt: null
        }),
      updateGroupingPreferences: async (input) =>
        apiOk({
          workspaceId: input.workspaceId ?? "workspace_1",
          containerType: input.containerType,
          mode: input.mode ?? (input.containerType === "project" ? "status" : "company"),
          collapsedGroupKeys: input.collapsedGroupKeys ?? [],
          updatedAt: "2026-05-10T10:01:00.000Z"
        })
    },
    items: {
      getStatus: async () => apiOk(moduleStatus("items")),
      move: async () => apiOk(taskSummary()),
      archive: async () => apiOk({ ...taskSummary(), status: "archived" }),
      softDelete: async () =>
        apiOk({
          ...taskSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      getActivity: async () => apiOk([]),
      openInspector: async () =>
        apiOk({
          item: taskSummary(),
          activity: []
        }),
      moveItem: async () => apiOk(taskSummary()),
      archiveItem: async () => apiOk({ ...taskSummary(), status: "archived" }),
      softDeleteItem: async () =>
        apiOk({
          ...taskSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      getItemActivity: async () => apiOk([]),
      openItemInspector: async () =>
        apiOk({
          item: taskSummary(),
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
      listBackupsForWorkspacePath: async () => apiOk([]),
      getAutomaticBackupSettings: async () => apiOk(null as never),
      updateAutomaticBackupSettings: async () => apiOk(null as never),
      runAutomaticBackupCheck: async () => apiOk(null as never),
      validateRestoreSource: async () => apiOk(null as never),
      restoreBackupToNewWorkspace: async () => apiOk(null as never),
      restoreBackupFromWorkspacePath: async () => apiOk(null as never),
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
      runWorkspaceIntegrityCheck: async () => apiOk(null as never),
      repairAttachment: async () => apiOk(null),
      runSavedViewDiagnostics: async () => apiOk(null as never),
      repairSavedViewQuery: async () => apiOk(null as never),
      runMaintenanceJob: async () => apiOk(null as never),
      listMaintenanceJobs: async () => apiOk([])
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

function contactSummary() {
  return {
    id: "container_contact_1",
    workspaceId: "workspace_1",
    type: "contact" as const,
    name: "Alex Chen",
    slug: "alex-chen",
    description: "Client stakeholder",
    status: "active" as const,
    categoryId: null,
    color: "#2c6b8f",
    isFavorite: false,
    sortOrder: 0,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    archivedAt: null,
    deletedAt: null
  };
}

function taskSummary(): TaskSummary {
  return {
    id: "item_1",
    workspaceId: "workspace_1",
    containerId: "container_inbox",
    containerTabId: null,
    type: "task",
    title: "Call supplier",
    body: null,
    categoryId: null,
    status: "active",
    sortOrder: 1024,
    pinned: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    completedAt: null,
    archivedAt: null,
    deletedAt: null,
    taskStatus: "open",
    priority: null,
    startAt: null,
    dueAt: null,
    allDay: true,
    timezone: null,
    taskCompletedAt: null,
    taskCreatedAt: "2026-05-01T00:00:00.000Z",
    taskUpdatedAt: "2026-05-01T00:00:00.000Z"
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
    criteria: { itemTypes: ["task"] },
    query: { version: 1, match: "all", conditions: [] },
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
    preferences: {
      maxFocusTasks: 6,
      planningMode: "standard",
      backlogDays: 14,
      showWaiting: false,
      showDeferred: false,
      showDailyCompletionSummary: true
    },
    focusSummary: {
      plannedTodayCount: 0,
      maxFocusTasks: 6,
      limitExceeded: false,
      warning: null
    },
    completionSummary: {
      completedTodayCount: 0,
      plannedTodayCompletedCount: 0,
      show: true
    },
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

function listItemSummary(): ListItemSummary {
  return {
    id: "list_item_1",
    workspaceId: "workspace_1",
    listItemParentId: null,
    listId: "item_list_1",
    title: "Confirm copy",
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
    id: "item_list_1",
    workspaceId: "workspace_1",
    containerId: "container_inbox",
    containerTabId: null,
    type: "list",
    title: "Inbox checklist",
    body: null,
    categoryId: null,
    status: "active",
    sortOrder: 1024,
    pinned: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    completedAt: null,
    archivedAt: null,
    deletedAt: null,
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
    id: "item_note_1",
    workspaceId: "workspace_1",
    containerId: "container_inbox",
    containerTabId: null,
    type: "note",
    title: "Inbox note",
    body: "Captured note",
    categoryId: null,
    status: "active",
    sortOrder: 1024,
    pinned: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    completedAt: null,
    archivedAt: null,
    deletedAt: null,
    format: "markdown",
    content: "# Captured note",
    preview: "Captured note",
    noteCreatedAt: "2026-05-01T00:00:00.000Z",
    noteUpdatedAt: "2026-05-01T00:00:00.000Z"
  };
}

describe("workspace onboarding renderer", () => {
  it("renders the welcome page empty state", () => {
    const html = renderToString(
      <MemoryRouter>
        <WelcomePage apiClient={createMockApi()} />
      </MemoryRouter>
    );

    expect(html).toContain("Create workspace");
    expect(html).toContain("Create demo workspace");
    expect(html).toContain("Open workspace");
    expect(html).toContain("No recent workspaces yet");
  });

  it("renders workspace health from mocked API data", () => {
    const html = renderToString(
      <WorkspaceHealthSummary
        error={null}
        health={healthyDatabase}
        loading={false}
        workspace={workspace}
      />
    );

    expect(html).toContain("Workspace health");
    expect(html).toContain("Schema version");
    expect(html).toContain("Inbox");
    expect(html).toContain("Activity log");
    expect(html).toContain("Search index");
    expect(html).toContain("C:\\Work\\Personal\\data\\local-work-os.sqlite");
  });

  it("renders create or open failure state", () => {
    const html = renderToString(
      <MemoryRouter>
        <WelcomePage
          apiClient={createMockApi()}
          initialError="Workspace operation failed."
        />
      </MemoryRouter>
    );

    expect(html).toContain("Workspace operation failed.");
    expect(html).toContain("Workspace action failed");
    expect(html).toContain("error-state");
  });
});


function todayPreferencesSummary() {
  return {
    workspaceId: "workspace_1",
    updatedAt: null,
    maxFocusTasks: 6,
    planningMode: "standard" as const,
    backlogDays: 14,
    showWaiting: false,
    showDeferred: false,
    showDailyCompletionSummary: true
  };
}
