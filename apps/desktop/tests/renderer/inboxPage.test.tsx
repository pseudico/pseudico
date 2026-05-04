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
      bulkAddItems: async () => apiOk([listItemSummary()]),
      listByContainer: async () => apiOk([listSummary()]),
      createList: async () => apiOk(listSummary())
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
      listTargetsByMetadata: async () => apiOk([])
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
      createTaskInCollection: async () => apiOk(taskSummary())
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
        })
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
