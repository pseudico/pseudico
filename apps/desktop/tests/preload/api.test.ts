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

    expect(channels).toHaveLength(33);
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
});
