import { describe, expect, it } from "vitest";
import {
  apiOk,
  type ApiResult,
  type DatabaseHealthStatus,
  type IpcModuleStatus,
  type LocalWorkOsApi,
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
          activityLogAvailable: false,
          searchIndexAvailable: false,
          databasePath: null
        })
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
