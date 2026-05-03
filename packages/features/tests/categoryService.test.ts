import {
  ActivityLogRepository,
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  SearchIndexRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CategoryService } from "../src";
import { WorkspaceRepository } from "@local-work-os/db";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("CategoryService", () => {
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
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("creates, updates, lists, and logs categories", async () => {
    const service = createService();

    const created = await service.createCategory({
      workspaceId: "workspace_1",
      name: " Finance ",
      color: "#2c6b8f",
      description: "Money work"
    });
    const updated = await service.updateCategory({
      categoryId: created.id,
      name: "Finance Admin",
      color: "#c08a2c"
    });

    expect(created).toMatchObject({
      id: "category_1",
      name: "Finance",
      slug: "finance"
    });
    expect(updated).toMatchObject({
      name: "Finance Admin",
      slug: "finance-admin",
      color: "#c08a2c"
    });
    expect(service.listCategories("workspace_1")).toMatchObject([
      {
        id: "category_1",
        name: "Finance Admin"
      }
    ]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("category", created.id)
        .map((event) => event.action)
    ).toEqual(["category_created", "category_updated"]);
  });

  it("assigns categories to containers and items with search updates", async () => {
    const service = createService();
    const category = await service.createCategory({
      workspaceId: "workspace_1",
      name: "Finance",
      color: "#2c6b8f"
    });
    const container = new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Tax Prep",
      slug: "tax-prep",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    const item = new ItemRepository(connection).create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: container.id,
      type: "task",
      title: "Send forms",
      timestamp: "2026-05-01T00:00:00.000Z"
    });

    const projectAssignment = await service.assignCategoryToContainer({
      workspaceId: "workspace_1",
      containerId: container.id,
      categoryId: category.id
    });
    const itemAssignment = await service.assignCategoryToItem({
      workspaceId: "workspace_1",
      itemId: item.id,
      categoryId: category.id
    });

    expect(projectAssignment.searchRecord).toMatchObject({
      targetType: "container",
      targetId: container.id,
      category: "Finance"
    });
    expect(itemAssignment.searchRecord).toMatchObject({
      targetType: "item",
      targetId: item.id,
      category: "Finance"
    });
    expect(new SearchIndexRepository(connection).search("workspace_1", "finance"))
      .toHaveLength(2);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", item.id)
        .map((event) => event.action)
    ).toEqual(["category_assigned"]);
  });

  it("soft-deletes categories and clears assigned search projections", async () => {
    const service = createService();
    const category = await service.createCategory({
      workspaceId: "workspace_1",
      name: "Finance",
      color: "#2c6b8f"
    });
    const container = new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Tax Prep",
      slug: "tax-prep",
      categoryId: category.id,
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    const item = new ItemRepository(connection).create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: container.id,
      type: "task",
      title: "Send forms",
      categoryId: category.id,
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    await service.assignCategoryToContainer({
      workspaceId: "workspace_1",
      containerId: container.id,
      categoryId: category.id
    });
    await service.assignCategoryToItem({
      workspaceId: "workspace_1",
      itemId: item.id,
      categoryId: category.id
    });

    const deleted = await service.deleteOrArchiveCategory(category.id);

    expect(deleted).toMatchObject({
      clearedContainerCount: 1,
      clearedItemCount: 1
    });
    expect(new CategoryRepository(connection).listByWorkspace("workspace_1"))
      .toEqual([]);
    expect(new SearchIndexRepository(connection).search("workspace_1", "finance"))
      .toEqual([]);
    expect(new ContainerRepository(connection).getById(container.id)).toMatchObject({
      categoryId: null
    });
    expect(new ItemRepository(connection).getById(item.id)).toMatchObject({
      categoryId: null
    });
  });
});

function createService(): CategoryService {
  return new CategoryService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}
