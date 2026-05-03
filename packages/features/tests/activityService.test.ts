import {
  ActivityLogRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ActivityService,
  formatActivityEvent,
  formatActionLabel
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;

describe("ActivityService", () => {
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
      timestamp: "2026-05-01T00:00:00.000Z"
    });
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("lists recent workspace activity as formatted rows", () => {
    const repository = new ActivityLogRepository(connection);
    repository.create({
      id: "activity_1",
      workspaceId: "workspace_1",
      actorType: "local_user",
      action: "container_created",
      targetType: "container",
      targetId: "container_1",
      summary: "Created project.",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    repository.create({
      id: "activity_2",
      workspaceId: "workspace_1",
      actorType: "system",
      action: "item_updated",
      targetType: "item",
      targetId: "item_1",
      timestamp: "2026-05-01T01:00:00.000Z"
    });

    expect(new ActivityService({ connection }).listRecentActivity("workspace_1")).toMatchObject([
      {
        id: "activity_2",
        actionLabel: "Item Updated",
        actorLabel: "System",
        targetLabel: "Item item_1",
        description: "System recorded item updated for Item item_1."
      },
      {
        id: "activity_1",
        actionLabel: "Container Created",
        actorLabel: "Local user",
        description: "Created project."
      }
    ]);
  });

  it("lists target activity with a bounded limit", () => {
    const repository = new ActivityLogRepository(connection);
    repository.create({
      id: "activity_1",
      workspaceId: "workspace_1",
      actorType: "local_user",
      action: "item_created",
      targetType: "item",
      targetId: "item_1",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    repository.create({
      id: "activity_2",
      workspaceId: "workspace_1",
      actorType: "local_user",
      action: "item_updated",
      targetType: "item",
      targetId: "item_1",
      timestamp: "2026-05-01T01:00:00.000Z"
    });

    expect(
      new ActivityService({ connection }).listActivityForTarget(
        "item",
        "item_1",
        1
      )
    ).toMatchObject([{ id: "activity_2", actionLabel: "Item Updated" }]);
  });

  it("formats raw events without mutating the source record", () => {
    const event = {
      id: "activity_1",
      workspaceId: "workspace_1",
      actorType: "importer",
      action: "container_updated",
      targetType: "container",
      targetId: "container_1",
      summary: null,
      beforeJson: null,
      afterJson: null,
      createdAt: "2026-05-01T00:00:00.000Z"
    };

    expect(formatActionLabel("container_updated")).toBe("Container Updated");
    expect(formatActivityEvent(event)).toMatchObject({
      actionLabel: "Container Updated",
      actorLabel: "Importer",
      targetLabel: "Container container_1"
    });
    expect(event).not.toHaveProperty("actionLabel");
  });
});
