import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ItemRepository,
  ReminderRepository,
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

describe("ReminderRepository", () => {
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
    createTask("item_1");
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates active reminder policies and scheduled events for tasks", () => {
    const repository = new ReminderRepository(connection);
    const policy = repository.createPolicy({
      id: "reminder_policy_1",
      workspaceId: "workspace_1",
      taskItemId: "item_1",
      mode: "relative",
      leadMinutes: 30,
      triggerAt: "2026-05-01T09:30:00.000Z",
      timestamp: TEST_TIMESTAMP
    });
    const event = repository.createEvent({
      id: "reminder_event_1",
      workspaceId: "workspace_1",
      policyId: policy.id,
      taskItemId: "item_1",
      scheduledForAt: policy.triggerAt,
      timestamp: TEST_TIMESTAMP
    });

    expect(repository.getActivePolicyForTask("item_1")).toMatchObject({
      id: "reminder_policy_1",
      mode: "relative",
      leadMinutes: 30,
      triggerAt: "2026-05-01T09:30:00.000Z",
      status: "active"
    });
    expect(repository.getNextActiveEventByPolicy(policy.id)).toEqual(event);
  });

  it("lists due scheduled and snoozed reminder events and cancels pending events", () => {
    const repository = new ReminderRepository(connection);
    const policy = repository.createPolicy({
      id: "reminder_policy_1",
      workspaceId: "workspace_1",
      taskItemId: "item_1",
      mode: "absolute",
      triggerAt: "2026-05-01T09:30:00.000Z",
      timestamp: TEST_TIMESTAMP
    });
    repository.createEvent({
      id: "due_event",
      workspaceId: "workspace_1",
      policyId: policy.id,
      taskItemId: "item_1",
      scheduledForAt: "2026-05-01T09:30:00.000Z",
      timestamp: TEST_TIMESTAMP
    });
    repository.createEvent({
      id: "future_event",
      workspaceId: "workspace_1",
      policyId: policy.id,
      taskItemId: "item_1",
      scheduledForAt: "2026-05-01T11:00:00.000Z",
      timestamp: TEST_TIMESTAMP
    });
    repository.updateEvent("future_event", {
      status: "snoozed",
      snoozedUntil: "2026-05-01T09:45:00.000Z",
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(
      repository
        .listDueEvents("workspace_1", "2026-05-01T10:00:00.000Z")
        .map((event) => event.id)
    ).toEqual(["due_event", "future_event"]);

    repository.cancelActiveEventsForPolicy(policy.id, TEST_TIMESTAMP_LATER);

    expect(
      repository.listEventsForPolicy(policy.id).map((event) => ({
        id: event.id,
        status: event.status
      }))
    ).toEqual([
      { id: "due_event", status: "cancelled" },
      { id: "future_event", status: "cancelled" }
    ]);
  });
});

function createTask(id: string) {
  const item = new ItemRepository(connection).create({
    id,
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    type: "task",
    title: "Call supplier",
    timestamp: TEST_TIMESTAMP
  });

  new TaskRepository(connection).createDetails({
    itemId: item.id,
    workspaceId: item.workspaceId,
    taskStatus: "open",
    dueAt: "2026-05-01T10:00:00.000Z",
    timestamp: TEST_TIMESTAMP
  });

  return item;
}
