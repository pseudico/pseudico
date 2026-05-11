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
import {
  CalendarService,
  ListService,
  TaskService,
  createCalendarMonthRange,
  createCalendarWeekRange
} from "../src";

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

  it("creates a Sunday-start calendar week range", () => {
    expect(createCalendarWeekRange("2026-05-15")).toMatchObject({
      month: "2026-05",
      startInclusive: "2026-05-10T00:00:00.000Z",
      endExclusive: "2026-05-17T00:00:00.000Z"
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

  it("projects all-day and timed work into week and day views", async () => {
    const taskService = createTaskService();
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "All-day planning",
      dueAt: "2026-05-12",
      allDay: true
    });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Timed review",
      startAt: "2026-05-12T10:00:00.000Z",
      dueAt: "2026-05-12T10:30:00.000Z",
      allDay: false
    });

    const week = createCalendarService().getCalendarWeek({
      workspaceId: "workspace_1",
      weekOf: "2026-05-12"
    });
    const day = createCalendarService().getCalendarDay({
      workspaceId: "workspace_1",
      date: "2026-05-12"
    });

    expect(week.days).toHaveLength(7);
    expect(week.days.find((candidate) => candidate.date === "2026-05-12")?.items)
      .toMatchObject([
        { title: "All-day planning", allDay: true },
        { title: "Timed review", allDay: false }
      ]);
    expect(day.days).toHaveLength(1);
    expect(day.days[0]?.items.map((item) => item.title)).toEqual([
      "All-day planning",
      "Timed review"
    ]);
  });

  it("reschedules task and list item calendar entries through write services", async () => {
    const taskService = createTaskService();
    const listService = createListService();
    const task = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Drag task",
      dueAt: "2026-05-11"
    });
    const list = await listService.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Drag list"
    });
    const listItem = await listService.addListItem({
      listId: list.item.id,
      title: "Drag list row",
      dueAt: "2026-05-11"
    });

    const calendarService = createCalendarService();
    await calendarService.rescheduleCalendarItem({
      workspaceId: "workspace_1",
      itemId: task.item.id,
      kind: "task",
      dueAt: "2026-05-12T09:00:00.000Z",
      startAt: "2026-05-12T08:30:00.000Z",
      allDay: false
    });
    await calendarService.rescheduleCalendarItem({
      workspaceId: "workspace_1",
      itemId: listItem.listItem.id,
      kind: "list_item",
      dueAt: "2026-05-13T00:00:00.000Z"
    });

    const month = calendarService.getCalendarMonth({
      workspaceId: "workspace_1",
      month: "2026-05"
    });

    expect(month.days.find((day) => day.date === "2026-05-12")?.items[0])
      .toMatchObject({ title: "Drag task", allDay: false });
    expect(month.days.find((day) => day.date === "2026-05-13")?.items[0])
      .toMatchObject({ title: "Drag list row", kind: "list_item" });
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
