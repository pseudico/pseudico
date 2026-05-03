import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  apiOk,
  type ApiResult,
  type DatabaseHealthStatus,
  type InboxSummary,
  type IpcModuleStatus,
  type ItemSummary,
  type ListItemSummary,
  type ListSummary,
  type LocalWorkOsApi,
  type NoteSummary,
  type ProjectSummary,
  type RecentWorkspace,
  type TaskSummary,
  type WorkspaceSummary
} from "../../src/preload/api";
import {
  createQuickTask,
  QuickAddModal,
  resolveDefaultCaptureContainer,
  resolveDefaultCaptureContainerFromTargets
} from "../../src/renderer/components/QuickAddModal";

const workspace: WorkspaceSummary = {
  id: "workspace_1",
  name: "Personal Work",
  rootPath: "C:\\Work\\Personal",
  openedAt: "2026-05-01T00:00:00.000Z",
  schemaVersion: 1
};

const inbox: InboxSummary = {
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

const activeProject: ProjectSummary = {
  id: "container_project_1",
  workspaceId: "workspace_1",
  type: "project",
  name: "Launch Plan",
  slug: "launch-plan",
  description: "Coordinate launch work.",
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

describe("QuickAddModal", () => {
  it("defaults capture to Inbox outside a project route", () => {
    const resolution = resolveDefaultCaptureContainerFromTargets({
      inbox,
      projects: [activeProject]
    });

    expect(resolution.defaultContainerId).toBe("container_inbox");
    expect(resolution.targets.map((target) => target.name)).toEqual([
      "Inbox",
      "Launch Plan"
    ]);
  });

  it("preselects the current active project when context has a project id", () => {
    const resolution = resolveDefaultCaptureContainerFromTargets({
      context: { projectId: activeProject.id },
      inbox,
      projects: [
        {
          ...activeProject,
          id: "container_waiting",
          name: "Waiting",
          status: "waiting"
        },
        activeProject
      ]
    });

    expect(resolution.defaultContainerId).toBe(activeProject.id);
    expect(resolution.targets.map((target) => target.name)).toEqual([
      "Inbox",
      "Launch Plan"
    ]);
  });

  it("loads default capture targets through the typed API client", async () => {
    const result = await resolveDefaultCaptureContainer(
      workspace.id,
      { projectId: activeProject.id },
      createMockApi()
    );

    expect(result).toMatchObject({
      ok: true,
      data: {
        defaultContainerId: activeProject.id
      }
    });
  });

  it("creates quick tasks through the task API", async () => {
    const calls: unknown[] = [];
    const result = await createQuickTask(createMockApi(calls), {
      workspaceId: workspace.id,
      targetContainerId: activeProject.id,
      title: " Call supplier ",
      dueDate: "2026-05-04"
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        title: "Call supplier",
        containerId: activeProject.id
      }
    });
    expect(calls).toEqual([
      {
        workspaceId: workspace.id,
        containerId: activeProject.id,
        title: "Call supplier",
        dueAt: "2026-05-04"
      }
    ]);
  });

  it("renders a workspace-required message when opened without a workspace", () => {
    const html = renderToString(
      <QuickAddModal open workspace={null} onClose={() => undefined} />
    );

    expect(html).toContain("Quick add");
    expect(html).toContain("Open or create a local workspace");
  });
});

function createMockApi(taskCreateCalls: unknown[] = []): LocalWorkOsApi {
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
            databasePath: `${workspace.rootPath}\\data\\local-work-os.sqlite`,
            attachmentsPath: `${workspace.rootPath}\\attachments`,
            backupsPath: `${workspace.rootPath}\\backups`,
            exportsPath: `${workspace.rootPath}\\exports`,
            logsPath: `${workspace.rootPath}\\logs`
          },
          problems: []
        }),
      getCurrentWorkspace: async (): Promise<ApiResult<WorkspaceSummary | null>> =>
        apiOk(workspace),
      listRecentWorkspaces: async (): Promise<ApiResult<RecentWorkspace[]>> =>
        apiOk([])
    },
    database: {
      getHealthStatus: async (): Promise<ApiResult<DatabaseHealthStatus>> =>
        apiOk({
          connected: true,
          schemaVersion: 1,
          workspaceExists: true,
          inboxExists: true,
          defaultDashboardExists: true,
          activityLogAvailable: true,
          searchIndexAvailable: true,
          databasePath: `${workspace.rootPath}\\data\\local-work-os.sqlite`,
          error: null
        })
    },
    inbox: {
      getInbox: async () => apiOk(inbox),
      listItems: async () => apiOk([itemSummary()]),
      moveItemToProject: async () => apiOk(itemSummary())
    },
    tasks: {
      create: async (input) => {
        taskCreateCalls.push(input);
        return apiOk(taskSummary(input.title, input.containerId));
      },
      update: async () => apiOk(taskSummary("Call supplier", activeProject.id)),
      complete: async () => apiOk(taskSummary("Call supplier", activeProject.id)),
      reopen: async () => apiOk(taskSummary("Call supplier", activeProject.id)),
      listByContainer: async () =>
        apiOk([taskSummary("Call supplier", activeProject.id)]),
      createTask: async () => apiOk(taskSummary("Call supplier", activeProject.id)),
      updateTask: async () => apiOk(taskSummary("Call supplier", activeProject.id)),
      completeTask: async () =>
        apiOk(taskSummary("Call supplier", activeProject.id)),
      reopenTask: async () =>
        apiOk(taskSummary("Call supplier", activeProject.id))
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
      create: async () => apiOk({ project: activeProject, defaultTabId: "tab_1" }),
      update: async () => apiOk(activeProject),
      archive: async () => apiOk({ ...activeProject, status: "archived" }),
      softDelete: async () =>
        apiOk({ ...activeProject, deletedAt: "2026-05-01T00:00:00.000Z" }),
      list: async () => apiOk([activeProject]),
      get: async () => apiOk(activeProject),
      createProject: async () =>
        apiOk({ project: activeProject, defaultTabId: "tab_1" }),
      updateProject: async () => apiOk(activeProject),
      archiveProject: async () => apiOk({ ...activeProject, status: "archived" }),
      softDeleteProject: async () =>
        apiOk({ ...activeProject, deletedAt: "2026-05-01T00:00:00.000Z" }),
      listProjects: async () => apiOk([activeProject]),
      getProject: async () => apiOk(activeProject)
    },
    containers: {
      getStatus: async () => apiOk(moduleStatus("containers"))
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
      getStatus: async () => apiOk(moduleStatus("files"))
    }
  };
}

function itemSummary(): ItemSummary {
  return {
    id: "item_1",
    workspaceId: workspace.id,
    containerId: activeProject.id,
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
  };
}

function taskSummary(title: string, containerId: string): TaskSummary {
  return {
    ...itemSummary(),
    title,
    containerId,
    type: "task",
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

function listItemSummary(): ListItemSummary {
  return {
    id: "list_item_1",
    workspaceId: workspace.id,
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
    ...itemSummary(),
    id: "item_list_1",
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
    type: "note",
    title: "Launch note",
    body: "Decision notes",
    format: "markdown",
    content: "# Decision notes",
    preview: "Decision notes",
    noteCreatedAt: "2026-05-01T00:00:00.000Z",
    noteUpdatedAt: "2026-05-01T00:00:00.000Z"
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
