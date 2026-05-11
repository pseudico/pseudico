import {
  ActivityLogRepository,
  ContainerRepository,
  MigrationService,
  ReminderRepository,
  SearchIndexRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ListService, ReminderService, TaskService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("ReminderService", () => {
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

  it("sets and clears relative task reminders with activity but no search mutation", async () => {
    const task = await createTask();
    const searchBefore = new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: task.item.id
    })!;

    const set = await createReminderService().setTaskReminder({
      workspaceId: "workspace_1",
      taskId: task.item.id,
      leadMinutes: 30
    });

    expect(set.policy).toMatchObject({
      taskItemId: task.item.id,
      mode: "relative",
      leadMinutes: 30,
      triggerAt: "2026-05-02T09:30:00.000Z",
      status: "active"
    });
    expect(set.event).toMatchObject({
      taskItemId: task.item.id,
      scheduledForAt: "2026-05-02T09:30:00.000Z",
      status: "scheduled"
    });
    expect(new TaskRepository(connection).getDetailsByItemId(task.item.id)).toMatchObject({
      reminderPolicyId: set.policy!.id
    });
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: task.item.id
    })!.updatedAt).toBe(searchBefore.updatedAt);

    const cleared = await createReminderService().clearTaskReminder({
      taskId: task.item.id
    });

    expect(cleared.policy).toMatchObject({ status: "cleared" });
    expect(new TaskRepository(connection).getDetailsByItemId(task.item.id)).toMatchObject({
      reminderPolicyId: null
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", task.item.id)
        .map((event) => event.action)
    ).toEqual(["task_created", "reminder_set", "reminder_cleared"]);
  });

  it("reschedules relative reminders when a task due date changes", async () => {
    const task = await createTask();
    const reminderService = createReminderService();
    const set = await reminderService.setTaskReminder({
      workspaceId: "workspace_1",
      taskId: task.item.id,
      leadMinutes: 60
    });

    await createTaskService().rescheduleTask({
      itemId: task.item.id,
      dueAt: "2026-05-04T12:00:00.000Z",
      allDay: false
    });

    const repository = new ReminderRepository(connection);
    const activePolicy = repository.getActivePolicyForTask(task.item.id);
    expect(activePolicy).toMatchObject({
      id: set.policy!.id,
      triggerAt: "2026-05-04T11:00:00.000Z"
    });
    expect(repository.listEventsForPolicy(set.policy!.id).map((event) => ({
      scheduledForAt: event.scheduledForAt,
      status: event.status
    }))).toEqual([
      { scheduledForAt: "2026-05-02T09:00:00.000Z", status: "cancelled" },
      { scheduledForAt: "2026-05-04T11:00:00.000Z", status: "scheduled" }
    ]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", task.item.id)
        .map((event) => event.action)
    ).toEqual([
      "task_created",
      "reminder_set",
      "task_rescheduled",
      "reminder_rescheduled"
    ]);
  });

  it("applies default reminders to newly created due tasks and honors no-reminder overrides", async () => {
    await createReminderService().updatePreferences({
      workspaceId: "workspace_1",
      preferences: {
        tasks: {
          enabled: true,
          anchor: "due",
          leadMinutes: 1440
        }
      }
    });

    const task = await createTaskService().createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Prepare launch",
      dueAt: "2026-05-03T09:00:00.000Z"
    });
    const skipped = await createTaskService().createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "No alert",
      dueAt: "2026-05-03T09:00:00.000Z",
      reminder: { mode: "none" }
    });

    const repository = new ReminderRepository(connection);
    expect(repository.getActivePolicyForTask(task.item.id)).toMatchObject({
      anchor: "due",
      mode: "relative",
      leadMinutes: 1440,
      triggerAt: "2026-05-02T09:00:00.000Z"
    });
    expect(repository.getActivePolicyForTask(skipped.item.id)).toBeNull();
  });

  it("sets list item reminder overrides and reschedules them from list item date changes", async () => {
    const list = await createListService().createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist"
    });
    const item = await createListService().addListItem({
      listId: list.item.id,
      title: "Send launch note",
      startAt: "2026-05-04T09:00:00.000Z",
      reminder: {
        mode: "relative",
        anchor: "start",
        leadMinutes: 60
      }
    });

    await createListService().updateListItem({
      listItemId: item.listItem.id,
      startAt: "2026-05-05T10:00:00.000Z"
    });

    const repository = new ReminderRepository(connection);
    const policy = repository.getActivePolicyForListItem(item.listItem.id);
    expect(policy).toMatchObject({
      targetType: "list_item",
      targetId: item.listItem.id,
      anchor: "start",
      triggerAt: "2026-05-05T09:00:00.000Z"
    });
    expect(repository.listEventsForPolicy(policy!.id).map((event) => ({
      targetType: event.targetType,
      scheduledForAt: event.scheduledForAt,
      status: event.status
    }))).toEqual([
      {
        targetType: "list_item",
        scheduledForAt: "2026-05-05T09:00:00.000Z",
        status: "scheduled"
      },
      {
        targetType: "list_item",
        scheduledForAt: "2026-05-04T08:00:00.000Z",
        status: "cancelled"
      }
    ]);
  });

  it("dismisses and snoozes reminder events", async () => {
    const task = await createTask();
    const reminderService = createReminderService();
    const set = await reminderService.setTaskReminder({
      workspaceId: "workspace_1",
      taskId: task.item.id,
      triggerAt: "2026-05-02T09:45:00.000Z"
    });

    const snoozed = await reminderService.snoozeReminder({
      eventId: set.event!.id,
      until: "2026-05-02T10:15:00.000Z"
    });
    expect(snoozed.event).toMatchObject({
      status: "snoozed",
      snoozedUntil: "2026-05-02T10:15:00.000Z"
    });

    const dismissed = await reminderService.dismissReminder({ eventId: set.event!.id });
    expect(dismissed.event).toMatchObject({
      status: "dismissed",
      dismissedAt: "2026-05-02T01:02:03.000Z"
    });
  });
});

async function createTask() {
  return await createTaskService().createTask({
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    title: "Call supplier",
    dueAt: "2026-05-02T10:00:00.000Z"
  });
}

function createTaskService(): TaskService {
  return new TaskService({
    connection,
    idFactory,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function createReminderService(): ReminderService {
  return new ReminderService({
    connection,
    idFactory,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function createListService(): ListService {
  return new ListService({
    connection,
    idFactory,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
