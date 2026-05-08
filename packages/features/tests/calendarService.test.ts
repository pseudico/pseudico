import {
  CategoryRepository,
  ContainerRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CalendarService, ListService, TaskService, createCalendarMonthRange } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = new Date("2026-05-15T09:30:00.000Z");
const TIMESTAMP = "2026-05-01T00:00:00.000Z";

describe("CalendarService", () => {
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
      timestamp: TIMESTAMP
    });
    new CategoryRepository(connection).create({
      id: "category_ops",
      workspaceId: "workspace_1",
      name: "Operations",
      slug: "operations",
      color: "blue",
      timestamp: TIMESTAMP
    });
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      categoryId: "category_ops",
      timestamp: TIMESTAMP
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("creates a calendar month range from YYYY-MM input", () => {
    expect(createCalendarMonthRange("2026-05")).toEqual({
      month: "2026-05",
      startInclusive: "2026-05-01T00:00:00.000Z",
      endExclusive: "2026-06-01T00:00:00.000Z"
    });
  });

  it("projects dated tasks and list items into month day buckets", async () => {
    const taskService = createTaskService();
    const listService = createListService();
    const task = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist",
      dueAt: "2026-05-15",
      priority: 2
    });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "June task",
      dueAt: "2026-06-01"
    });
    const list = await listService.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Cutover list"
    });
    const listItem = await listService.addListItem({
      listId: list.item.id,
      title: "Confirm launch window",
      dueAt: "2026-05-15T12:00:00.000Z"
    });

    const month = createCalendarService().getCalendarMonth({
      workspaceId: "workspace_1",
      month: "2026-05"
    });
    const may15 = month.days.find((day) => day.date === "2026-05-15");

    expect(month).toMatchObject({
      workspaceId: "workspace_1",
      generatedAt: NOW.toISOString(),
      totalCount: 2,
      range: {
        month: "2026-05",
        startInclusive: "2026-05-01T00:00:00.000Z",
        endExclusive: "2026-06-01T00:00:00.000Z"
      }
    });
    expect(may15?.items.map((item) => item.title)).toEqual([
      "Launch checklist",
      "Confirm launch window"
    ]);
    expect(may15?.items[0]).toMatchObject({
      id: task.item.id,
      kind: "task",
      containerName: "Launch Plan",
      categoryName: "Operations",
      priority: 2,
      navigationTarget: {
        targetType: "item",
        targetId: task.item.id,
        containerId: "container_project_1"
      }
    });
    expect(may15?.items[1]).toMatchObject({
      id: listItem.listItem.id,
      kind: "list_item",
      navigationTarget: {
        targetType: "list_item",
        targetId: listItem.listItem.id,
        sourceItemId: list.item.id
      }
    });
  });

  it("hides completed dated work unless requested", async () => {
    const taskService = createTaskService();
    const completed = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Completed task",
      dueAt: "2026-05-15"
    });
    await taskService.completeTask(completed.item.id);

    expect(createCalendarService().getCalendarMonth({
      workspaceId: "workspace_1",
      month: "2026-05"
    }).totalCount).toBe(0);
    expect(createCalendarService().getCalendarMonth({
      workspaceId: "workspace_1",
      month: "2026-05",
      includeCompleted: true
    }).totalCount).toBe(1);
  });
});

function createTaskService(): TaskService {
  return new TaskService({
    connection,
    idFactory: createId,
    now: () => NOW
  });
}

function createListService(): ListService {
  return new ListService({
    connection,
    idFactory: createId,
    now: () => NOW
  });
}

function createCalendarService(): CalendarService {
  return new CalendarService({
    connection,
    now: () => NOW
  });
}

function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
