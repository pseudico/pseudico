import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AppSettingsRepository,
  DatabaseBootstrapService,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath
} from "@local-work-os/db";
import {
  APP_TABS_SETTING_KEY,
  RECENT_NAVIGATION_TARGETS_SETTING_KEY
} from "@local-work-os/features";
import { afterEach, describe, expect, it } from "vitest";
import { createNavigationIpcHandlers } from "../../src/main/ipc/navigationHandlers";

describe("navigation IPC app tab handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("persists app tabs and records recent history for opened targets", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-app-tabs-ipc-"));
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);
    await new DatabaseBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });
    const handlers = createNavigationIpcHandlers({
      getCurrentWorkspace: () => ({
        id: "workspace_1",
        name: "Personal",
        rootPath: tempRoot!,
        openedAt: "2026-05-09T04:00:00.000Z",
        schemaVersion: 1
      })
    });

    const openedProject = await handlers.handleOpenAppTab({
      workspaceId: "workspace_1",
      target: {
        targetType: "container",
        targetId: "project_1",
        path: "/projects/project_1",
        label: "Project",
        subtitle: "Recently opened project"
      }
    });
    const openedSearch = await handlers.handleOpenAppTab({
      workspaceId: "workspace_1",
      target: {
        targetType: "view",
        targetId: "search",
        path: "/search?q=launch",
        label: "Search",
        subtitle: "Local search"
      }
    });

    expect(openedProject).toMatchObject({
      ok: true,
      data: {
        workspaceId: "workspace_1",
        tabs: [{ path: "/projects/project_1" }]
      }
    });
    expect(openedSearch).toMatchObject({
      ok: true,
      data: {
        tabs: [
          { path: "/projects/project_1" },
          { path: "/search?q=launch" }
        ]
      }
    });

    if (!openedSearch.ok) {
      throw new Error(openedSearch.error.message);
    }

    const reordered = await handlers.handleReorderAppTabs({
      workspaceId: "workspace_1",
      tabIds: openedSearch.data.tabs.map((tab) => tab.id).reverse()
    });

    expect(reordered).toMatchObject({
      ok: true,
      data: {
        tabs: [{ path: "/search?q=launch" }, { path: "/projects/project_1" }]
      }
    });

    const connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    try {
      const settings = new AppSettingsRepository(connection);
      expect(
        settings.findByKey({
          workspaceId: "workspace_1",
          settingKey: APP_TABS_SETTING_KEY
        })
      ).not.toBeNull();
      expect(
        settings.findByKey({
          workspaceId: "workspace_1",
          settingKey: RECENT_NAVIGATION_TARGETS_SETTING_KEY
        })
      ).not.toBeNull();
    } finally {
      connection.close();
    }
  });
});
