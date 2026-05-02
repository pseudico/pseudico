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

    expect(channels).toHaveLength(18);
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
});
