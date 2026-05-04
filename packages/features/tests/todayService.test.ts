import {
  AppSettingsRepository,
  ActivityLogRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_TODAY_BACKLOG_DAYS,
  TODAY_BACKLOG_DAYS_SETTING_KEY,
  DailyPlanService,
  TaskService,
  TodayService
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = new Date(2026, 4, 15, 9, 30, 0, 0);

describe("TodayService", () => {
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

  it("builds due today, overdue backlog, and tomorrow preview from local dates", async () => {
    new AppSettingsRepository(connection).create({
      id: "setting_today_backlog_days",
      workspaceId: "workspace_1",
      settingKey: TODAY_BACKLOG_DAYS_SETTING_KEY,
      valueJson: JSON.stringify(3),
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    const taskService = createTaskService();

    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Old overdue",
      dueAt: new Date(2026, 4, 10, 9).toISOString()
    });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Yesterday overdue",
      dueAt: new Date(2026, 4, 14, 23, 59).toISOString()
    });
    const dueToday = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Due today",
      dueAt: new Date(2026, 4, 15, 23, 30).toISOString()
    });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Tomorrow",
      dueAt: new Date(2026, 4, 16, 8).toISOString()
    });
    const completedToday = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Completed today",
      dueAt: new Date(2026, 4, 15, 10).toISOString()
    });
    await taskService.completeTask(completedToday.item.id);
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Cancelled today",
      status: "cancelled",
      dueAt: new Date(2026, 4, 15, 11).toISOString()
    });
    const archivedToday = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Archived today",
      dueAt: new Date(2026, 4, 15, 12).toISOString()
    });
    new ItemRepository(connection).archive(
      archivedToday.item.id,
      "2026-05-01T01:00:00.000Z"
    );
    const deletedToday = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Deleted today",
      dueAt: new Date(2026, 4, 15, 13).toISOString()
    });
    new ItemRepository(connection).softDelete(
      deletedToday.item.id,
      "2026-05-01T01:00:00.000Z"
    );

    const service = createTodayService();
    const viewModel = service.getTodayViewModel({ workspaceId: "workspace_1" });

    expect(viewModel).toMatchObject({
      workspaceId: "workspace_1",
      generatedAt: NOW.toISOString(),
      localDate: "2026-05-15",
      backlogDays: 3,
      ranges: {
        today: {
          startInclusive: new Date(2026, 4, 15).toISOString(),
          endExclusive: new Date(2026, 4, 16).toISOString()
        },
        overdueBacklog: {
          startInclusive: new Date(2026, 4, 12).toISOString(),
          endExclusive: new Date(2026, 4, 15).toISOString()
        },
        tomorrow: {
          startInclusive: new Date(2026, 4, 16).toISOString(),
          endExclusive: new Date(2026, 4, 17).toISOString()
        }
      }
    });
    expect(viewModel.dueToday.map((task) => task.title)).toEqual(["Due today"]);
    expect(viewModel.dueToday[0]).toMatchObject({
      itemId: dueToday.item.id,
      taskStatus: "open",
      dueAt: new Date(2026, 4, 15, 23, 30).toISOString()
    });
    expect(viewModel.overdueBacklog.map((task) => task.title)).toEqual([
      "Yesterday overdue"
    ]);
    expect(viewModel.tomorrowPreview.map((task) => task.title)).toEqual([
      "Tomorrow"
    ]);
  });

  it("uses the default backlog window when no valid setting exists", () => {
    const service = createTodayService();

    expect(service.getTodayViewModel({
      workspaceId: "workspace_1",
      date: "2026-05-15"
    }).backlogDays).toBe(DEFAULT_TODAY_BACKLOG_DAYS);
  });

  it("merges manual Today and Tomorrow planning without duplicate lane display", async () => {
    const taskService = createTaskService();
    const dailyPlanService = createDailyPlanService();
    const manualToday = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Manual today"
    });
    const dueToday = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Due today but planned tomorrow",
      dueAt: new Date(2026, 4, 15, 10).toISOString()
    });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Naturally tomorrow",
      dueAt: new Date(2026, 4, 16, 8).toISOString()
    });

    await dailyPlanService.planTask({
      workspaceId: "workspace_1",
      itemId: manualToday.item.id,
      lane: "today",
      sortOrder: 1024
    });
    await dailyPlanService.planTask({
      workspaceId: "workspace_1",
      itemId: dueToday.item.id,
      lane: "tomorrow",
      sortOrder: 1024
    });

    const viewModel = createTodayService().getTodayViewModel({
      workspaceId: "workspace_1"
    });

    expect(viewModel.dueToday.map((task) => task.title)).toEqual([
      "Manual today"
    ]);
    expect(viewModel.dueToday[0]?.dueAt).toBeNull();
    expect(viewModel.dueToday[0]).toMatchObject({
      plannedLane: "today",
      plannedSortOrder: 1024,
      addedManually: true
    });
    expect(viewModel.tomorrowPreview.map((task) => task.title)).toEqual([
      "Due today but planned tomorrow",
      "Naturally tomorrow"
    ]);
    expect(viewModel.tomorrowPreview[0]).toMatchObject({
      plannedLane: "tomorrow",
      plannedSortOrder: 1024,
      addedManually: true
    });
    expect(viewModel.tomorrowPreview[1]).toMatchObject({
      plannedLane: null,
      plannedSortOrder: null,
      addedManually: false
    });
  });

  it("plans, reorders, unplans, and logs daily planning activity", async () => {
    const taskService = createTaskService();
    const dailyPlanService = createDailyPlanService();
    const first = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "First planned task"
    });
    const second = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Second planned task"
    });

    const plan = await dailyPlanService.getOrCreateDailyPlan({
      workspaceId: "workspace_1",
      date: "2026-05-15"
    });
    await dailyPlanService.planTask({
      workspaceId: "workspace_1",
      date: "2026-05-15",
      itemId: first.item.id,
      lane: "today",
      sortOrder: 2048
    });
    await dailyPlanService.planTask({
      workspaceId: "workspace_1",
      date: "2026-05-15",
      itemId: second.item.id,
      lane: "today",
      sortOrder: 1024
    });

    expect(plan).toMatchObject({
      workspaceId: "workspace_1",
      planDate: "2026-05-15"
    });
    expect(dailyPlanService.getPlannedTasks({
      workspaceId: "workspace_1",
      date: "2026-05-15",
      lane: "today"
    }).map((task) => task.itemId)).toEqual([second.item.id, first.item.id]);

    await dailyPlanService.reorderPlannedTask({
      workspaceId: "workspace_1",
      date: "2026-05-15",
      itemId: first.item.id,
      lane: "today",
      sortOrder: 512
    });

    expect(dailyPlanService.getPlannedTasks({
      workspaceId: "workspace_1",
      date: "2026-05-15",
      lane: "today"
    }).map((task) => task.itemId)).toEqual([first.item.id, second.item.id]);

    const removed = await dailyPlanService.unplanTask({
      workspaceId: "workspace_1",
      date: "2026-05-15",
      itemId: second.item.id,
      lane: "today"
    });

    expect(removed).toHaveLength(1);
    expect(dailyPlanService.getPlannedTasks({
      workspaceId: "workspace_1",
      date: "2026-05-15",
      lane: "today"
    }).map((task) => task.itemId)).toEqual([first.item.id]);
    expect(new ActivityLogRepository(connection).listRecent("workspace_1", 3)
      .map((event) => event.action)).toEqual([
        "task_unplanned",
        "task_plan_reordered",
        "task_planned"
      ]);
  });

  it("rejects invalid inputs", () => {
    const service = createTodayService();

    expect(() =>
      service.getTodayViewModel({ workspaceId: " ", backlogDays: 3 })
    ).toThrow("workspaceId must be a non-empty string.");
    expect(() =>
      service.getTodayViewModel({ workspaceId: "workspace_1", backlogDays: 0 })
    ).toThrow("backlogDays must be an integer between 1 and 365.");
  });
});

function createTaskService(): TaskService {
  return new TaskService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => NOW
  });
}

function createTodayService(): TodayService {
  return new TodayService({
    connection,
    now: () => NOW
  });
}

function createDailyPlanService(): DailyPlanService {
  return new DailyPlanService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => NOW
  });
}
