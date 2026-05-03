import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ItemRepository,
  TaskRepository,
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

describe("TaskRepository", () => {
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

  it("creates, reads, and updates task details for a task item", () => {
    const item = createTaskItem("item_1", "Call supplier");
    const repository = new TaskRepository(connection);

    const task = repository.createDetails({
      itemId: item.id,
      workspaceId: item.workspaceId,
      taskStatus: "open",
      priority: 2,
      startAt: "2026-05-01T00:00:00.000Z",
      dueAt: "2026-05-02T00:00:00.000Z",
      allDay: true,
      timezone: "Australia/Sydney",
      timestamp: TEST_TIMESTAMP
    });
    const updated = repository.updateDetails(item.id, {
      taskStatus: "waiting",
      priority: null,
      dueAt: null,
      allDay: false,
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(task).toMatchObject({
      itemId: item.id,
      workspaceId: item.workspaceId,
      taskStatus: "open",
      priority: 2,
      allDay: true,
      timezone: "Australia/Sydney"
    });
    expect(updated).toMatchObject({
      taskStatus: "waiting",
      priority: null,
      dueAt: null,
      allDay: false,
      updatedAt: TEST_TIMESTAMP_LATER
    });
    expect(repository.getByItemId(item.id)).toMatchObject({
      item: { id: item.id, title: "Call supplier", type: "task" },
      task: { itemId: item.id, taskStatus: "waiting" }
    });
  });

  it("lists active due-today, overdue, and upcoming task projections", () => {
    const repository = new TaskRepository(connection);
    createTaskProjection({
      itemId: "item_due_today_open",
      title: "Due today",
      dueAt: "2026-05-02T08:00:00.000Z",
      taskStatus: "open"
    });
    createTaskProjection({
      itemId: "item_due_today_waiting",
      title: "Waiting today",
      dueAt: "2026-05-02T09:00:00.000Z",
      taskStatus: "waiting"
    });
    createTaskProjection({
      itemId: "item_overdue",
      title: "Overdue",
      dueAt: "2026-05-01T09:00:00.000Z",
      taskStatus: "open"
    });
    createTaskProjection({
      itemId: "item_old_overdue",
      title: "Old overdue",
      dueAt: "2026-04-15T09:00:00.000Z",
      taskStatus: "open"
    });
    createTaskProjection({
      itemId: "item_upcoming",
      title: "Upcoming",
      dueAt: "2026-05-04T09:00:00.000Z",
      taskStatus: "open"
    });
    createTaskProjection({
      itemId: "item_done_today",
      title: "Done today",
      dueAt: "2026-05-02T10:00:00.000Z",
      taskStatus: "done"
    });
    createTaskProjection({
      itemId: "item_cancelled_today",
      title: "Cancelled today",
      dueAt: "2026-05-02T10:30:00.000Z",
      taskStatus: "cancelled"
    });
    const completedItem = createTaskProjection({
      itemId: "item_completed_at_today",
      title: "Completed item today",
      dueAt: "2026-05-02T10:45:00.000Z",
      taskStatus: "open"
    });
    new ItemRepository(connection).update(completedItem.item.id, {
      completedAt: TEST_TIMESTAMP_LATER,
      timestamp: TEST_TIMESTAMP_LATER
    });
    const archived = createTaskProjection({
      itemId: "item_archived_today",
      title: "Archived today",
      dueAt: "2026-05-02T11:00:00.000Z",
      taskStatus: "open"
    });
    new ItemRepository(connection).archive(archived.item.id, TEST_TIMESTAMP_LATER);
    const deleted = createTaskProjection({
      itemId: "item_deleted_today",
      title: "Deleted today",
      dueAt: "2026-05-02T11:30:00.000Z",
      taskStatus: "open"
    });
    new ItemRepository(connection).softDelete(deleted.item.id, TEST_TIMESTAMP_LATER);

    expect(repository.listDueBetween("workspace_1", {
      startInclusive: "2026-05-02T00:00:00.000Z",
      endExclusive: "2026-05-03T00:00:00.000Z"
    }).map((task) => task.item.id)).toEqual([
      "item_due_today_open",
      "item_due_today_waiting"
    ]);
    expect(repository.listOverdue(
      "workspace_1",
      "2026-05-02T00:00:00.000Z"
    ).map((task) => task.item.id)).toEqual(["item_old_overdue", "item_overdue"]);
    expect(repository.listOverdueBetween("workspace_1", {
      startInclusive: "2026-05-01T00:00:00.000Z",
      endExclusive: "2026-05-02T00:00:00.000Z"
    }).map((task) => task.item.id)).toEqual(["item_overdue"]);
    expect(repository.listUpcoming("workspace_1", {
      startInclusive: "2026-05-03T00:00:00.000Z",
      endExclusive: "2026-05-10T00:00:00.000Z"
    }).map((task) => task.item.id)).toEqual(["item_upcoming"]);
  });
});

function createTaskProjection(input: {
  itemId: string;
  title: string;
  dueAt: string;
  taskStatus: "open" | "done" | "waiting" | "cancelled";
}) {
  const item = createTaskItem(input.itemId, input.title);
  const task = new TaskRepository(connection).createDetails({
    itemId: item.id,
    workspaceId: item.workspaceId,
    taskStatus: input.taskStatus,
    dueAt: input.dueAt,
    timestamp: TEST_TIMESTAMP
  });

  return { item, task };
}

function createTaskItem(id: string, title: string) {
  return new ItemRepository(connection).create({
    id,
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    type: "task",
    title,
    timestamp: TEST_TIMESTAMP
  });
}
