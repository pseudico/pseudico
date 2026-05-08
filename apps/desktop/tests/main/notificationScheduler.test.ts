import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ContainerRepository,
  DatabaseBootstrapService,
  ItemRepository,
  TaskRepository,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import { ReminderService } from "@local-work-os/features";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationScheduler, type ReminderNotification } from "../../src/main/services/NotificationScheduler";

vi.mock("electron", () => ({
  Notification: class {
    static isSupported() {
      return false;
    }

    show() {
      return undefined;
    }
  }
}));

describe("NotificationScheduler", () => {
  let tempRoot: string;
  let connection: DatabaseConnection;

  beforeEach(async () => {
    vi.useFakeTimers();
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-reminders-"));
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);
    await new DatabaseBootstrapService({
      now: () => new Date("2026-05-02T00:00:00.000Z")
    }).bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });
    connection = await createDatabaseConnection({ databasePath, fileMustExist: true });
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    const item = new ItemRepository(connection).create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "task",
      title: "Call supplier",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    new TaskRepository(connection).createDetails({
      itemId: item.id,
      workspaceId: item.workspaceId,
      dueAt: "2026-05-02T10:00:00.000Z",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
  });

  afterEach(async () => {
    connection.close();
    await rm(tempRoot, { force: true, recursive: true });
    vi.useRealTimers();
  });

  it("schedules a reminder event and fires a local notification", async () => {
    const reminder = await new ReminderService({
      connection,
      now: () => new Date("2026-05-02T00:00:00.000Z")
    }).setTaskReminder({
      workspaceId: "workspace_1",
      taskId: "item_1",
      triggerAt: "2026-05-02T00:00:01.000Z"
    });
    const notifications: ReminderNotification[] = [];
    const scheduler = new NotificationScheduler({
      connection,
      now: () => new Date("2026-05-02T00:00:00.000Z"),
      notifier: (notification) => notifications.push(notification)
    });

    scheduler.scheduleReminder(reminder.policy!.id);
    await vi.advanceTimersByTimeAsync(1000);

    expect(notifications).toEqual([
      {
        title: "Task reminder",
        body: "Call supplier"
      }
    ]);
  });
});
