import { createDatabaseConnection, MigrationService } from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ActivityLogRepository,
  ContainerRepository,
  ContainerTabRepository,
  WorkspaceRepository,
  type DatabaseConnection
} from "@local-work-os/db";
import { CreateContainerCommand } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("CreateContainerCommand", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("creates a container, default tab, and activity event in one command", async () => {
    const result = await createCommand().execute({
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      description: "Project notes"
    });

    expect(result.container).toMatchObject({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      description: "Project notes"
    });
    expect(result.defaultTab).toMatchObject({
      id: "container_tab_2",
      containerId: "container_1",
      name: "Main",
      isDefault: true
    });
    expect(new ContainerRepository(connection).getById("container_1")).toEqual(
      result.container
    );
    expect(new ContainerTabRepository(connection).findDefaultTab("container_1"))
      .toEqual(result.defaultTab);

    const events = new ActivityLogRepository(connection).listForTarget(
      "container",
      "container_1"
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "activity_3",
      action: "container_created",
      targetType: "container",
      targetId: "container_1"
    });
  });

  it("rolls back the container when activity logging fails", async () => {
    await expect(
      createCommand().execute({
        workspaceId: "workspace_1",
        type: "project",
        name: "Broken Project",
        slug: "broken-project",
        actorType: "invalid_actor" as "local_user"
      })
    ).rejects.toThrow();

    expect(new ContainerRepository(connection).listByWorkspace("workspace_1"))
      .toEqual([]);
    expect(countRows("container_tabs")).toBe(0);
    expect(countRows("activity_log")).toBe(0);
  });
});

function createCommand(): CreateContainerCommand {
  return new CreateContainerCommand({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-04-30T00:00:00.000Z")
  });
}

function countRows(tableName: string): number {
  const row = connection.sqlite
    .prepare<[], { count: number }>(`select count(*) as count from ${tableName}`)
    .get();

  return row?.count ?? 0;
}

