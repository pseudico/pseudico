import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDatabaseConnection,
  DEFAULT_APP_SETTINGS,
  DEFAULT_DASHBOARD_WIDGET_TYPES,
  MigrationService,
  resolveWorkspaceDatabasePath,
  WorkspaceSeedService,
  type DatabaseConnection
} from "../src";

let tempRoot: string;
let connection: DatabaseConnection | null;
let idCounter = 0;

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

describe("WorkspaceSeedService", () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-seed-"));
    connection = await createDatabaseConnection({
      databasePath: resolveWorkspaceDatabasePath(tempRoot)
    });
    new MigrationService({ connection }).runPendingMigrations();
    idCounter = 0;
  });

  afterEach(async () => {
    connection?.close();
    await rm(tempRoot, { force: true, recursive: true });
  });

  it("creates required system rows for a new workspace", () => {
    const result = createSeedService().ensureWorkspaceSeed({
      workspaceId: "workspace_1",
      workspaceName: "Personal Work",
      schemaVersion: 1
    });

    expect(result.workspace).toMatchObject({
      created: true,
      record: {
        id: "workspace_1",
        name: "Personal Work",
        schemaVersion: 1
      }
    });
    expect(result.systemInbox).toMatchObject({
      created: true,
      record: {
        type: "inbox",
        name: "Inbox",
        slug: "inbox",
        status: "active",
        isFavorite: true,
        isSystem: true
      }
    });
    expect(result.systemInboxDefaultTab).toMatchObject({
      created: true,
      record: {
        containerId: result.systemInbox.record.id,
        name: "Main",
        isDefault: true
      }
    });
    expect(result.defaultDashboard).toMatchObject({
      created: true,
      record: {
        name: "Dashboard",
        isDefault: true
      }
    });
    expect(result.defaultDashboardWidgets).toHaveLength(
      DEFAULT_DASHBOARD_WIDGET_TYPES.length
    );
    expect(result.defaultDashboardWidgets.every((widget) => widget.created)).toBe(
      true
    );
    expect(result.defaultDashboardWidgets.map((widget) => widget.record.type)).toEqual(
      [...DEFAULT_DASHBOARD_WIDGET_TYPES]
    );
    expect(result.defaultSettings.map((setting) => setting.record.settingKey)).toEqual(
      DEFAULT_APP_SETTINGS.map((setting) => setting.key)
    );
    expect(result.defaultSettings.every((setting) => setting.created)).toBe(true);
    expect(result.workspaceCreatedActivity).toMatchObject({
      created: true,
      record: {
        workspaceId: "workspace_1",
        actorType: "system",
        action: "workspace_created",
        targetType: "workspace",
        targetId: "workspace_1"
      }
    });
  });

  it("can be re-run without duplicating seed rows", () => {
    const service = createSeedService();

    service.ensureWorkspaceSeed({
      workspaceId: "workspace_1",
      workspaceName: "Personal Work",
      schemaVersion: 1
    });
    const secondRun = service.ensureWorkspaceSeed({
      workspaceId: "workspace_1",
      workspaceName: "Personal Work",
      schemaVersion: 1
    });

    expect(secondRun.workspace.created).toBe(false);
    expect(secondRun.systemInbox.created).toBe(false);
    expect(secondRun.systemInboxDefaultTab.created).toBe(false);
    expect(secondRun.defaultDashboard.created).toBe(false);
    expect(secondRun.defaultDashboardWidgets.every((widget) => widget.created)).toBe(
      false
    );
    expect(secondRun.defaultSettings.every((setting) => setting.created)).toBe(
      false
    );
    expect(secondRun.workspaceCreatedActivity.created).toBe(false);
    expect(countRows("workspaces")).toBe(1);
    expect(countRows("containers")).toBe(1);
    expect(countRows("container_tabs")).toBe(1);
    expect(countRows("dashboards")).toBe(1);
    expect(countRows("dashboard_widgets")).toBe(
      DEFAULT_DASHBOARD_WIDGET_TYPES.length
    );
    expect(countRows("app_settings")).toBe(DEFAULT_APP_SETTINGS.length);
    expect(countRows("activity_log")).toBe(1);
  });
});

function createSeedService(): WorkspaceSeedService {
  return new WorkspaceSeedService({
    connection: connection!,
    idFactory: nextId,
    now: () => new Date("2026-04-30T00:00:00.000Z")
  });
}

function countRows(tableName: string): number {
  const row = connection!.sqlite
    .prepare<[], { count: number }>(`select count(*) as count from ${tableName}`)
    .get();

  return row?.count ?? 0;
}
