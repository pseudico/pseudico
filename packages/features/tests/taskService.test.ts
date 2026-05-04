import {
  ActivityLogRepository,
  ContainerRepository,
  MigrationService,
  SearchIndexRepository,
  TagRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TagService, TaskService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("TaskService", () => {
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

  it("creates a task item and task details with activity and search records", async () => {
    const result = await createService().createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: " Call supplier ",
      body: "Discuss launch checklist",
      dueAt: "2026-05-02",
      startAt: "2026-05-01T10:00:00+10:00",
      priority: 3,
      status: "open",
      timezone: "Australia/Sydney"
    });

    expect(result.item).toMatchObject({
      id: "item_1",
      type: "task",
      title: "Call supplier",
      body: "Discuss launch checklist",
      status: "active",
      sortOrder: 1024
    });
    expect(result.task).toMatchObject({
      itemId: "item_1",
      taskStatus: "open",
      priority: 3,
      dueAt: "2026-05-02T00:00:00.000Z",
      startAt: "2026-05-01T00:00:00.000Z",
      allDay: true,
      timezone: "Australia/Sydney"
    });
    expect(result.searchRecord).toMatchObject({
      targetType: "item",
      targetId: "item_1",
      title: "Call supplier",
      body: "Discuss launch checklist"
    });
    expect(JSON.parse(result.searchRecord.metadataJson)).toMatchObject({
      taskStatus: "open",
      dueAt: "2026-05-02T00:00:00.000Z",
      priority: 3
    });
    expect(new ActivityLogRepository(connection).listForTarget(
      "item",
      "item_1"
    )).toMatchObject([{ action: "task_created" }]);
  });

  it("updates task fields and keeps search and activity aligned", async () => {
    const service = createService();
    const created = await service.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Draft task",
      dueAt: "2026-05-02",
      priority: 2
    });

    const updated = await service.updateTask({
      itemId: created.item.id,
      title: "Final task",
      body: "Confirmed details",
      status: "waiting",
      dueAt: null,
      priority: null
    });

    expect(updated.item).toMatchObject({
      title: "Final task",
      body: "Confirmed details",
      status: "waiting"
    });
    expect(updated.task).toMatchObject({
      taskStatus: "waiting",
      dueAt: null,
      priority: null
    });
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: created.item.id
    })).toMatchObject({
      title: "Final task",
      body: "Confirmed details"
    });
    expect(new ActivityLogRepository(connection).listForTarget(
      "item",
      created.item.id
    )).toMatchObject([
      { action: "task_created" },
      { action: "task_updated" }
    ]);
  });

  it("snoozes and reschedules tasks with activity and search metadata", async () => {
    const service = createService();
    const created = await service.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Plan follow-up",
      dueAt: "2026-05-02"
    });

    const snoozed = await service.snoozeTask({
      itemId: created.item.id,
      preset: "tomorrow"
    });

    expect(snoozed.task).toMatchObject({
      dueAt: new Date(2026, 4, 3).toISOString(),
      allDay: true
    });
    expect(JSON.parse(snoozed.searchRecord.metadataJson)).toMatchObject({
      dueAt: new Date(2026, 4, 3).toISOString()
    });

    const rescheduled = await service.rescheduleTask({
      itemId: created.item.id,
      dueAt: "2026-05-09T15:30:00.000Z",
      allDay: false
    });

    expect(rescheduled.task).toMatchObject({
      dueAt: "2026-05-09T15:30:00.000Z",
      allDay: false
    });
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: created.item.id
    })).toMatchObject({
      targetId: created.item.id
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", created.item.id)
        .map((event) => event.action)
    ).toEqual(["task_created", "task_snoozed", "task_rescheduled"]);
  });

  it("syncs inline task tags, preserves manual tags, and projects tags into search", async () => {
    const service = createService();
    const created = await service.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Call @Ops",
      body: "Discuss @launch checklist"
    });

    expect(created.inlineTags).toEqual(["ops", "launch"]);
    expect(
      new TagRepository(connection)
        .listTagsForTarget({
          workspaceId: "workspace_1",
          targetType: "item",
          targetId: created.item.id
        })
        .map((tag) => ({ slug: tag.slug, source: tag.taggingSource }))
    ).toEqual([
      { slug: "launch", source: "inline" },
      { slug: "ops", source: "inline" }
    ]);
    expect(created.searchRecord.tags).toBe("launch ops");

    await new TagService({
      connection,
      idFactory: (prefix) => {
        idCounter += 1;
        return `${prefix}_${idCounter}`;
      },
      now: () => new Date("2026-05-02T01:02:03.000Z")
    }).addTagToTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: created.item.id,
      name: "manual-only"
    });

    const updated = await service.updateTask({
      itemId: created.item.id,
      title: "Call @Ops",
      body: "Checklist moved out of title"
    });

    expect(updated.inlineTags).toEqual(["ops"]);
    expect(
      new TagRepository(connection)
        .listTagsForTarget({
          workspaceId: "workspace_1",
          targetType: "item",
          targetId: created.item.id
        })
        .map((tag) => ({ slug: tag.slug, source: tag.taggingSource }))
    ).toEqual([
      { slug: "manual-only", source: "manual" },
      { slug: "ops", source: "inline" }
    ]);
    expect(updated.searchRecord.tags).toBe("manual-only ops");
    expect(JSON.parse(updated.searchRecord.metadataJson)).toMatchObject({
      inlineTags: ["ops"],
      tagSlugs: ["manual-only", "ops"]
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", created.item.id)
        .map((event) => event.action)
    ).toEqual(expect.arrayContaining(["tag_added", "tag_removed", "task_updated"]));
  });

  it("completes and reopens tasks with mirrored item state", async () => {
    const service = createService();
    const created = await service.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Finish launch list"
    });

    const completed = await service.completeTask(created.item.id);
    const reopened = await service.reopenTask(created.item.id);

    expect(completed.item).toMatchObject({
      status: "completed",
      completedAt: "2026-05-02T01:02:03.000Z"
    });
    expect(completed.task).toMatchObject({
      taskStatus: "done",
      completedAt: "2026-05-02T01:02:03.000Z"
    });
    expect(reopened.item).toMatchObject({
      status: "active",
      completedAt: null
    });
    expect(reopened.task).toMatchObject({
      taskStatus: "open",
      completedAt: null
    });
    expect(new ActivityLogRepository(connection).listForTarget(
      "item",
      created.item.id
    )).toMatchObject([
      { action: "task_created" },
      { action: "task_completed" },
      { action: "task_reopened" }
    ]);
  });

  it("lists due-today, overdue, and upcoming open task projections", async () => {
    const service = createService();
    await service.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Overdue",
      dueAt: "2026-05-01T12:00:00.000Z"
    });
    const today = await service.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Due today",
      dueAt: "2026-05-02T12:00:00.000Z"
    });
    await service.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Upcoming",
      dueAt: "2026-05-05T12:00:00.000Z"
    });
    const completedToday = await service.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Completed today",
      dueAt: "2026-05-02T13:00:00.000Z"
    });
    await service.completeTask(completedToday.item.id);

    expect(service.listDueToday(
      "workspace_1",
      "2026-05-02"
    ).map((task) => task.item.id)).toEqual([today.item.id]);
    expect(service.listOverdue(
      "workspace_1",
      "2026-05-02"
    ).map((task) => task.item.title)).toEqual(["Overdue"]);
    expect(service.listUpcoming("workspace_1", {
      start: "2026-05-03T00:00:00.000Z",
      end: "2026-05-10T00:00:00.000Z"
    }).map((task) => task.item.title)).toEqual(["Upcoming"]);
  });

  it("lists task feed details by container including completed tasks", async () => {
    const service = createService();
    const first = await service.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "First task",
      dueAt: "2026-05-03"
    });
    const second = await service.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Second task"
    });
    await service.completeTask(second.item.id);

    expect(
      service.listTasksByContainer("container_project_1").map((task) => ({
        id: task.item.id,
        title: task.item.title,
        status: task.task.taskStatus,
        dueAt: task.task.dueAt
      }))
    ).toEqual([
      {
        id: first.item.id,
        title: "First task",
        status: "open",
        dueAt: "2026-05-03T00:00:00.000Z"
      },
      {
        id: second.item.id,
        title: "Second task",
        status: "done",
        dueAt: null
      }
    ]);
  });
});

function createService(): TaskService {
  return new TaskService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}
