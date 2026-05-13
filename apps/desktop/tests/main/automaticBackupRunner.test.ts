import { describe, expect, it } from "vitest";
import { apiOk } from "../../src/preload/api";
import { AutomaticBackupRunner } from "../../src/main/services/backup/AutomaticBackupRunner";

describe("AutomaticBackupRunner", () => {
  it("runs app-open and interval checks against the current workspace", async () => {
    const calls: unknown[] = [];
    let intervalCallback: (() => void) | null = null;
    const runner = new AutomaticBackupRunner({
      workspaceService: {
        getCurrentWorkspace: () => ({
          id: "workspace_1",
          name: "Personal",
          rootPath: "C:\\workspace",
          openedAt: "2026-05-13T00:00:00.000Z",
          schemaVersion: 1
        })
      },
      runBackupCheck: async (input) => {
        calls.push(input);
        return apiOk({ ok: true });
      },
      setIntervalFn: ((callback: () => void) => {
        intervalCallback = callback;
        return 1 as unknown as ReturnType<typeof setInterval>;
      }) as typeof setInterval,
      clearIntervalFn: (() => undefined) as typeof clearInterval
    });

    runner.start();
    await Promise.resolve();
    if (intervalCallback !== null) {
      const fireInterval = intervalCallback as () => void;
      fireInterval();
    }
    await Promise.resolve();

    expect(calls).toEqual([
      {
        workspaceId: "workspace_1",
        trigger: "app_open"
      },
      {
        workspaceId: "workspace_1",
        trigger: "interval"
      }
    ]);
  });

  it("does not run checks when no workspace is open", async () => {
    const calls: unknown[] = [];
    const runner = new AutomaticBackupRunner({
      workspaceService: {
        getCurrentWorkspace: () => null
      },
      runBackupCheck: async (input) => {
        calls.push(input);
        return apiOk({ ok: true });
      }
    });

    await expect(runner.runOnce("app_close")).resolves.toBeNull();
    expect(calls).toEqual([]);
  });
});
