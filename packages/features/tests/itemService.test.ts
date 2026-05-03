import {
  ActivityLogRepository,
  ContainerRepository,
  ContainerTabRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ItemService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("ItemService", () => {
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
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    new ContainerRepository(connection).create({
      id: "container_project_2",
      workspaceId: "workspace_1",
      type: "project",
      name: "Operations",
      slug: "operations",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    new ContainerTabRepository(connection).ensureDefaultTab({
      id: "container_tab_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("creates items with append ordering, activity, and search records", async () => {
    const service = createService();

    const first = await service.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      containerTabId: "container_tab_1",
      type: "note",
      title: "Kickoff note",
      body: "Agenda and supplier checklist"
    });
    const second = await service.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      containerTabId: "container_tab_1",
      type: "task",
      title: "Call supplier"
    });

    expect(first.item).toMatchObject({
      id: "item_1",
      sortOrder: 1024,
      title: "Kickoff note"
    });
    expect(second.item.sortOrder).toBe(2048);
    expect(first.searchRecord).toMatchObject({
      id: "search_2",
      targetType: "item",
      targetId: "item_1",
      title: "Kickoff note",
      body: "Agenda and supplier checklist"
    });
    expect(new ActivityLogRepository(connection).listForTarget(
      "item",
      "item_1"
    )).toMatchObject([{ id: "activity_3", action: "item_created" }]);
    expect(service.listItemsByContainer({
      containerId: "container_project_1"
    })).toEqual([first.item, second.item]);
    expect(service.listItemsByContainerTab({
      containerId: "container_project_1",
      containerTabId: "container_tab_1"
    })).toEqual([first.item, second.item]);
  });

  it("updates searchable item fields and records activity", async () => {
    const service = createService();
    const created = await service.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "note",
      title: "Draft note",
      body: "Rough supplier thoughts"
    });

    const updated = await service.updateItem({
      itemId: created.item.id,
      title: "Final note",
      body: "Confirmed supplier decision",
      status: "waiting"
    });

    expect(updated.item).toMatchObject({
      title: "Final note",
      body: "Confirmed supplier decision",
      status: "waiting"
    });
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: created.item.id
    })).toMatchObject({
      title: "Final note",
      body: "Confirmed supplier decision"
    });
    expect(new ActivityLogRepository(connection).listForTarget(
      "item",
      created.item.id
    )).toMatchObject([
      { action: "item_created" },
      { action: "item_updated" }
    ]);
  });

  it("moves items with append ordering in the target container", async () => {
    const service = createService();
    await service.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_2",
      type: "task",
      title: "Existing target item"
    });
    const source = await service.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "task",
      title: "Move me"
    });

    const moved = await service.moveItem({
      itemId: source.item.id,
      targetContainerId: "container_project_2"
    });

    expect(moved.item).toMatchObject({
      containerId: "container_project_2",
      containerTabId: null,
      sortOrder: 2048
    });
    expect(service.listItemsByContainer({
      containerId: "container_project_1"
    })).toEqual([]);
    expect(new ActivityLogRepository(connection).listForTarget(
      "item",
      source.item.id
    )).toMatchObject([
      { action: "item_created" },
      { action: "item_moved" }
    ]);
  });

  it("archives and soft-deletes items while active feeds and search exclude them", async () => {
    const service = createService();
    const archivedSource = await service.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "task",
      title: "Archive me"
    });
    const deletedSource = await service.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "note",
      title: "Delete me"
    });

    const archived = await service.archiveItem(archivedSource.item.id);
    const deleted = await service.softDeleteItem(deletedSource.item.id);

    expect(archived.item.archivedAt).toBe("2026-05-01T00:00:00.000Z");
    expect(deleted.item.deletedAt).toBe("2026-05-01T00:00:00.000Z");
    expect(service.listItemsByContainer({
      containerId: "container_project_1"
    })).toEqual([]);
    expect(service.listItemsByContainer({
      containerId: "container_project_1",
      includeArchived: true,
      includeDeleted: true
    })).toHaveLength(2);
    expect(new SearchIndexRepository(connection).search(
      "workspace_1",
      "delete"
    )).toEqual([]);
    expect(new SearchIndexRepository(connection).search(
      "workspace_1",
      "delete",
      { includeDeleted: true }
    )).toHaveLength(1);
    expect(new ActivityLogRepository(connection).listForTarget(
      "item",
      deletedSource.item.id
    )).toMatchObject([
      { action: "item_created" },
      { action: "item_deleted" }
    ]);
  });

  it("opens an item inspector snapshot with recent activity", async () => {
    const service = createService();
    const created = await service.createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "note",
      title: "Inspect me"
    });

    await service.updateItem({
      itemId: created.item.id,
      body: "Inspector body"
    });

    expect(service.getItemActivity(created.item.id).map((entry) => entry.action)).toEqual([
      "item_created",
      "item_updated"
    ]);
    expect(service.openItemInspector(created.item.id)).toMatchObject({
      item: {
        id: created.item.id,
        title: "Inspect me",
        body: "Inspector body"
      },
      activity: [
        { action: "item_created" },
        { action: "item_updated" }
      ]
    });
  });
});

function createService(): ItemService {
  return new ItemService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-01T00:00:00.000Z")
  });
}
