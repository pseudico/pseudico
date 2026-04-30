import { ActivityAction } from "@local-work-os/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ActivityLogRepository,
  ActivityLogService,
  type DatabaseConnection
} from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("ActivityLogService", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("logs typed activity events", () => {
    const service = new ActivityLogService({
      connection,
      idFactory: (prefix) => `${prefix}_1`
    });

    const event = service.logEvent({
      workspaceId: "workspace_1",
      actorType: "local_user",
      action: ActivityAction.containerCreated,
      targetType: "container",
      targetId: "container_1",
      summary: "Created project container.",
      beforeJson: null,
      afterJson: JSON.stringify({ id: "container_1" }),
      timestamp: TEST_TIMESTAMP
    });

    expect(event).toMatchObject({
      id: "activity_1",
      workspaceId: "workspace_1",
      actorType: "local_user",
      action: "container_created",
      targetType: "container",
      targetId: "container_1",
      summary: "Created project container.",
      beforeJson: null,
      afterJson: JSON.stringify({ id: "container_1" }),
      createdAt: TEST_TIMESTAMP
    });
    expect(
      new ActivityLogRepository(connection).listForTarget("container", "container_1")
    ).toEqual([event]);
  });
});
