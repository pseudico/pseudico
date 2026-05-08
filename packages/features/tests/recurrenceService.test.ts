import {
  ActivityLogRepository,
  ContainerRepository,
  MigrationService,
  RecurrenceRepository,
  SearchIndexRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RecurrenceService, TaskService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("RecurrenceService", () => {
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
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("calculates daily, weekly, and custom weekday next occurrences", () => {
    const service = createRecurrenceService();

    expect(service.calculateNextOccurrence({
      frequency: "daily",
      interval: 2,
      weekdays: null,
      anchorAt: "2026-05-01T09:30:00.000Z"
    }, "2026-05-02T10:00:00.000Z")).toBe("2026-05-03T09:30:00.000Z");

    expect(service.calculateNextOccurrence({
      frequency: "weekly",
      interval: 1,
      weekdays: [1],
      anchorAt: "2026-05-01T09:30:00.000Z"
    }, "2026-05-04T09:30:00.000Z")).toBe("2026-05-11T09:30:00.000Z");

    expect(service.calculateNextOccurrence({
      frequency: "weekly",
      interval: 1,
      weekdays: [1, 3, 5],
      anchorAt: "2026-05-01T09:30:00.000Z"
    }, "2026-05-04T10:00:00.000Z")).toBe("2026-05-06T09:30:00.000Z");
  });

  it("sets and clears recurrence rules with task pointers and activity", async () => {
    const task = await createTask({ dueAt: "2026-05-04T09:30:00.000Z" });
    const service = createRecurrenceService();

    const set = await service.setRecurrenceRule({
      taskId: task.item.id,
      frequency: "weekly",
      weekdays: [1, 3]
    });

    expect(set.rule).toMatchObject({
      taskItemId: task.item.id,
      frequency: "weekly",
      weekdays: [1, 3],
      nextOccurrenceAt: "2026-05-06T09:30:00.000Z",
      status: "active"
    });
    expect(new TaskRepository(connection).getDetailsByItemId(task.item.id)).toMatchObject({
      recurrenceRuleId: set.rule!.id
    });

    await service.clearRecurrenceRule({ taskId: task.item.id });

    expect(new RecurrenceRepository(connection).getActiveRuleForTask(task.item.id)).toBeNull();
    expect(new TaskRepository(connection).getDetailsByItemId(task.item.id)).toMatchObject({
      recurrenceRuleId: null
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", task.item.id)
        .map((event) => event.action)
    ).toEqual(["task_created", "recurrence_set", "recurrence_cleared"]);
  });

  it("completeTask advances recurring tasks instead of marking them done", async () => {
    const task = await createTask({
      dueAt: "2026-05-04T09:30:00.000Z",
      startAt: "2026-05-04T08:30:00.000Z"
    });
    const recurrence = await createRecurrenceService().setRecurrenceRule({
      taskId: task.item.id,
      frequency: "weekly",
      weekdays: [1, 3]
    });

    const completed = await createTaskService().completeTask(task.item.id);

    expect(completed.item).toMatchObject({
      status: "active",
      completedAt: null
    });
    expect(completed.task).toMatchObject({
      taskStatus: "open",
      dueAt: "2026-05-06T09:30:00.000Z",
      startAt: "2026-05-06T08:30:00.000Z",
      completedAt: null,
      recurrenceRuleId: recurrence.rule!.id
    });
    expect(new RecurrenceRepository(connection).getActiveRuleForTask(task.item.id)).toMatchObject({
      nextOccurrenceAt: "2026-05-06T09:30:00.000Z"
    });
    expect(JSON.parse(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: task.item.id
    })!.metadataJson)).toMatchObject({
      dueAt: "2026-05-06T09:30:00.000Z",
      recurrenceRuleId: recurrence.rule!.id
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", task.item.id)
        .map((event) => event.action)
    ).toEqual(["task_created", "recurrence_set", "recurrence_advanced"]);
  });
});

async function createTask(input: { dueAt: string; startAt?: string }) {
  return await createTaskService().createTask({
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    title: "Call supplier",
    dueAt: input.dueAt,
    ...(input.startAt === undefined ? {} : { startAt: input.startAt }),
    allDay: false
  });
}

function createTaskService(): TaskService {
  return new TaskService({
    connection,
    idFactory,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function createRecurrenceService(): RecurrenceService {
  return new RecurrenceService({
    connection,
    idFactory,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
