import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDatabaseConnection,
  DatabaseBootstrapService,
  DEFAULT_APP_SETTINGS,
  DEFAULT_DASHBOARD_WIDGET_TYPES,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "../src";

let tempRoot: string;
let connection: DatabaseConnection | null;
let idCounter = 0;

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

describe("DatabaseBootstrapService", () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-bootstrap-"));
    connection = null;
    idCounter = 0;
  });

  afterEach(async () => {
    connection?.close();
    await rm(tempRoot, { force: true, recursive: true });
  });

  it("runs migrations and seeds an empty workspace database", async () => {
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);
    const result = await createBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal Work"
    });

    expect(result).toMatchObject({
      databasePath,
      workspaceId: "workspace_1",
      schemaVersion: 1,
      migrations: {
        currentVersion: 1
      },
      seed: {
        workspace: {
          created: true
        },
        systemInbox: {
          created: true
        },
        defaultDashboard: {
          created: true
        },
        workspaceCreatedActivity: {
          created: true
        }
      }
    });
    expect(result.migrations.appliedMigrations).toHaveLength(1);

    connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    expect(readOne("workspaces")).toMatchObject({
      id: "workspace_1",
      name: "Personal Work",
      schema_version: 1
    });
    expect(readOne("containers")).toMatchObject({
      workspace_id: "workspace_1",
      type: "inbox",
      name: "Inbox",
      slug: "inbox",
      status: "active",
      is_system: 1
    });
    expect(readOne("dashboards")).toMatchObject({
      workspace_id: "workspace_1",
      name: "Dashboard",
      is_default: 1
    });
    expect(countRows("dashboard_widgets")).toBe(
      DEFAULT_DASHBOARD_WIDGET_TYPES.length
    );
    expect(countRows("app_settings")).toBe(DEFAULT_APP_SETTINGS.length);
    expect(readOne("activity_log")).toMatchObject({
      workspace_id: "workspace_1",
      actor_type: "system",
      action: "workspace_created",
      target_type: "workspace",
      target_id: "workspace_1"
    });
  });

  it("is idempotent when bootstrap runs more than once", async () => {
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);
    const service = createBootstrapService();

    await service.bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal Work"
    });
    const secondRun = await service.bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal Work"
    });

    expect(secondRun.migrations.appliedMigrations).toHaveLength(0);
    expect(secondRun.seed.workspace.created).toBe(false);
    expect(secondRun.seed.systemInbox.created).toBe(false);
    expect(secondRun.seed.systemInboxDefaultTab.created).toBe(false);
    expect(secondRun.seed.defaultDashboard.created).toBe(false);
    expect(
      secondRun.seed.defaultDashboardWidgets.every((widget) => widget.created)
    ).toBe(false);
    expect(secondRun.seed.defaultSettings.every((setting) => setting.created)).toBe(
      false
    );
    expect(secondRun.seed.workspaceCreatedActivity.created).toBe(false);

    connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

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

function createBootstrapService(): DatabaseBootstrapService {
  return new DatabaseBootstrapService({
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

function readOne(tableName: string): Record<string, unknown> | undefined {
  return connection!.sqlite.prepare<[], Record<string, unknown>>(
    `select * from ${tableName}`
  ).get();
}
