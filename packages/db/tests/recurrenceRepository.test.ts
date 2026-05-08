import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ItemRepository,
  RecurrenceRepository,
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

describe("RecurrenceRepository", () => {
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

  it("creates, reads, and clears active recurrence rules for a task", () => {
    const repository = new RecurrenceRepository(connection);
    const rule = repository.createRule({
      id: "recurrence_rule_1",
      workspaceId: "workspace_1",
      taskItemId: "item_1",
      frequency: "weekly",
      interval: 2,
      weekdays: [1, 3, 5],
      anchorAt: "2026-05-01T10:00:00.000Z",
      nextOccurrenceAt: "2026-05-04T10:00:00.000Z",
      timestamp: TEST_TIMESTAMP
    });

    expect(repository.getActiveRuleForTask("item_1")).toEqual(rule);
    expect(rule).toMatchObject({
      frequency: "weekly",
      interval: 2,
      weekdays: [1, 3, 5],
      status: "active"
    });

    const cleared = repository.updateRule(rule.id, {
      status: "cleared",
      deletedAt: TEST_TIMESTAMP_LATER,
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(cleared).toMatchObject({ status: "cleared", deletedAt: TEST_TIMESTAMP_LATER });
    expect(repository.getActiveRuleForTask("item_1")).toBeNull();
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
