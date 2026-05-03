import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CategoryRepository,
  ContainerRepository,
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

describe("CategoryRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates, lists, updates, and soft-deletes categories", () => {
    const repository = new CategoryRepository(connection);

    const created = repository.create({
      id: "category_1",
      workspaceId: "workspace_1",
      name: "Finance",
      slug: "finance",
      color: "#2c6b8f",
      description: "Money work",
      timestamp: TEST_TIMESTAMP
    });
    const updated = repository.update(created.id, {
      name: "Admin",
      slug: "admin",
      color: "#c08a2c",
      description: null,
      timestamp: TEST_TIMESTAMP_LATER
    });
    const deleted = repository.softDelete(created.id, TEST_TIMESTAMP_LATER);

    expect(repository.findBySlug({
      workspaceId: "workspace_1",
      slug: "finance"
    })).toBeNull();
    expect(updated).toMatchObject({
      name: "Admin",
      slug: "admin",
      color: "#c08a2c",
      description: null
    });
    expect(repository.listByWorkspace("workspace_1")).toEqual([]);
    expect(deleted.deletedAt).toBe(TEST_TIMESTAMP_LATER);
    expect(repository.getById(created.id, { includeDeleted: true })).toMatchObject({
      id: "category_1"
    });
  });

  it("lists containers and items assigned to a category", () => {
    const category = new CategoryRepository(connection).create({
      id: "category_1",
      workspaceId: "workspace_1",
      name: "Finance",
      slug: "finance",
      color: "#2c6b8f",
      timestamp: TEST_TIMESTAMP
    });
    const container = new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Tax Prep",
      slug: "tax-prep",
      categoryId: category.id,
      timestamp: TEST_TIMESTAMP
    });
    const item = new ItemRepository(connection).create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: container.id,
      type: "task",
      title: "Send forms",
      categoryId: category.id,
      timestamp: TEST_TIMESTAMP
    });
    const repository = new CategoryRepository(connection);

    expect(repository.listAssignedContainers(category.id)).toMatchObject([
      {
        id: container.id,
        categoryId: category.id
      }
    ]);
    expect(repository.listAssignedItems(category.id)).toMatchObject([
      {
        id: item.id,
        categoryId: category.id
      }
    ]);
  });
});
