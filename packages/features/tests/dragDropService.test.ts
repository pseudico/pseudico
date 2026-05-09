import {
  ActivityLogRepository,
  ContainerRepository,
  ContainerTabRepository,
  ItemRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DragDropService, ItemService, ListService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("DragDropService", () => {
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
      timestamp: "2026-05-09T00:00:00.000Z"
    });
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-05-09T00:00:00.000Z"
    });
    new ContainerTabRepository(connection).ensureDefaultTab({
      id: "container_tab_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      timestamp: "2026-05-09T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("reorders project feed items through item moves, activity, and search updates", async () => {
    const itemService = createItemService();
    const first = await itemService.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      containerTabId: "container_tab_1",
      type: "task",
      title: "First"
    });
    const second = await itemService.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      containerTabId: "container_tab_1",
      type: "note",
      title: "Second"
    });
    const third = await itemService.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      containerTabId: "container_tab_1",
      type: "link",
      title: "Third"
    });

    const reordered = await createService().reorderContainerItems({
      containerId: "container_project_1",
      containerTabId: "container_tab_1",
      itemIds: [third.item.id, first.item.id, second.item.id]
    });

    expect(reordered.map((result) => [result.item.id, result.item.sortOrder]))
      .toEqual([
        [third.item.id, 1024],
        [first.item.id, 2048],
        [second.item.id, 3072]
      ]);
    expect(
      new ItemRepository(connection)
        .listByContainerTab("container_project_1", "container_tab_1")
        .map((item) => item.id)
    ).toEqual([third.item.id, first.item.id, second.item.id]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", third.item.id)
        .map((event) => event.action)
    ).toEqual(["item_created", "item_moved"]);
  });

  it("reorders checklist rows while preserving indentation metadata", async () => {
    const listService = createListService();
    const list = await listService.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Checklist"
    });
    const parent = await listService.addListItem({
      listId: list.item.id,
      title: "Parent"
    });
    const child = await listService.addListItem({
      listId: list.item.id,
      title: "Child",
      listItemParentId: parent.listItem.id
    });

    const [movedChild, movedParent] = await createService().reorderListItems({
      listId: list.item.id,
      listItemIds: [child.listItem.id, parent.listItem.id]
    });

    expect(movedChild?.listItem).toMatchObject({
      id: child.listItem.id,
      depth: 1,
      listItemParentId: parent.listItem.id,
      sortOrder: 1024
    });
    expect(movedParent?.listItem).toMatchObject({
      id: parent.listItem.id,
      depth: 0,
      listItemParentId: null,
      sortOrder: 2048
    });
  });

  it("rejects partial item reorders so visible order cannot silently drop records", async () => {
    const itemService = createItemService();
    const first = await itemService.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "task",
      title: "First"
    });
    await itemService.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "task",
      title: "Second"
    });

    await expect(
      createService().reorderContainerItems({
        containerId: "container_project_1",
        itemIds: [first.item.id]
      })
    ).rejects.toThrow("itemIds must include every active record exactly once.");
  });
});

function createService(): DragDropService {
  return new DragDropService({
    connection,
    idFactory,
    now
  });
}

function createItemService(): ItemService {
  return new ItemService({
    connection,
    idFactory,
    now
  });
}

function createListService(): ListService {
  return new ListService({
    connection,
    idFactory,
    now
  });
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function now(): Date {
  return new Date("2026-05-09T00:00:00.000Z");
}
