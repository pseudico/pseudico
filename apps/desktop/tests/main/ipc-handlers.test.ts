import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ContainerRepository,
  DatabaseBootstrapService,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath
} from "@local-work-os/db";
import { ItemService, TagService } from "@local-work-os/features";
import { afterEach } from "vitest";
import { describe, expect, it } from "vitest";
import { handleGetDatabaseHealthStatus } from "../../src/main/ipc/databaseHandlers";
import { createCategoryIpcHandlers } from "../../src/main/ipc/categoryHandlers";
import { createInboxIpcHandlers } from "../../src/main/ipc/inboxHandlers";
import { createItemIpcHandlers } from "../../src/main/ipc/itemHandlers";
import { createListIpcHandlers } from "../../src/main/ipc/listHandlers";
import { createMetadataIpcHandlers } from "../../src/main/ipc/metadataHandlers";
import { handleGetModuleStatus } from "../../src/main/ipc/moduleStatusHandlers";
import { createNoteIpcHandlers } from "../../src/main/ipc/noteHandlers";
import { createProjectIpcHandlers } from "../../src/main/ipc/projectHandlers";
import { createSearchIpcHandlers } from "../../src/main/ipc/searchHandlers";
import { createTaskIpcHandlers } from "../../src/main/ipc/taskHandlers";
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

describe("Category IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("creates, lists, assigns, and deletes categories", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-categories-"));
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
      name: "Tax Prep"
    });

    if (!projectResult.ok) {
      throw new Error(projectResult.error.message);
    }

    const handlers = createCategoryIpcHandlers(workspaceService);
    const created = await handlers.handleCreateCategory({
      name: "Finance",
      color: "#2c6b8f"
    });

    if (!created.ok) {
      throw new Error(created.error.message);
    }

    await expect(handlers.handleListCategories(undefined)).resolves.toMatchObject({
      ok: true,
      data: [
        {
          name: "Finance",
          slug: "finance"
        }
      ]
    });
    await expect(
      handlers.handleAssignCategoryToProject({
        projectId: projectResult.data.project.id,
        categoryId: created.data.id
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        categoryId: created.data.id
      }
    });
    await expect(
      handlers.handleDeleteCategory(created.data.id)
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: created.data.id,
        deletedAt: expect.any(String)
      }
    });
  });
});

describe("Metadata browser IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("returns an error when no workspace is open", async () => {
    const handlers = createMetadataIpcHandlers({
      getCurrentWorkspace: () => null
    });

    await expect(
      handlers.handleListTagsWithCounts(undefined)
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_ERROR",
        message: "No workspace is open."
      }
    });
  });

  it("lists metadata counts and matching targets through the current workspace", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-metadata-"));
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
      name: "Tax Prep"
    });

    if (!projectResult.ok) {
      throw new Error(projectResult.error.message);
    }

    const connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });
    let idCounter = 0;
    const idFactory = (prefix: string): string => {
      idCounter += 1;
      return `${prefix}_metadata_${idCounter}`;
    };
    const createdItem = await new ItemService({
      connection,
      idFactory,
      now: () => new Date("2026-05-01T00:00:00.000Z")
    }).createItem({
      workspaceId: "workspace_1",
      containerId: projectResult.data.project.id,
      type: "task",
      title: "Send @finance forms"
    });
    await new TagService({
      connection,
      idFactory,
      now: () => new Date("2026-05-01T00:00:00.000Z")
    }).addTagToTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: createdItem.item.id,
      name: "finance"
    });
    connection.close();

    const handlers = createMetadataIpcHandlers(workspaceService);

    await expect(
      handlers.handleListTagsWithCounts(undefined)
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          slug: "finance",
          targetCount: 1
        }
      ]
    });
    await expect(
      handlers.handleListTargetsByMetadata({
        tagSlugs: ["finance"]
      })
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          targetId: "item_metadata_1",
          title: "Send @finance forms",
          tags: [
            {
              slug: "finance"
            }
          ]
        }
      ]
    });
  });
});

describe("Search IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("returns an error when no workspace is open", async () => {
    const handlers = createSearchIpcHandlers({
      getCurrentWorkspace: () => null
    });

    await expect(
      handlers.handleSearchWorkspace({ query: "launch" })
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_ERROR",
        message: "No workspace is open."
      }
    });
  });

  it("searches hydrated active records through the current workspace", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-search-"));
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
      name: "Launch Plan",
      description: "Supplier checklist"
    });

    if (!projectResult.ok) {
      throw new Error(projectResult.error.message);
    }

    const taskHandlers = createTaskIpcHandlers(workspaceService);
    const taskResult = await taskHandlers.handleCreateTask({
      containerId: projectResult.data.project.id,
      title: "Call launch supplier"
    });

    if (!taskResult.ok) {
      throw new Error(taskResult.error.message);
    }

    const handlers = createSearchIpcHandlers(workspaceService);

    await expect(
      handlers.handleSearchWorkspace({
        query: "supplier",
        kinds: ["task"]
      })
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          targetId: taskResult.data.id,
          kind: "task",
          title: "Call launch supplier",
          containerTitle: "Launch Plan",
          destinationPath: `/projects/${projectResult.data.project.id}`
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

describe("Item IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("returns an error when no workspace is open", async () => {
    const handlers = createItemIpcHandlers({
      getCurrentWorkspace: () => null
    });

    await expect(handlers.handleArchiveItem("item_1")).resolves.toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_ERROR",
        message: "No workspace is open."
      }
    });
  });

  it("moves, archives, soft-deletes, and inspects items", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-items-"));
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
    const sourceProject = await projectHandlers.handleCreateProject({
      name: "Launch Plan"
    });
    const targetProject = await projectHandlers.handleCreateProject({
      name: "Operations"
    });

    if (!sourceProject.ok || !targetProject.ok) {
      throw new Error("Project setup failed.");
    }

    const connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });
    await new ItemService({
      connection,
      idFactory: (prefix) => `${prefix}_test`,
      now: () => new Date("2026-05-01T00:00:00.000Z")
    }).createItem({
      workspaceId: "workspace_1",
      containerId: sourceProject.data.project.id,
      type: "note",
      title: "Move me"
    });
    connection.close();

    const handlers = createItemIpcHandlers(workspaceService);

    await expect(
      handlers.handleMoveItem({
        itemId: "item_test",
        targetContainerId: targetProject.data.project.id
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: "item_test",
        containerId: targetProject.data.project.id
      }
    });
    await expect(
      handlers.handleOpenItemInspector("item_test")
    ).resolves.toMatchObject({
      ok: true,
      data: {
        item: {
          id: "item_test"
        },
        activity: [
          {
            action: "item_moved"
          },
          {
            action: "item_created"
          }
        ]
      }
    });
    await expect(handlers.handleArchiveItem("item_test")).resolves.toMatchObject({
      ok: true,
      data: {
        status: "archived",
        archivedAt: expect.any(String)
      }
    });
    await expect(
      handlers.handleSoftDeleteItem("item_test")
    ).resolves.toMatchObject({
      ok: true,
      data: {
        deletedAt: expect.any(String)
      }
    });
  });
});

describe("List IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("returns an error when no workspace is open", async () => {
    const handlers = createListIpcHandlers({
      getCurrentWorkspace: () => null
    });

    await expect(
      handlers.handleListListsByContainer("container_1")
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_ERROR",
        message: "No workspace is open."
      }
    });
  });

  it("creates, edits, and lists checklist content", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-lists-"));
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

    const handlers = createListIpcHandlers(workspaceService);
    const createdList = await handlers.handleCreateList({
      containerId: projectResult.data.project.id,
      title: "Launch checklist"
    });

    if (!createdList.ok) {
      throw new Error(createdList.error.message);
    }

    expect(createdList).toMatchObject({
      ok: true,
      data: {
        type: "list",
        title: "Launch checklist",
        items: []
      }
    });

    const createdItem = await handlers.handleAddListItem({
      listId: createdList.data.id,
      title: "Confirm copy"
    });

    if (!createdItem.ok) {
      throw new Error(createdItem.error.message);
    }

    await expect(
      handlers.handleCompleteListItem(createdItem.data.id)
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: createdItem.data.id,
        status: "done"
      }
    });
    await expect(
      handlers.handleReopenListItem(createdItem.data.id)
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: createdItem.data.id,
        status: "open"
      }
    });
    await expect(
      handlers.handleBulkAddListItems({
        listId: createdList.data.id,
        text: "- Send update\n[x] Confirm brief"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          title: "Send update",
          status: "open"
        },
        {
          title: "Confirm brief",
          status: "done"
        }
      ]
    });

    await expect(
      handlers.handleListListsByContainer(projectResult.data.project.id)
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: createdList.data.id,
          title: "Launch checklist",
          items: [
            {
              title: "Confirm copy"
            },
            {
              title: "Send update"
            },
            {
              title: "Confirm brief"
            }
          ]
        }
      ]
    });
  });
});

describe("Note IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("returns an error when no workspace is open", async () => {
    const handlers = createNoteIpcHandlers({
      getCurrentWorkspace: () => null
    });

    await expect(
      handlers.handleListNotesByContainer("container_1")
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_ERROR",
        message: "No workspace is open."
      }
    });
  });

  it("creates, updates, and lists Markdown notes", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-notes-"));
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

    const handlers = createNoteIpcHandlers(workspaceService);
    const created = await handlers.handleCreateNote({
      containerId: projectResult.data.project.id,
      title: "Launch note",
      content: "# Brief\n\nConfirm @launch plan."
    });

    if (!created.ok) {
      throw new Error(created.error.message);
    }

    expect(created).toMatchObject({
      ok: true,
      data: {
        type: "note",
        title: "Launch note",
        content: "# Brief\n\nConfirm @launch plan.",
        preview: "Brief Confirm @launch plan."
      }
    });

    await expect(
      handlers.handleUpdateNote({
        itemId: created.data.id,
        title: "Final launch note",
        content: "## Decision\n\nProceed with launch."
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: created.data.id,
        title: "Final launch note",
        preview: "Decision Proceed with launch."
      }
    });

    await expect(
      handlers.handleListNotesByContainer(projectResult.data.project.id)
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: created.data.id,
          title: "Final launch note",
          content: "## Decision\n\nProceed with launch."
        }
      ]
    });
  });
});

describe("Task IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("returns an error when no workspace is open", async () => {
    const handlers = createTaskIpcHandlers({
      getCurrentWorkspace: () => null
    });

    await expect(
      handlers.handleListTasksByContainer("container_1")
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_ERROR",
        message: "No workspace is open."
      }
    });
  });

  it("creates, updates, completes, reopens, and lists tasks", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-tasks-"));
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

    const handlers = createTaskIpcHandlers(workspaceService);
    const created = await handlers.handleCreateTask({
      containerId: projectResult.data.project.id,
      title: "Book launch venue",
      dueAt: "2026-05-03"
    });

    if (!created.ok) {
      throw new Error(created.error.message);
    }

    expect(created).toMatchObject({
      ok: true,
      data: {
        type: "task",
        title: "Book launch venue",
        taskStatus: "open",
        dueAt: "2026-05-03T00:00:00.000Z"
      }
    });

    await expect(
      handlers.handleUpdateTask({
        itemId: created.data.id,
        dueAt: "2026-05-04"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: created.data.id,
        dueAt: "2026-05-04T00:00:00.000Z"
      }
    });
    await expect(
      handlers.handleCompleteTask(created.data.id)
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: created.data.id,
        taskStatus: "done"
      }
    });
    await expect(handlers.handleReopenTask(created.data.id)).resolves.toMatchObject({
      ok: true,
      data: {
        id: created.data.id,
        taskStatus: "open"
      }
    });
    const listResult = await handlers.handleListTasksByContainer(
      projectResult.data.project.id
    );

    if (!listResult.ok) {
      throw new Error(listResult.error.message);
    }

    expect(listResult).toMatchObject({
      ok: true,
      data: [
        {
          id: created.data.id,
          title: "Book launch venue",
          taskStatus: "open"
        }
      ]
    });
  });
});
