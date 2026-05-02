import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ContainerRepository,
  DatabaseBootstrapService,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath
} from "@local-work-os/db";
import { ItemService } from "@local-work-os/features";
import { afterEach } from "vitest";
import { describe, expect, it } from "vitest";
import { handleGetDatabaseHealthStatus } from "../../src/main/ipc/databaseHandlers";
import { createInboxIpcHandlers } from "../../src/main/ipc/inboxHandlers";
import { handleGetModuleStatus } from "../../src/main/ipc/moduleStatusHandlers";
import { createProjectIpcHandlers } from "../../src/main/ipc/projectHandlers";
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

describe("project IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("returns an error when no workspace is open", async () => {
    const handlers = createProjectIpcHandlers({
      getCurrentWorkspace: () => null
    });

    await expect(
      handlers.handleListProjects(undefined)
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_ERROR",
        message: "No workspace is open."
      }
    });
  });

  it("creates and lists projects through the current workspace database", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-projects-"));
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);
    await new DatabaseBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });
    const handlers = createProjectIpcHandlers({
      getCurrentWorkspace: () => ({
        id: "workspace_1",
        name: "Personal",
        rootPath: tempRoot!,
        openedAt: "2026-05-01T00:00:00.000Z",
        schemaVersion: 1
      })
    });

    await expect(
      handlers.handleCreateProject({
        name: "Launch Plan",
        description: "Supplier checklist"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        project: {
          type: "project",
          name: "Launch Plan",
          slug: "launch-plan",
          status: "active"
        },
        defaultTabId: expect.any(String)
      }
    });
    await expect(
      handlers.handleListProjects(undefined)
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          type: "project",
          name: "Launch Plan",
          description: "Supplier checklist"
        }
      ]
    });
  });
});

describe("Inbox IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("returns an error when no workspace is open", async () => {
    const handlers = createInboxIpcHandlers({
      getCurrentWorkspace: () => null
    });

    await expect(
      handlers.handleListInboxItems(undefined)
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_ERROR",
        message: "No workspace is open."
      }
    });
  });

  it("lists and moves Inbox items through the current workspace database", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-inbox-"));
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);
    await new DatabaseBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });

    const workspaceService = {
      getCurrentWorkspace: () => ({
        id: "workspace_1",
        name: "Personal",
        rootPath: tempRoot!,
        openedAt: "2026-05-01T00:00:00.000Z",
        schemaVersion: 1
      })
    };
    const projectHandlers = createProjectIpcHandlers(workspaceService);
    const projectResult = await projectHandlers.handleCreateProject({
      name: "Launch Plan"
    });

    if (!projectResult.ok) {
      throw new Error(projectResult.error.message);
    }

    const connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });
    const inbox = new ContainerRepository(connection).findSystemInbox(
      "workspace_1"
    );

    if (inbox === null) {
      throw new Error("Expected seeded system Inbox.");
    }

    await new ItemService({
      connection,
      idFactory: (prefix) => `${prefix}_test`,
      now: () => new Date("2026-05-01T00:00:00.000Z")
    }).createItem({
      workspaceId: "workspace_1",
      containerId: inbox.id,
      type: "task",
      title: "Call supplier"
    });
    connection.close();

    const handlers = createInboxIpcHandlers(workspaceService);

    const listResult = await handlers.handleListInboxItems(undefined);

    if (!listResult.ok) {
      throw new Error(listResult.error.message);
    }

    expect(listResult).toMatchObject({
      ok: true,
      data: [
        {
          id: "item_test",
          title: "Call supplier",
          containerId: inbox.id
        }
      ]
    });
    const moveResult = await handlers.handleMoveInboxItemToProject({
      itemId: "item_test",
      projectId: projectResult.data.project.id
    });

    if (!moveResult.ok) {
      throw new Error(moveResult.error.message);
    }

    expect(moveResult).toMatchObject({
      ok: true,
      data: {
        id: "item_test",
        containerId: projectResult.data.project.id
      }
    });
    await expect(handlers.handleListInboxItems(undefined)).resolves.toMatchObject({
      ok: true,
      data: []
    });
  });
});
