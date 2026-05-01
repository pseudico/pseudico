import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ContainerTabRepository,
  ItemRepository,
  type DatabaseConnection
} from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("ItemRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    const containers = new ContainerRepository(connection);
    containers.create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: TEST_TIMESTAMP
    });
    containers.create({
      id: "container_project_2",
      workspaceId: "workspace_1",
      type: "project",
      name: "Operations",
      slug: "operations",
      timestamp: TEST_TIMESTAMP
    });
    new ContainerTabRepository(connection).ensureDefaultTab({
      id: "tab_default_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      timestamp: TEST_TIMESTAMP
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates and lists items in a container", () => {
    const repository = new ItemRepository(connection);

    const item = repository.create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      containerTabId: "tab_default_1",
      type: "note",
      title: "Kickoff note",
      body: "Agenda",
      pinned: true,
      timestamp: TEST_TIMESTAMP
    });

    expect(item).toMatchObject({
      id: "item_1",
      type: "note",
      title: "Kickoff note",
      body: "Agenda",
      pinned: true,
      status: "active"
    });
    expect(repository.getById("item_1")).toEqual(item);
    expect(repository.listByContainer("container_project_1")).toEqual([item]);
    expect(
      repository.listByContainerTab(
        "container_project_1",
        "tab_default_1"
      )
    ).toEqual([item]);
  });

  it("updates and moves an item between containers", () => {
    const repository = new ItemRepository(connection);
    repository.create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "task",
      title: "Call supplier",
      timestamp: TEST_TIMESTAMP
    });

    const updated = repository.update("item_1", {
      title: "Call supplier today",
      status: "waiting",
      completedAt: null,
      timestamp: TEST_TIMESTAMP_LATER
    });
    const moved = repository.move({
      id: "item_1",
      targetContainerId: "container_project_2",
      targetTabId: null,
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(updated).toMatchObject({
      title: "Call supplier today",
      status: "waiting"
    });
    expect(moved).toMatchObject({
      containerId: "container_project_2",
      containerTabId: null,
      updatedAt: TEST_TIMESTAMP_LATER
    });
    expect(repository.listByContainer("container_project_1")).toEqual([]);
    expect(repository.listByContainer("container_project_2")).toEqual([moved]);
  });

  it("allocates append sort order within container and tab scopes", () => {
    const repository = new ItemRepository(connection);
    repository.create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      containerTabId: "tab_default_1",
      type: "note",
      title: "First",
      sortOrder: 1024,
      timestamp: TEST_TIMESTAMP
    });
    repository.create({
      id: "item_2",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "note",
      title: "Second",
      sortOrder: 2048,
      timestamp: TEST_TIMESTAMP
    });

    expect(repository.getMaxSortOrder({
      containerId: "container_project_1"
    })).toBe(2048);
    expect(repository.getMaxSortOrder({
      containerId: "container_project_1",
      containerTabId: "tab_default_1"
    })).toBe(1024);
    expect(repository.getMaxSortOrder({
      containerId: "container_project_2"
    })).toBeNull();
  });

  it("archives and soft deletes items while default lists exclude them", () => {
    const repository = new ItemRepository(connection);
    repository.create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "task",
      title: "Call supplier",
      timestamp: TEST_TIMESTAMP
    });
    repository.create({
      id: "item_2",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "note",
      title: "Draft",
      timestamp: TEST_TIMESTAMP
    });

    const archived = repository.archive("item_1", TEST_TIMESTAMP_LATER);
    const deleted = repository.softDelete("item_2", TEST_TIMESTAMP_LATER);

    expect(archived.archivedAt).toBe(TEST_TIMESTAMP_LATER);
    expect(deleted.deletedAt).toBe(TEST_TIMESTAMP_LATER);
    expect(repository.getById("item_2")).toBeNull();
    expect(repository.listByContainer("container_project_1")).toEqual([]);
    expect(
      repository.listByContainer("container_project_1", {
        includeArchived: true,
        includeDeleted: true
      })
    ).toHaveLength(2);
  });
});
