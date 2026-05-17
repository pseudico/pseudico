import { describe, expect, it, vi, beforeEach } from "vitest";
import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../src/preload/api";

const electronMock = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, input: unknown) => Promise<unknown> | unknown>(),
  removeHandler: vi.fn(),
  handle: vi.fn((channel: string, handler: (event: unknown, input: unknown) => Promise<unknown> | unknown) => {
    electronMock.handlers.set(channel, handler);
  })
}));

vi.mock("electron", () => ({
  ipcMain: {
    removeHandler: electronMock.removeHandler,
    handle: electronMock.handle
  }
}));

import { registerContainerIpc } from "../../src/main/ipc/registerContainerIpc";

describe("container IPC registration", () => {
  beforeEach(() => {
    electronMock.handlers.clear();
    electronMock.removeHandler.mockClear();
    electronMock.handle.mockClear();
  });

  it("forwards invoke input instead of the Electron event to container preference handlers", async () => {
    registerContainerIpc({ getCurrentWorkspace: () => null });

    const cases = [
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.containers.getPreferences,
        input: "container_1"
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.containers.updatePreferences,
        input: { containerId: "container_1", showCompleted: true }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.containers.getGrouping,
        input: { workspaceId: "workspace_1", containerType: "project" }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.containers.getGroupingPreferences,
        input: { workspaceId: "workspace_1", containerType: "project" }
      },
      {
        channel: LOCAL_WORK_OS_IPC_CHANNELS.containers.updateGroupingPreferences,
        input: { workspaceId: "workspace_1", containerType: "project", mode: "none" }
      }
    ] as const;

    for (const { channel, input } of cases) {
      const handler = electronMock.handlers.get(channel);
      expect(handler, channel).toBeDefined();

      const result = await handler?.({ sender: "fake-event" }, input);

      expect(result).toMatchObject({
        ok: false,
        error: {
          code: "WORKSPACE_ERROR",
          message: "No workspace is open."
        }
      });
    }
  });
});

