import {
  ActivityLogRepository,
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  SearchIndexRepository,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CategoryService,
  ItemService,
  TagService,
  TaskService,
  UndoService,
  type UndoSessionState
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("UndoService", () => {
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
      id: "container_project",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch",
      slug: "launch",
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

  it("undoes and redoes an item move from its activity snapshot", async () => {
    const created = await createItemService().createItem({
      workspaceId: "workspace_1",
      containerId: "container_inbox",
      type: "note",
      title: "Move me"
    });
    await createItemService().moveItem({
      itemId: created.item.id,
      targetContainerId: "container_project"
    });
    const activityId = latestActivityId(created.item.id, "item_moved");
    const session: UndoSessionState = { undoStack: [], redoStack: [] };
    const undo = createUndoService(session);

    expect(undo.registerActivity(activityId)).toMatchObject({ kind: "move" });
    await undo.undoLast();

    expect(new ItemRepository(connection).getById(created.item.id)).toMatchObject({
      containerId: "container_inbox"
    });
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: created.item.id
    })).toMatchObject({ targetId: created.item.id });

    await undo.redoLast();

    expect(new ItemRepository(connection).getById(created.item.id)).toMatchObject({
      containerId: "container_project"
    });
  });

  it("undoes a task completion and detects stale redo conflicts", async () => {
    const created = await createTaskService().createTask({
      workspaceId: "workspace_1",
      containerId: "container_inbox",
      title: "Finish launch"
    });
    await createTaskService().completeTask(created.item.id);
    const activityId = latestActivityId(created.item.id, "task_completed");
    const undo = createUndoService({ undoStack: [activityId], redoStack: [] });

    const undone = await undo.undoLast();

    expect(undone).toMatchObject({ ok: true, conflict: false });
    expect(new TaskRepository(connection).getByItemId(created.item.id)).toMatchObject({
      item: { status: "active", completedAt: null },
      task: { taskStatus: "open", completedAt: null }
    });

    await createTaskService().updateTask({
      itemId: created.item.id,
      title: "Changed elsewhere"
    });
    const redone = await undo.redoLast();

    expect(redone).toMatchObject({ ok: false, conflict: true });
  });

  it("undoes tag and category changes from before/after snapshots", async () => {
    const item = await createItemService().createItem({
      workspaceId: "workspace_1",
      containerId: "container_inbox",
      type: "note",
      title: "Tagged note"
    });
    await createTagService().addTagToTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: item.item.id,
      name: "triage"
    });
    const tagActivityId = latestActivityId(item.item.id, "tag_added");
    await createCategoryService().assignCategoryToItem({
      workspaceId: "workspace_1",
      itemId: item.item.id,
      categoryId: "category_1"
    });
    const categoryActivityId = latestActivityId(item.item.id, "category_assigned");
    const undo = createUndoService({
      undoStack: [tagActivityId, categoryActivityId],
      redoStack: []
    });

    await undo.undoLast();
    await undo.undoLast();

    expect(new ItemRepository(connection).getById(item.item.id)).toMatchObject({
      categoryId: null
    });
    expect(new TagRepository(connection).listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: item.item.id
    })).toEqual([]);
  });
});

function createItemService(): ItemService {
  return new ItemService({ connection, idFactory, now });
}

function createTaskService(): TaskService {
  return new TaskService({ connection, idFactory, now });
}

function createTagService(): TagService {
  return new TagService({ connection, idFactory, now });
}

function createCategoryService(): CategoryService {
  return new CategoryService({ connection, idFactory, now });
}

function createUndoService(session: UndoSessionState): UndoService {
  return new UndoService({ connection, idFactory, now, session });
}

function latestActivityId(itemId: string, action: string): string {
  const activity = new ActivityLogRepository(connection)
    .listForTarget("item", itemId, 20)
    .find((event) => event.action === action);
  expect(activity).toBeDefined();
  return activity.id;
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function now(): Date {
  return new Date("2026-05-02T01:02:03.000Z");
}
