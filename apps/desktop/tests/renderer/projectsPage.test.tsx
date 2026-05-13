import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  apiOk,
  type ActivitySummary,
  type CategorySummary,
  type CollectionEvaluationSummary,
  type CollectionSummary,
  type ContactLabelBrowserSummary,
  type ContactSummary,
  type DatabaseHealthStatus,
  type DashboardViewModelSummary,
  type InboxSummary,
  type IpcModuleStatus,
  type ItemSummary,
  type ListItemSummary,
  type ListSummary,
  type LocalWorkOsApi,
  type MetadataTargetSummary,
  type NoteSummary,
  type ProjectHealthSummary,
  type ProjectSummary,
  type RelatedContactSummary,
  type SearchResultSummary,
  type TaskSummary,
  type TodayViewModelSummary,
  type WorkspaceSummary
} from "../../src/preload/api";
import { ProjectDetailPage } from "../../src/renderer/pages/ProjectDetailPage";
import { ContactLabelBrowserPage } from "../../src/renderer/pages/ContactLabelBrowserPage";
import { ContactsPage } from "../../src/renderer/pages/ContactsPage";
import { ProjectTagBrowserPage } from "../../src/renderer/pages/ProjectTagBrowserPage";
import { ProjectsPage } from "../../src/renderer/pages/ProjectsPage";
import { CollectionsPage } from "../../src/renderer/pages/CollectionsPage";
import { SearchPage } from "../../src/renderer/pages/SearchPage";
import { TagsCategoriesPage } from "../../src/renderer/pages/TagsCategoriesPage";
import { workspaceStore } from "../../src/renderer/state/workspaceStore";
import type {
  FileCardViewModel,
  NoteCardViewModel,
  UniversalItemViewModel
} from "@local-work-os/ui";

const workspace: WorkspaceSummary = {
  id: "workspace_1",
  name: "Personal Work",
  rootPath: "C:\\Work\\Personal",
  openedAt: "2026-05-01T00:00:00.000Z",
  schemaVersion: 1
};

const project: ProjectSummary = {
  id: "container_1",
  workspaceId: "workspace_1",
  type: "project",
  name: "Launch Plan",
  slug: "launch-plan",
  description: "Coordinate the launch work.",
  status: "active",
  categoryId: null,
  color: "#245c55",
  isFavorite: true,
  sortOrder: 0,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  archivedAt: null,
  deletedAt: null
};

const contact: ContactSummary = {
  id: "contact_1",
  workspaceId: "workspace_1",
  type: "contact",
  name: "Alex Chen",
  slug: "alex-chen",
  description: "Client stakeholder",
  status: "active",
  categoryId: null,
  color: "#2c6b8f",
  isFavorite: false,
  sortOrder: 0,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  archivedAt: null,
  deletedAt: null
};

const relatedContact: RelatedContactSummary = {
  relationshipId: "relationship_1",
  relationshipCreatedAt: "2026-05-01T00:00:00.000Z",
  contact,
  openTaskCount: 1,
  recentActivityCount: 1,
  recentActivity: []
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
    upcomingTaskCount: 0,
    waitingTaskCount: 0,
    completionRatio: 0,
    staleAfterDays: 14,
    lastActivityAt: "2026-05-04T00:00:00.000Z",
    isStale: false,
    hasRecentActivity: true,
    totalTaskCount: 1,
    nextDueTask: {
      itemId: "item_1",
      title: "Book launch venue",
      dueAt: "2026-05-03T00:00:00.000Z",
      taskStatus: "open",
      priority: 2
    },
    nextTask: {
      itemId: "item_1",
      title: "Call accountant",
      dueAt: "2026-05-04T00:00:00.000Z",
      taskStatus: "open",
      priority: 2
    },
    healthBadges: [{ kind: "upcoming", label: "1 upcoming", tone: "info" }],
    recentActivity: []
  };
}

const category: CategorySummary = {
  id: "category_1",
  workspaceId: "workspace_1",
  name: "Finance",
  slug: "finance",
  color: "#2c6b8f",
  description: null,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  deletedAt: null
};

const metadataTarget: MetadataTargetSummary = {
  targetType: "item",
  targetId: "item_1",
  workspaceId: "workspace_1",
  kind: "task",
  title: "Book launch venue",
  body: "Confirm the room hold before Friday.",
  status: "active",
  category: {
    id: "category_1",
    name: "Finance",
    slug: "finance",
    color: "#2c6b8f"
  },
  tags: [
    {
      id: "tag_1",
      name: "Launch",
      slug: "launch",
      source: "manual"
    }
  ],
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  archivedAt: null,
  deletedAt: null
};

const searchResult: SearchResultSummary = {
  id: "search_1",
  workspaceId: "workspace_1",
  targetType: "item",
  targetId: "item_1",
  kind: "task",
  title: "Book launch venue",
  body: "Confirm the room hold before Friday.",
  status: "open",
  tags: ["launch"],
  category: "Finance",
  updatedAt: "2026-05-01T00:00:00.000Z",
  archivedAt: null,
  deletedAt: null,
  containerId: "container_1",
  containerTitle: "Launch Plan",
  parentItemId: null,
  parentItemTitle: null,
  destinationPath: "/projects/container_1"
};

const projectItem: UniversalItemViewModel = {
  id: "item_1",
  type: "task",
  title: "Book launch venue",
  body: "Confirm the room hold before Friday.",
  status: "open",
  taskStatus: "open",
  dueAt: "2026-05-03T00:00:00.000Z",
  dueLabel: "Friday",
  pinned: true
} as UniversalItemViewModel;

const projectNote: NoteCardViewModel = {
  id: "item_note_1",
  type: "note",
  title: "Launch note",
  body: "Decision notes",
  status: "active",
  content: "# Decision notes\n\nConfirm launch plan.",
  preview: "Decision notes Confirm launch plan.",
  pinned: false
};

const projectFile: FileCardViewModel = {
  id: "item_file_1",
  type: "file",
  title: "Brief.pdf",
  body: "Launch brief",
  status: "active",
  pinned: false,
  attachment: {
    id: "attachment_1",
    originalName: "Brief.pdf",
    storedName: "Brief.pdf",
    sizeBytes: 2048,
    storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
    description: "Launch brief"
  },
  missing: true
};

function moduleStatus(module: IpcModuleStatus["module"]): IpcModuleStatus {
  return {
    module,
    available: true,
    implemented: false,
    message: `${module} placeholder`
  };
}

function createMockApi(projects: ProjectSummary[] = []): LocalWorkOsApi {
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
      listItems: async () => apiOk([itemSummary()]),
      moveItemToProject: async () =>
        apiOk({
          ...itemSummary(),
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
      list: async () => apiOk(projects),
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
      listProjects: async () => apiOk(projects),
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
      create: async () => apiOk(category),
      update: async () => apiOk(category),
      delete: async () =>
        apiOk({ ...category, deletedAt: "2026-05-01T01:00:00.000Z" }),
      list: async () => apiOk([category]),
      assignToProject: async (input) =>
        apiOk({ ...project, categoryId: input.categoryId ?? null }),
      assignToItem: async (input) =>
        apiOk({ ...itemSummary(), categoryId: input.categoryId ?? null }),
      createCategory: async () => apiOk(category),
      updateCategory: async () => apiOk(category),
      deleteCategory: async () =>
        apiOk({ ...category, deletedAt: "2026-05-01T01:00:00.000Z" }),
      listCategories: async () => apiOk([category])
    },
    metadata: {
      listTagsWithCounts: async () =>
        apiOk([
          {
            id: "tag_1",
            workspaceId: "workspace_1",
            name: "Launch",
            slug: "launch",
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null,
            targetCount: 1
          }
        ]),
      listCategoriesWithCounts: async () =>
        apiOk([
          {
            ...category,
            targetCount: 1
          }
        ]),
      listTargetsByMetadata: async () => apiOk([metadataTarget]),
      getProjectTagBrowser: async () => apiOk(projectTagBrowserSummary()),
      getContactLabelBrowser: async () => apiOk(contactLabelBrowserSummary()),
      addTagToTarget: async () =>
        apiOk({ id: "tag_1", name: "Launch", slug: "launch", source: "manual" }),
      removeTagFromTarget: async () =>
        apiOk({ id: "tag_1", name: "Launch", slug: "launch", source: "manual" })
    },
    search: {
      searchWorkspace: async () => apiOk([]),
      saveSearch: async () => apiOk({ savedViewId: "saved_search_1", name: "Saved search" })
    },
    collections: {
      listCollections: async () => apiOk([collectionSummary()]),
      createTagCollection: async () => apiOk(collectionSummary()),
      createKeywordCollection: async () => apiOk({
        ...collectionSummary(),
        id: "saved_view_2",
        kind: "keyword",
        tagSlug: null,
        keyword: "supplier"
      }),
      createMetadataCollection: async () => apiOk(collectionSummary()),
      evaluateCollection: async () => apiOk(collectionEvaluationSummary()),
      createTaskInCollection: async () =>
        apiOk({
          ...taskSummary(),
          tags: [
            {
              id: "tag_1",
              name: "Finance",
              slug: "finance",
              source: "manual"
            }
          ]
        }),
      createNoteInCollection: async () =>
        apiOk({
          ...noteSummary(),
          tags: [
            {
              id: "tag_1",
              name: "Finance",
              slug: "finance",
              source: "manual"
            }
          ]
        }),
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
      getDefault: async () => apiOk(dashboardViewModelSummary())
    },
    activity: {
      listRecent: async () => apiOk([activitySummary()]),
      listForTarget: async () => apiOk([activitySummary()]),
      listRecentActivity: async () => apiOk([activitySummary()]),
      listActivityForTarget: async () => apiOk([activitySummary()])
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
          totalCount: projects.length,
          facets: [],
          preferences: {
            workspaceId: input.workspaceId ?? "workspace_1",
            containerType: input.containerType,
            mode: input.mode ?? (input.containerType === "project" ? "status" : "company"),
            collapsedGroupKeys: [],
            updatedAt: null
          },
          groups: [
            {
              key: "all",
              label: input.containerType === "project" ? "All projects" : "All contacts",
              count: projects.length,
              collapsed: false,
              targets: projects.map((entry) => ({
                ...entry,
                categoryName: null,
                tags: []
              }))
            }
          ]
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
      move: async () => apiOk(itemSummary()),
      archive: async () => apiOk({ ...itemSummary(), status: "archived" }),
      softDelete: async () =>
        apiOk({
          ...itemSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      getActivity: async () => apiOk([]),
      openInspector: async () =>
        apiOk({
          item: itemSummary(),
          activity: []
        }),
      moveItem: async () => apiOk(itemSummary()),
      archiveItem: async () => apiOk({ ...itemSummary(), status: "archived" }),
      softDeleteItem: async () =>
        apiOk({
          ...itemSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      getItemActivity: async () => apiOk([]),
      openItemInspector: async () =>
        apiOk({
          item: itemSummary(),
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
      getAutomaticBackupSettings: async () => apiOk(null as never),
      updateAutomaticBackupSettings: async () => apiOk(null as never),
      runAutomaticBackupCheck: async () => apiOk(null as never),
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

function itemSummary(): ItemSummary {
  return {
    id: "item_1",
    workspaceId: "workspace_1",
    containerId: "container_inbox",
    containerTabId: null,
    type: "task",
    title: "Book launch venue",
    body: "Confirm the room hold before Friday.",
    categoryId: null,
    status: "active",
    sortOrder: 1024,
    pinned: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    completedAt: null,
    archivedAt: null,
    deletedAt: null
  };
}

function taskSummary(): TaskSummary {
  return {
    ...itemSummary(),
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
    title: "Confirm launch copy",
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
    ...itemSummary(),
    id: "item_list_1",
    containerId: project.id,
    type: "list",
    title: "Launch checklist",
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
    ...itemSummary(),
    id: "item_note_1",
    containerId: project.id,
    type: "note",
    title: "Launch note",
    body: "Decision notes Confirm launch plan.",
    format: "markdown",
    content: "# Decision notes\n\nConfirm launch plan.",
    preview: "Decision notes Confirm launch plan.",
    noteCreatedAt: "2026-05-01T00:00:00.000Z",
    noteUpdatedAt: "2026-05-01T00:00:00.000Z"
  };
}

function collectionSummary(): CollectionSummary {
  return {
    id: "saved_view_1",
    workspaceId: "workspace_1",
    name: "Finance",
    description: "Finance follow-ups",
    kind: "tag",
    tagSlug: "finance",
    keyword: null,
    isFavorite: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    viewMode: "list"
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

function dashboardViewModelSummary(): DashboardViewModelSummary {
  return {
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
  };
}

function collectionEvaluationSummary(): CollectionEvaluationSummary {
  return {
    collection: collectionSummary(),
    total: 1,
    results: [
      {
        targetType: "item",
        targetId: "item_1",
        kind: "task",
        title: "Book launch venue",
        containerId: "container_1",
        containerType: "project",
        containerTitle: "Launch Plan",
        categoryId: "category_1",
        categoryName: "Finance",
        taskStatus: "open",
        dueAt: "2026-05-04T00:00:00.000Z",
        tags: ["finance"],
        destinationPath: "/projects/container_1/items/item_1"
      }
    ],
    groups: [
      {
        key: "container_1",
        label: "Launch Plan",
        results: [
          {
            targetType: "item",
            targetId: "item_1",
            kind: "task",
            title: "Book launch venue",
            containerId: "container_1",
            containerType: "project",
            containerTitle: "Launch Plan",
            categoryId: "category_1",
            categoryName: "Finance",
            taskStatus: "open",
            dueAt: "2026-05-04T00:00:00.000Z",
            tags: ["finance"],
            destinationPath: "/projects/container_1/items/item_1"
          }
        ]
      }
    ]
  };
}

function activitySummary(): ActivitySummary {
  return {
    id: "activity_1",
    workspaceId: "workspace_1",
    actorType: "local_user",
    action: "container_created",
    targetType: "container",
    targetId: "container_1",
    summary: "Created project \"Launch Plan\".",
    beforeJson: null,
    afterJson: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    actionLabel: "Container Created",
    actorLabel: "Local user",
    targetLabel: "Container container_1",
    description: "Created project \"Launch Plan\"."
  };
}


function projectTagBrowserSummary() {
  return {
    workspaceId: "workspace_1",
    generatedAt: "2026-05-01T00:00:00.000Z",
    filters: {
      tagSlugs: ["client", "urgent"],
      categoryId: "category_1",
      status: "active" as const
    },
    selectedTags: [
      {
        id: "tag_client",
        workspaceId: "workspace_1",
        name: "Client",
        slug: "client",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
        deletedAt: null
      },
      {
        id: "tag_urgent",
        workspaceId: "workspace_1",
        name: "Urgent",
        slug: "urgent",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
        deletedAt: null
      }
    ],
    tagFacets: [
      {
        id: "tag_client",
        workspaceId: "workspace_1",
        name: "Client",
        slug: "client",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
        deletedAt: null,
        projectCount: 2
      },
      {
        id: "tag_urgent",
        workspaceId: "workspace_1",
        name: "Urgent",
        slug: "urgent",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
        deletedAt: null,
        projectCount: 1
      }
    ],
    categoryFacets: [
      {
        ...category,
        projectCount: 1
      }
    ],
    statusFacets: [
      {
        status: "active" as const,
        projectCount: 1
      }
    ],
    projects: [
      {
        ...project,
        category: {
          id: "category_1",
          name: "Finance",
          slug: "finance",
          color: "#2c6b8f"
        },
        tags: [
          { id: "tag_client", name: "Client", slug: "client", source: "manual" as const },
          { id: "tag_urgent", name: "Urgent", slug: "urgent", source: "manual" as const }
        ]
      }
    ],
    totalProjectCount: 1
  };
}

function contactLabelBrowserSummary(): ContactLabelBrowserSummary {
  return {
    workspaceId: "workspace_1",
    generatedAt: "2026-05-01T00:00:00.000Z",
    filters: {
      fieldFilters: [{ labelKey: "company", valueKey: "acme" }],
      company: "acme",
      role: null,
      location: null,
      emailDomain: "acme.test",
      tagSlugs: ["vip"],
      categoryId: "category_1",
      status: "active",
      groupBy: "company",
      fieldGroupLabel: "company"
    },
    selectedTags: [
      {
        id: "tag_vip",
        workspaceId: "workspace_1",
        name: "VIP",
        slug: "vip",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
        deletedAt: null
      }
    ],
    fieldFacets: [
      {
        label: "Company",
        labelKey: "company",
        value: "Acme",
        valueKey: "acme",
        type: "text",
        contactCount: 1
      },
      {
        label: "Email",
        labelKey: "email",
        value: "alex@acme.test",
        valueKey: "alex@acme.test",
        type: "email",
        contactCount: 1
      }
    ],
    companyFacets: [{ value: "Acme", valueKey: "acme", contactCount: 1 }],
    roleFacets: [{ value: "Decision Maker", valueKey: "decision maker", contactCount: 1 }],
    locationFacets: [{ value: "Melbourne", valueKey: "melbourne", contactCount: 1 }],
    emailDomainFacets: [{ value: "acme.test", valueKey: "acme.test", contactCount: 1 }],
    tagFacets: [
      {
        id: "tag_vip",
        workspaceId: "workspace_1",
        name: "VIP",
        slug: "vip",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
        deletedAt: null,
        contactCount: 1
      }
    ],
    categoryFacets: [{ ...category, contactCount: 1 }],
    statusFacets: [{ status: "active", contactCount: 1 }],
    contacts: [
      {
        ...contact,
        category: {
          id: "category_1",
          name: "Finance",
          slug: "finance",
          color: "#2c6b8f"
        },
        fields: [
          {
            id: "field_1",
            workspaceId: "workspace_1",
            containerId: contact.id,
            label: "Company",
            labelKey: "company",
            value: "Acme",
            valueKey: "acme",
            type: "text",
            sortOrder: 0,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null
          },
          {
            id: "field_2",
            workspaceId: "workspace_1",
            containerId: contact.id,
            label: "Email",
            labelKey: "email",
            value: "alex@acme.test",
            valueKey: "alex@acme.test",
            type: "email",
            sortOrder: 1,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null
          }
        ],
        tags: [{ id: "tag_vip", name: "VIP", slug: "vip", source: "manual" }]
      }
    ],
    groups: [
      {
        key: "Acme",
        label: "Acme",
        contactCount: 1,
        contacts: [
          {
            ...contact,
            category: {
              id: "category_1",
              name: "Finance",
              slug: "finance",
              color: "#2c6b8f"
            },
            fields: [
              {
                id: "field_1",
                workspaceId: "workspace_1",
                containerId: contact.id,
                label: "Company",
                labelKey: "company",
                value: "Acme",
                valueKey: "acme",
                type: "text",
                sortOrder: 0,
                createdAt: "2026-05-01T00:00:00.000Z",
                updatedAt: "2026-05-01T00:00:00.000Z",
                deletedAt: null
              }
            ],
            tags: [{ id: "tag_vip", name: "VIP", slug: "vip", source: "manual" }]
          }
        ]
      }
    ],
    totalContactCount: 1
  };
}

describe("Projects renderer pages", () => {
  afterEach(() => {
    workspaceStore.reset();
  });

  it("renders the empty Projects page for an open workspace", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter>
        <ProjectsPage apiClient={createMockApi()} />
      </MemoryRouter>
    );

    expect(html).toContain("Projects");
    expect(html).toContain("No projects yet");
    expect(html).toContain("Create project");
    expect(html).toContain("Library grouping");
    expect(html).toContain("Status");
  });

  it("renders contact grouping controls for the contacts library", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter>
        <ContactsPage apiClient={createMockApi()} />
      </MemoryRouter>
    );

    expect(html).toContain("Contacts");
    expect(html).toContain("Library grouping");
    expect(html).toContain("Company");
    expect(html).toContain("Browse labels");
  });

  it("renders project detail metadata placeholders", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/projects/container_1"]}>
        <Routes>
          <Route
            path="/projects/:projectId"
            element={
              <ProjectDetailPage
                apiClient={createMockApi([project])}
                initialActivity={[activitySummary()]}
                initialAvailableContacts={[contact]}
                initialRelatedContacts={[relatedContact]}
                initialProject={project}
                initialItems={[projectItem, projectNote, projectFile]}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain("Launch Plan");
    expect(html).toContain("Status");
    expect(html).toContain("Category");
    expect(html).toContain("Tags");
    expect(html).toContain("Content feed");
    expect(html).toContain("Recent activity");
    expect(html).toContain("Related contacts");
    expect(html).toContain("Alex Chen");
    expect(html).toContain("1 open follow-up");
    expect(html).toContain("Created project &quot;Launch Plan&quot;.");
    expect(html).toContain("Book launch venue");
    expect(html).toContain("Launch note");
    expect(html).toContain("Decision notes Confirm launch plan.");
    expect(html).toContain("Brief.pdf");
    expect(html).toContain("File missing from workspace storage.");
    expect(html).toContain("Attach file");
    expect(html).toContain("Export Markdown");
    expect(html).toContain("Edit note");
    expect(html).toContain("Complete");
    expect(html).toContain("Due");
    expect(html).toContain("Actions for Book launch venue");
  });

  it("renders the Tags & Categories browser with filters and grouped results", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter>
        <TagsCategoriesPage
          apiClient={createMockApi([project])}
          initialCategories={[
            {
              ...category,
              targetCount: 1,
              containerCount: 0,
              itemCount: 1,
              listItemCount: 0
            }
          ]}
          initialTags={[
            {
              id: "tag_1",
              workspaceId: "workspace_1",
              name: "Launch",
              slug: "launch",
              createdAt: "2026-05-01T00:00:00.000Z",
              updatedAt: "2026-05-01T00:00:00.000Z",
              deletedAt: null,
              targetCount: 1,
              containerCount: 0,
              itemCount: 1,
              listItemCount: 0
            }
          ]}
          initialSelectedTagSlugs={["launch"]}
          initialTargets={[metadataTarget]}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Tags &amp; Categories");
    expect(html).toContain("Launch");
    expect(html).toContain("data-tag-source=\"manual\"");
    expect(html).toContain("Finance");
    expect(html).toContain("Book launch venue");
    expect(html).toContain("Items");
    expect(html).toContain("Save as collection");
    expect(html).toContain("Include archived matches");
    expect(html).toContain("Containers:");
  });

  it("renders the project tag browser with drill-down filters and projects", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter initialEntries={["/project-tags?tags=client,urgent&categoryId=category_1&status=active"]}>
        <ProjectTagBrowserPage
          apiClient={createMockApi([project])}
          initialViewModel={projectTagBrowserSummary()}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Project Tag Browser");
    expect(html).toContain("@client");
    expect(html).toContain("@urgent");
    expect(html).toContain("Matching projects");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("data-tag-source=\"manual\"");
  });

  it("renders the contact label browser with label facets and grouped contacts", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter initialEntries={["/contact-labels?field=Company:Acme&company=acme&emailDomain=acme.test&tags=vip&categoryId=category_1&status=active"]}>
        <ContactLabelBrowserPage
          apiClient={createMockApi([project])}
          initialViewModel={contactLabelBrowserSummary()}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Contact Label Browser");
    expect(html).toContain("Company: Acme");
    expect(html).toContain("Email domain: acme.test");
    expect(html).toContain("Matching contacts");
    expect(html).toContain("Alex Chen");
    expect(html).toContain("data-tag-source=\"manual\"");
  });

  it("renders global search results with type filters and source context", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter initialEntries={["/search?q=type:task tag:finance launch"]}>
        <SearchPage
          apiClient={createMockApi([project])}
          initialQuery="type:task tag:finance launch"
          initialKinds={["task"]}
          initialResults={[searchResult]}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Search");
    expect(html).toContain("Projects");
    expect(html).toContain("Tasks");
    expect(html).toContain("Files");
    expect(html).toContain("Save search");
    expect(html).toContain("Type<!-- -->: <!-- -->task");
    expect(html).toContain("Tag<!-- -->: <!-- -->finance");
    expect(html).toContain("Book launch venue");
    expect(html).toContain("Confirm the room hold before Friday.");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("data-tag-source=\"manual\"");
  });

  it("renders collections with create controls, grouped results, and tag task creation", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter>
        <CollectionsPage
          apiClient={createMockApi([project])}
          initialCollections={[collectionSummary()]}
          initialEvaluation={collectionEvaluationSummary()}
          initialProjects={[project]}
          initialContacts={[contact]}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Collections");
    expect(html).toContain("Tag slug");
    expect(html).toContain("Keyword");
    expect(html).toContain("Finance");
    expect(html).toContain("Finance follow-ups");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("Book launch venue");
    expect(html).toContain("Add <!-- -->task");
    expect(html).toContain("data-tag-source=\"manual\"");
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
