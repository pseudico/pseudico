import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DatabaseBootstrapService,
  resolveWorkspaceDatabasePath
} from "@local-work-os/db";
import { afterEach } from "vitest";
import { describe, expect, it } from "vitest";
import { handleGetDatabaseHealthStatus } from "../../src/main/ipc/databaseHandlers";
import { handleGetModuleStatus } from "../../src/main/ipc/moduleStatusHandlers";
import { createWorkspaceIpcHandlers } from "../../src/main/ipc/workspaceHandlers";
import type { WorkspaceFileSystemService } from "../../src/main/services/workspace/WorkspaceFileSystemService";

function createMockWorkspaceService(): WorkspaceFileSystemService {
  return {
    createWorkspace: async () => ({
      id: "workspace_1",
      name: "Personal",
      rootPath: "C:\\work",
      openedAt: "2026-04-30T00:00:00.000Z",
      schemaVersion: 1
    }),
    openWorkspace: async () => ({
      id: "workspace_1",
      name: "Personal",
      rootPath: "C:\\work",
      openedAt: "2026-04-30T00:00:00.000Z",
      schemaVersion: 1
    }),
    validateWorkspace: async () => ({
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
    getCurrentWorkspace: () => null,
    listRecentWorkspaces: async () => []
  } as unknown as WorkspaceFileSystemService;
}

describe("workspace IPC handlers", () => {
  const handlers = createWorkspaceIpcHandlers(createMockWorkspaceService());

  it("returns the current workspace through the service", () => {
    expect(handlers.handleGetCurrentWorkspace()).toEqual({
      ok: true,
      data: null
    });
  });

  it("returns recent workspaces through the service", async () => {
    await expect(handlers.handleListRecentWorkspaces()).resolves.toEqual({
      ok: true,
      data: []
    });
  });

  it("validates create workspace input before service calls", async () => {
    await expect(
      handlers.handleCreateWorkspace({ name: "", rootPath: "C:\\work" })
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "createWorkspace requires non-empty name and rootPath fields."
      }
    });

    await expect(
      handlers.handleCreateWorkspace({ name: "Personal", rootPath: "C:\\work" })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: "workspace_1"
      }
    });
  });

  it("validates open and validate workspace input before service calls", async () => {
    await expect(handlers.handleOpenWorkspace({ rootPath: "" })).resolves.toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "openWorkspace requires a non-empty rootPath field."
      }
    });

    await expect(
      handlers.handleValidateWorkspace({ rootPath: "", repair: true })
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message:
          "validateWorkspace requires a non-empty rootPath field and optional repair boolean."
      }
    });

    await expect(
      handlers.handleOpenWorkspace({ rootPath: "C:\\work" })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: "workspace_1"
      }
    });
  });
});

describe("database IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("returns disconnected health when no workspace is open", async () => {
    await expect(
      handleGetDatabaseHealthStatus({
        getCurrentWorkspace: () => null
      })
    ).resolves.toEqual({
      ok: true,
      data: {
        connected: false,
        schemaVersion: null,
        workspaceExists: false,
        inboxExists: false,
        defaultDashboardExists: false,
        activityLogAvailable: false,
        searchIndexAvailable: false,
        databasePath: null,
        error: "No workspace is open."
      }
    });
  });

  it("returns real health for the current bootstrapped workspace", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-health-"));
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);
    await new DatabaseBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });

    await expect(
      handleGetDatabaseHealthStatus({
        getCurrentWorkspace: () => ({
          id: "workspace_1",
          name: "Personal",
          rootPath: tempRoot!,
          openedAt: "2026-05-01T00:00:00.000Z",
          schemaVersion: 1
        })
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        connected: true,
        schemaVersion: 1,
        workspaceExists: true,
        inboxExists: true,
        defaultDashboardExists: true,
        activityLogAvailable: true,
        searchIndexAvailable: true,
        databasePath,
        error: null
      }
    });
  });
});

describe("placeholder module IPC handlers", () => {
  it("documents future file IPC without enabling file operations", () => {
    expect(handleGetModuleStatus("files")).toEqual({
      ok: true,
      data: {
        module: "files",
        available: true,
        implemented: false,
        message:
          "File IPC is typed but awaits workspace filesystem service tickets."
      }
    });
  });
});
