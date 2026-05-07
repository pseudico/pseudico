import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ActivityLogRepository, type DatabaseConnection } from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("ActivityLogRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates and lists activity events", () => {
    const repository = new ActivityLogRepository(connection);

    const first = repository.create({
      id: "activity_1",
      workspaceId: "workspace_1",
      actorType: "local_user",
      action: "container_created",
      targetType: "container",
      targetId: "container_1",
      afterJson: JSON.stringify({ id: "container_1" }),
      timestamp: TEST_TIMESTAMP
    });
    const second = repository.create({
      id: "activity_2",
      workspaceId: "workspace_1",
      actorType: "local_user",
      action: "container_updated",
      targetType: "container",
      targetId: "container_1",
      beforeJson: JSON.stringify({ name: "Old" }),
      afterJson: JSON.stringify({ name: "New" }),
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(first).toMatchObject({
      action: "container_created",
      targetType: "container",
      targetId: "container_1"
    });
    expect(repository.listRecent("workspace_1", 1)).toEqual([second]);
    expect(repository.listForTarget("container", "container_1")).toEqual([
      second,
      first
    ]);
    expect(repository.listForTarget("container", "container_1", 1)).toEqual([
      second
    ]);
  });

  it("paginates recent activity with a descending cursor", () => {
    const repository = new ActivityLogRepository(connection);

    for (let index = 0; index < 6; index += 1) {
      repository.create({
        id: `activity_${index}`,
        workspaceId: "workspace_1",
        actorType: "local_user",
        action: "item_updated",
        targetType: "item",
        targetId: `item_${index}`,
        timestamp: `2026-05-01T0${index}:00:00.000Z`
      });
    }

    const firstPage = repository.listRecentPage("workspace_1", { limit: 3 });
    const secondPage = repository.listRecentPage("workspace_1", {
      limit: 3,
      cursor: firstPage.nextCursor
    });

    expect(firstPage.events.map((event) => event.id)).toEqual([
      "activity_5",
      "activity_4",
      "activity_3"
    ]);
    expect(firstPage.hasMore).toBe(true);
    expect(secondPage.events.map((event) => event.id)).toEqual([
      "activity_2",
      "activity_1",
      "activity_0"
    ]);
    expect(secondPage.hasMore).toBe(false);
  });
});
