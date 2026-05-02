import { describe, expect, it } from "vitest";
import {
  apiOk,
  type ApiResult,
  type DatabaseHealthStatus,
  type InboxSummary,
  type IpcModuleStatus,
  type ItemSummary,
  type LocalWorkOsApi,
  type ProjectSummary,
  type RecentWorkspace,
  type WorkspaceSummary
} from "../../src/preload/api";
import { createDesktopApiClient } from "../../src/renderer/api/desktopApiClient";

function moduleStatus(module: IpcModuleStatus["module"]): IpcModuleStatus {
  return {
    module,
    available: true,
    implemented: false,
    message: `${module} placeholder`
  };
}

function createMockApi(
  overrides: Partial<LocalWorkOsApi> = {}
): LocalWorkOsApi {
  const api: LocalWorkOsApi = {
    workspace: {
      createWorkspace: async () =>
        apiOk({
          id: "workspace_1",
          name: "Personal",
          rootPath: "C:\\work",
          openedAt: "2026-04-30T00:00:00.000Z",
          schemaVersion: null
        }),
      openWorkspace: async () =>
        apiOk({
          id: "workspace_1",
          name: "Personal",
          rootPath: "C:\\work",
          openedAt: "2026-04-30T00:00:00.000Z",
          schemaVersion: null
        }),
      validateWorkspace: async () =>
        apiOk({
          ok: true,
          workspaceRootPath: "C:\\work",
          paths: {
            workspaceRootPath: "C:\\work",
            manifestPath: "C:\\work\\workspace.json",
            dataPath: "C:\\work\\data",
            databasePath: "C:\\work\\data\\local-work-os.sqlite",
            attachmentsPath: "C:\\work\\attachments",
            backupsPath: "C:\\work\\backups",
            exportsPath: "C:\\work\\exports",
            logsPath: "C:\\work\\logs"
          },
          problems: []
        }),
      getCurrentWorkspace: async (): Promise<
        ApiResult<WorkspaceSummary | null>
      > => apiOk(null),
      listRecentWorkspaces: async (): Promise<ApiResult<RecentWorkspace[]>> =>
        apiOk([])
    },
    database: {
      getHealthStatus: async (): Promise<ApiResult<DatabaseHealthStatus>> =>
        apiOk({
          connected: false,
          schemaVersion: null,
          workspaceExists: false,
          inboxExists: false,
          defaultDashboardExists: false,
          activityLogAvailable: false,
          searchIndexAvailable: false,
          databasePath: null,
          error: null
        })
    },
    inbox: {
      getInbox: async () => apiOk(inboxSummary()),
      listItems: async () => apiOk([itemSummary()]),
      moveItemToProject: async () =>
        apiOk({
          ...itemSummary(),
          containerId: "container_1"
        })
    },
    projects: {
      create: async () =>
        apiOk({
          project: projectSummary(),
          defaultTabId: "container_tab_1"
        }),
      update: async () => apiOk(projectSummary()),
      archive: async () =>
        apiOk({
          ...projectSummary(),
          status: "archived",
          archivedAt: "2026-04-30T01:00:00.000Z"
        }),
      softDelete: async () =>
        apiOk({
          ...projectSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      list: async () => apiOk([projectSummary()]),
      get: async () => apiOk(projectSummary()),
      createProject: async () =>
        apiOk({
          project: projectSummary(),
          defaultTabId: "container_tab_1"
        }),
      updateProject: async () => apiOk(projectSummary()),
      archiveProject: async () =>
        apiOk({
          ...projectSummary(),
          status: "archived",
          archivedAt: "2026-04-30T01:00:00.000Z"
        }),
      softDeleteProject: async () =>
        apiOk({
          ...projectSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      listProjects: async () => apiOk([projectSummary()]),
      getProject: async () => apiOk(projectSummary())
    },
    containers: {
      getStatus: async () => apiOk(moduleStatus("containers"))
    },
    items: {
      getStatus: async () => apiOk(moduleStatus("items"))
    },
    files: {
      getStatus: async () => apiOk(moduleStatus("files"))
    }
  };

  return {
    ...api,
    ...overrides
  };
}

function projectSummary(): ProjectSummary {
  return {
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
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
    archivedAt: null,
    deletedAt: null
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
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
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
    title: "Call accountant",
    body: null,
    categoryId: null,
    status: "active",
    sortOrder: 1024,
    pinned: false,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
    completedAt: null,
    archivedAt: null,
    deletedAt: null
  };
}

describe("desktop API client", () => {
  it("passes typed preload results through to renderer callers", async () => {
    const client = createDesktopApiClient(createMockApi());

    await expect(client.workspace.getCurrentWorkspace()).resolves.toEqual({
      ok: true,
      data: null
    });
    await expect(client.database.getHealthStatus()).resolves.toMatchObject({
      ok: true,
      data: {
        connected: false,
        databasePath: null
      }
    });
    await expect(client.inbox.listItems()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "item_1",
          title: "Call accountant"
        }
      ]
    });
    await expect(client.projects.listProjects()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "container_1",
          type: "project"
        }
      ]
    });
    await expect(client.projects.list()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "container_1",
          type: "project"
        }
      ]
    });
  });

  it("converts thrown preload failures into structured API errors", async () => {
    const client = createDesktopApiClient(
      createMockApi({
        workspace: {
          ...createMockApi().workspace,
          getCurrentWorkspace: async () => {
            throw new Error("missing IPC handler");
          }
        }
      })
    );

    await expect(client.workspace.getCurrentWorkspace()).resolves.toEqual({
      ok: false,
      error: {
        code: "IPC_ERROR",
        message: "missing IPC handler"
      }
    });
  });
});
