import { describe, expect, it } from "vitest";
import {
  apiOk,
  createLocalWorkOsApi,
  LOCAL_WORK_OS_IPC_CHANNELS,
  type LocalWorkOsIpcChannel,
  type LocalWorkOsIpcInput,
  type LocalWorkOsIpcInvoke,
  type LocalWorkOsIpcResult
} from "../../src/preload/api";

function allChannelValues(): string[] {
  return Object.values(LOCAL_WORK_OS_IPC_CHANNELS).flatMap((group) =>
    Object.values(group)
  );
}

describe("typed preload API", () => {
  it("keeps IPC channels centralized and unique", () => {
    const channels = allChannelValues();

    expect(channels).toHaveLength(48);
    expect(new Set(channels).size).toBe(channels.length);
    expect(channels.every((channel) => channel.startsWith("local-work-os:"))).toBe(
      true
    );
  });

  it("exposes only typed API groups instead of raw IPC primitives", () => {
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      void input;

      return Promise.resolve(
        channel === LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace
          ? apiOk(null)
          : apiOk([])
      ) as Promise<LocalWorkOsIpcResult<Channel>>;
    };

    const api = createLocalWorkOsApi(invoke);

    expect(Object.keys(api)).toEqual([
      "workspace",
      "database",
      "inbox",
      "tasks",
      "lists",
      "notes",
      "projects",
      "categories",
      "metadata",
      "search",
      "containers",
      "items",
      "files"
    ]);
    expect("ipcRenderer" in api).toBe(false);
    expect("send" in api).toBe(false);
    expect("invoke" in api).toBe(false);
  });

  it("routes workspace calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.workspace.getCurrentWorkspace();

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace,
        input: undefined
      }
    ]);
  });

  it("routes workspace validation through its named channel", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.workspace.validateWorkspace({
      rootPath: "C:\\work",
      repair: true
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.workspace.validateWorkspace,
        input: {
          rootPath: "C:\\work",
          repair: true
        }
      }
    ]);
  });

  it("routes project calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.projects.createProject({
      workspaceId: "workspace_1",
      name: "Launch Plan"
    });
    await api.projects.archiveProject("container_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject,
        input: {
          workspaceId: "workspace_1",
          name: "Launch Plan"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject,
        input: "container_1"
      }
    ]);
  });

  it("routes Inbox calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.inbox.listItems("workspace_1");
    await api.inbox.moveItemToProject({
      itemId: "item_1",
      projectId: "container_1"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.inbox.listItems,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.inbox.moveItemToProject,
        input: {
          itemId: "item_1",
          projectId: "container_1"
        }
      }
    ]);
  });

  it("routes item lifecycle calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.items.move({
      itemId: "item_1",
      targetContainerId: "container_2"
    });
    await api.items.archive("item_1");
    await api.items.softDelete("item_1");
    await api.items.getActivity("item_1");
    await api.items.openInspector("item_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.items.moveItem,
        input: {
          itemId: "item_1",
          targetContainerId: "container_2"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.items.archiveItem,
        input: "item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.items.softDeleteItem,
        input: "item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.items.getItemActivity,
        input: "item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.items.openItemInspector,
        input: "item_1"
      }
    ]);
  });

  it("routes task calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.tasks.create({
      workspaceId: "workspace_1",
      containerId: "container_1",
      title: "Call supplier"
    });
    await api.tasks.update({
      itemId: "item_1",
      dueAt: "2026-05-04"
    });
    await api.tasks.complete("item_1");
    await api.tasks.reopen("item_1");
    await api.tasks.listByContainer("container_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask,
        input: {
          workspaceId: "workspace_1",
          containerId: "container_1",
          title: "Call supplier"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask,
        input: {
          itemId: "item_1",
          dueAt: "2026-05-04"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask,
        input: "item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask,
        input: "item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.tasks.listByContainer,
        input: "container_1"
      }
    ]);
  });

  it("routes list calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.lists.create({
      workspaceId: "workspace_1",
      containerId: "container_1",
      title: "Launch checklist"
    });
    await api.lists.addItem({
      listId: "item_list_1",
      title: "Confirm copy"
    });
    await api.lists.completeItem("list_item_1");
    await api.lists.reopenItem("list_item_1");
    await api.lists.bulkAddItems({
      listId: "item_list_1",
      text: "- Confirm copy"
    });
    await api.lists.listByContainer("container_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.createList,
        input: {
          workspaceId: "workspace_1",
          containerId: "container_1",
          title: "Launch checklist"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.addItem,
        input: {
          listId: "item_list_1",
          title: "Confirm copy"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.completeItem,
        input: "list_item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.reopenItem,
        input: "list_item_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.bulkAddItems,
        input: {
          listId: "item_list_1",
          text: "- Confirm copy"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.lists.listByContainer,
        input: "container_1"
      }
    ]);
  });

  it("routes note calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.notes.create({
      workspaceId: "workspace_1",
      containerId: "container_1",
      title: "Launch note",
      content: "# Brief"
    });
    await api.notes.update({
      itemId: "item_note_1",
      content: "Updated note"
    });
    await api.notes.listByContainer("container_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.notes.createNote,
        input: {
          workspaceId: "workspace_1",
          containerId: "container_1",
          title: "Launch note",
          content: "# Brief"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.notes.updateNote,
        input: {
          itemId: "item_note_1",
          content: "Updated note"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.notes.listByContainer,
        input: "container_1"
      }
    ]);
  });

  it("routes category calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk(null)) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.categories.createCategory({
      workspaceId: "workspace_1",
      name: "Operations",
      color: "#3b82f6"
    });
    await api.categories.updateCategory({
      categoryId: "category_1",
      name: "Client Work"
    });
    await api.categories.assignToProject({
      projectId: "container_1",
      categoryId: "category_1"
    });
    await api.categories.assignToItem({
      itemId: "item_1",
      categoryId: null
    });
    await api.categories.listCategories("workspace_1");
    await api.categories.deleteCategory("category_1");

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.createCategory,
        input: {
          workspaceId: "workspace_1",
          name: "Operations",
          color: "#3b82f6"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.updateCategory,
        input: {
          categoryId: "category_1",
          name: "Client Work"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToProject,
        input: {
          projectId: "container_1",
          categoryId: "category_1"
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToItem,
        input: {
          itemId: "item_1",
          categoryId: null
        }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.listCategories,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.categories.deleteCategory,
        input: "category_1"
      }
    ]);
  });

  it("routes metadata browser calls through their named channels", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.metadata.listTagsWithCounts("workspace_1");
    await api.metadata.listCategoriesWithCounts("workspace_1");
    await api.metadata.listTargetsByMetadata({
      workspaceId: "workspace_1",
      tagSlugs: ["finance"],
      categoryId: "category_1"
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTagsWithCounts,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.metadata.listCategoriesWithCounts,
        input: "workspace_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTargetsByMetadata,
        input: {
          workspaceId: "workspace_1",
          tagSlugs: ["finance"],
          categoryId: "category_1"
        }
      }
    ]);
  });

  it("routes search calls through their named channel", async () => {
    const calls: { channel: string; input: unknown }[] = [];
    const invoke: LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
      channel: Channel,
      input: LocalWorkOsIpcInput<Channel>
    ) => {
      calls.push({ channel, input });
      return Promise.resolve(apiOk([])) as Promise<
        LocalWorkOsIpcResult<Channel>
      >;
    };

    const api = createLocalWorkOsApi(invoke);
    await api.search.searchWorkspace({
      workspaceId: "workspace_1",
      query: "launch",
      kinds: ["project", "task"]
    });

    expect(calls).toEqual([
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.search.searchWorkspace,
        input: {
          workspaceId: "workspace_1",
          query: "launch",
          kinds: ["project", "task"]
        }
      }
    ]);
  });
});
