import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ContainerTabRepository,
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

describe("ContainerTabRepository", () => {
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

  it("creates and lists tabs for a container", () => {
    const repository = new ContainerTabRepository(connection);

    const tab = repository.create({
      id: "tab_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      name: "Research",
      description: "Notes and references",
      sortOrder: 1,
      timestamp: TEST_TIMESTAMP
    });

    expect(tab).toMatchObject({
      containerId: "container_project_1",
      name: "Research",
      description: "Notes and references",
      sortOrder: 1,
      isDefault: false
    });
    expect(repository.listByContainer("container_project_1")).toEqual([tab]);
  });

  it("ensures one default tab without duplicating it", () => {
    const repository = new ContainerTabRepository(connection);

    const first = repository.ensureDefaultTab({
      id: "tab_default_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      timestamp: TEST_TIMESTAMP
    });
    const second = repository.ensureDefaultTab({
      id: "tab_default_2",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      timestamp: TEST_TIMESTAMP
    });

    expect(first).toMatchObject({
      name: "Main",
      isDefault: true
    });
    expect(second).toEqual(first);
    expect(repository.listByContainer("container_project_1")).toHaveLength(1);
  });

  it("updates order and soft-deletes active tabs", () => {
    const repository = new ContainerTabRepository(connection);
    const first = repository.create({
      id: "tab_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      name: "Research",
      sortOrder: 0,
      timestamp: TEST_TIMESTAMP
    });
    const second = repository.create({
      id: "tab_2",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      name: "Delivery",
      sortOrder: 1,
      timestamp: TEST_TIMESTAMP
    });

    const updated = repository.update(first.id, {
      name: "Discovery",
      description: "Scope notes",
      sortOrder: 2,
      timestamp: "2026-05-01T01:00:00.000Z"
    });
    const deleted = repository.softDelete(second.id, "2026-05-01T02:00:00.000Z");

    expect(updated).toMatchObject({
      id: "tab_1",
      name: "Discovery",
      description: "Scope notes",
      sortOrder: 2,
      updatedAt: "2026-05-01T01:00:00.000Z"
    });
    expect(deleted).toMatchObject({
      id: "tab_2",
      deletedAt: "2026-05-01T02:00:00.000Z"
    });
    expect(repository.listByContainer("container_project_1")).toEqual([updated]);
    expect(repository.countActiveByContainer("container_project_1")).toBe(1);
  });
});
