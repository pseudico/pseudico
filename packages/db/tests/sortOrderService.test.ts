import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ItemRepository,
  SortOrderService,
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

describe("SortOrderService", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: TEST_TIMESTAMP
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("returns stable append sort orders for item feeds", () => {
    const service = new SortOrderService({ connection });

    expect(service.getNextItemSortOrder({
      containerId: "container_project_1"
    })).toBe(1024);

    new ItemRepository(connection).create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "task",
      title: "Call supplier",
      sortOrder: 1024,
      timestamp: TEST_TIMESTAMP
    });

    expect(service.getNextItemSortOrder({
      containerId: "container_project_1"
    })).toBe(2048);
  });
});
