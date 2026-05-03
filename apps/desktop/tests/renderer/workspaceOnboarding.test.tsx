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
  type RecentWorkspace,
  type TaskSummary,
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
      listByContainer: async () => apiOk([]),
      createTask: async () => apiOk(taskSummary()),
      updateTask: async () => apiOk(taskSummary()),
      completeTask: async () =>
        apiOk({
          ...taskSummary(),
          status: "completed",
          taskStatus: "done"
        }),
      reopenTask: async () => apiOk(taskSummary())
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
      getProject: async () => apiOk(null)
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
    containers: {
      getStatus: async () => apiOk(moduleStatus("containers"))
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
      getStatus: async () => apiOk(moduleStatus("files"))
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
    expect(html).toContain("Open workspace");
    expect(html).toContain("No recent workspaces yet.");
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
    expect(html).toContain("form-message-error");
  });
});
