import { describe, expect, it } from "vitest";
import {
  apiOk,
  type ApiResult,
  type CategorySummary,
  type DatabaseHealthStatus,
  type InboxSummary,
  type IpcModuleStatus,
  type ItemSummary,
  type ListItemSummary,
  type ListSummary,
  type LocalWorkOsApi,
  type MetadataTargetSummary,
  type NoteSummary,
  type ProjectSummary,
  type RecentWorkspace,
  type TaskSummary,
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
      listByContainer: async () => apiOk([taskSummary()]),
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
          completedAt: "2026-04-30T01:00:00.000Z"
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
    categories: {
      create: async () => apiOk(categorySummary()),
      update: async () => apiOk(categorySummary()),
      delete: async () =>
        apiOk({
          ...categorySummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      list: async () => apiOk([categorySummary()]),
      assignToProject: async () =>
        apiOk({
          ...projectSummary(),
          categoryId: "category_1"
        }),
      assignToItem: async () =>
        apiOk({
          ...itemSummary(),
          categoryId: "category_1"
        }),
      createCategory: async () => apiOk(categorySummary()),
      updateCategory: async () => apiOk(categorySummary()),
      deleteCategory: async () =>
        apiOk({
          ...categorySummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      listCategories: async () => apiOk([categorySummary()])
    },
    metadata: {
      listTagsWithCounts: async () =>
        apiOk([
          {
            id: "tag_1",
            workspaceId: "workspace_1",
            name: "Finance",
            slug: "finance",
            createdAt: "2026-04-30T00:00:00.000Z",
            updatedAt: "2026-04-30T00:00:00.000Z",
            deletedAt: null,
            targetCount: 2
          }
        ]),
      listCategoriesWithCounts: async () =>
        apiOk([
          {
            ...categorySummary(),
            targetCount: 2
          }
        ]),
      listTargetsByMetadata: async () => apiOk([metadataTargetSummary()])
    },
    containers: {
      getStatus: async () => apiOk(moduleStatus("containers"))
    },
    items: {
      getStatus: async () => apiOk(moduleStatus("items")),
      move: async () =>
        apiOk({
          ...itemSummary(),
          containerId: "container_1"
        }),
      archive: async () =>
        apiOk({
          ...itemSummary(),
          status: "archived",
          archivedAt: "2026-04-30T01:00:00.000Z"
        }),
      softDelete: async () =>
        apiOk({
          ...itemSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      getActivity: async () =>
        apiOk([
          {
            id: "activity_1",
            workspaceId: "workspace_1",
            actorType: "local_user",
            action: "item_moved",
            targetType: "item",
            targetId: "item_1",
            summary: "Moved item.",
            beforeJson: null,
            afterJson: null,
            createdAt: "2026-04-30T01:00:00.000Z"
          }
        ]),
      openInspector: async () =>
        apiOk({
          item: itemSummary(),
          activity: []
        }),
      moveItem: async () =>
        apiOk({
          ...itemSummary(),
          containerId: "container_1"
        }),
      archiveItem: async () =>
        apiOk({
          ...itemSummary(),
          status: "archived",
          archivedAt: "2026-04-30T01:00:00.000Z"
        }),
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

  return {
    ...api,
    ...overrides
  };
}

function categorySummary(): CategorySummary {
  return {
    id: "category_1",
    workspaceId: "workspace_1",
    name: "Finance",
    slug: "finance",
    color: "#2c6b8f",
    description: null,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
    deletedAt: null
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

function taskSummary(): TaskSummary {
  return {
    ...itemSummary(),
    type: "task",
    taskStatus: "open",
    priority: null,
    startAt: null,
    dueAt: null,
    allDay: true,
    timezone: null,
    taskCompletedAt: null,
    taskCreatedAt: "2026-04-30T00:00:00.000Z",
    taskUpdatedAt: "2026-04-30T00:00:00.000Z"
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
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
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
    listCreatedAt: "2026-04-30T00:00:00.000Z",
    listUpdatedAt: "2026-04-30T00:00:00.000Z",
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
    noteCreatedAt: "2026-04-30T00:00:00.000Z",
    noteUpdatedAt: "2026-04-30T00:00:00.000Z"
  };
}

function metadataTargetSummary(): MetadataTargetSummary {
  return {
    targetType: "item",
    targetId: "item_1",
    workspaceId: "workspace_1",
    kind: "task",
    title: "Call accountant",
    body: null,
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
        name: "Finance",
        slug: "finance",
        source: "manual"
      }
    ],
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
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
    await expect(client.tasks.listByContainer("container_1")).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "item_1",
          taskStatus: "open"
        }
      ]
    });
    await expect(client.lists.listByContainer("container_1")).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "item_list_1",
          items: [
            {
              id: "list_item_1"
            }
          ]
        }
      ]
    });
    await expect(client.notes.listByContainer("container_1")).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "item_note_1",
          type: "note",
          content: "# Decision notes"
        }
      ]
    });
    await expect(client.categories.list()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "category_1",
          name: "Finance"
        }
      ]
    });
    await expect(
      client.categories.assignToProject({
        projectId: "container_1",
        categoryId: "category_1"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        categoryId: "category_1"
      }
    });
    await expect(client.metadata.listTagsWithCounts()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          slug: "finance",
          targetCount: 2
        }
      ]
    });
    await expect(
      client.metadata.listTargetsByMetadata({
        tagSlugs: ["finance"]
      })
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          targetId: "item_1",
          tags: [
            {
              slug: "finance"
            }
          ]
        }
      ]
    });
    await expect(
      client.items.move({
        itemId: "item_1",
        targetContainerId: "container_1"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: "item_1",
        containerId: "container_1"
      }
    });
    await expect(client.items.archive("item_1")).resolves.toMatchObject({
      ok: true,
      data: {
        status: "archived"
      }
    });
    await expect(client.items.getActivity("item_1")).resolves.toMatchObject({
      ok: true,
      data: [
        {
          action: "item_moved"
        }
      ]
    });
    await expect(client.items.openInspector("item_1")).resolves.toMatchObject({
      ok: true,
      data: {
        item: {
          id: "item_1"
        }
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
