import {
  ActivityLogRepository,
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BulkActionService, ItemService, SelectionStore, TaskService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("SelectionStore", () => {
  it("toggles, replaces, and clears scoped selections", () => {
    const store = new SelectionStore("inbox");
    const snapshots: number[] = [];
    const unsubscribe = store.subscribe((snapshot) => {
      snapshots.push(snapshot.count);
    });

    store.select({ type: "item", id: "item_1" });
    store.toggle({ type: "item", id: "item_2" });
    store.toggle({ type: "item", id: "item_1" });
    store.replace([{ type: "item", id: "item_3" }]);
    const final = store.clear();
    unsubscribe();

    expect(snapshots).toEqual([0, 1, 2, 1, 1, 0]);
    expect(final).toMatchObject({ scopeId: "inbox", count: 0 });
  });
});

describe("BulkActionService", () => {
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
      id: "container_inbox",
      workspaceId: "workspace_1",
      type: "inbox",
      name: "Inbox",
      slug: "inbox",
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
    new CategoryRepository(connection).create({
      id: "category_1",
      workspaceId: "workspace_1",
      name: "Ops",
      slug: "ops",
      color: "#245c55",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("moves, tags, categorizes, archives, and deletes items with grouped activity and search updates", async () => {
    const task = await createTask("Call supplier");
    const note = await createItem("note", "Meeting note");
    const service = createBulkService();

    const moved = await service.moveItems({
      workspaceId: "workspace_1",
      itemIds: [task.item.id, note.item.id],
      targetContainerId: "container_project_1"
    });
    const tagged = await service.tagItems({
      workspaceId: "workspace_1",
      itemIds: [task.item.id, note.item.id],
      tagName: "@triage"
    });
    const categorized = await service.categorizeItems({
      workspaceId: "workspace_1",
      itemIds: [task.item.id, note.item.id],
      categoryId: "category_1"
    });
    const archived = await service.archiveItems({
      workspaceId: "workspace_1",
      itemIds: [note.item.id]
    });
    const deleted = await service.deleteItems({
      workspaceId: "workspace_1",
      itemIds: [task.item.id]
    });

    expect(moved).toMatchObject({ operation: "move", changedCount: 2 });
    expect(tagged).toMatchObject({ operation: "tag", changedCount: 2 });
    expect(categorized).toMatchObject({ operation: "category", changedCount: 2 });
    expect(archived).toMatchObject({ operation: "archive", changedCount: 1 });
    expect(deleted).toMatchObject({ operation: "delete", changedCount: 1 });
    expect(new ItemRepository(connection).getById(note.item.id)).toMatchObject({
      containerId: "container_project_1",
      categoryId: "category_1",
      status: "archived"
    });
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: note.item.id
      })
    ).toMatchObject({ tags: "triage", category: "Ops" });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("workspace", "workspace_1")
        .map((event) => event.action)
    ).toEqual([
      "bulk_items_moved",
      "bulk_items_tagged",
      "bulk_items_categorized",
      "bulk_items_archived",
      "bulk_items_deleted"
    ]);
  });

  it("bulk-completes task results from a collection and skips non-task targets", async () => {
    const task = await createTask("Finish launch list");
    const note = await createItem("note", "Reference note");

    const result = await createBulkService().completeTasks({
      workspaceId: "workspace_1",
      itemIds: [task.item.id, note.item.id]
    });

    expect(result).toMatchObject({
      operation: "complete",
      changedCount: 1,
      skippedCount: 1
    });
    expect(result.items.find((item) => item.itemId === note.item.id)).toMatchObject({
      ok: false,
      reason: "Only task items can be completed in bulk."
    });
    expect(new ItemRepository(connection).getById(task.item.id)).toMatchObject({
      status: "completed"
    });
  });

  it("prepares a local Markdown export for selected items", async () => {
    const task = await createTask("Exportable task");
    const result = await createBulkService().exportItems({
      workspaceId: "workspace_1",
      itemIds: [task.item.id]
    });

    expect(result.export).toMatchObject({
      format: "markdown",
      itemCount: 1
    });
    expect(result.export?.contents).toContain("Exportable task");
    expect(result.activityId).not.toBeNull();
  });
});

async function createTask(title: string) {
  return await new TaskService({
    connection,
    idFactory,
    now
  }).createTask({
    workspaceId: "workspace_1",
    containerId: "container_inbox",
    title
  });
}

async function createItem(type: "note" | "link", title: string) {
  return await new ItemService({
    connection,
    idFactory,
    now
  }).createItem({
    workspaceId: "workspace_1",
    containerId: "container_inbox",
    type,
    title
  });
}

function createBulkService(): BulkActionService {
  return new BulkActionService({
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
  return new Date("2026-05-02T01:02:03.000Z");
}
