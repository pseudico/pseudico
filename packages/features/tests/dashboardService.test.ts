import {
  ActivityLogRepository,
  ContainerRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DashboardService, ProjectService, TaskService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = new Date(2026, 4, 15, 9, 30, 0, 0);

describe("DashboardService", () => {
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

  it("loads or creates the default dashboard widgets with activity logs", async () => {
    const viewModel = await createDashboardService().getDefaultDashboard({
      workspaceId: "workspace_1"
    });

    expect(viewModel.dashboard).toMatchObject({
      id: "dashboard_1",
      workspaceId: "workspace_1",
      isDefault: true
    });
    expect(viewModel.widgets.map((widget) => widget.widget.type)).toEqual([
      "today",
      "overdue",
      "upcoming",
      "favorites",
      "recent_activity"
    ]);
    expect(viewModel.widgets.every((widget) => widget.data !== null)).toBe(true);
    expect(new ActivityLogRepository(connection).listRecent("workspace_1", 20)
      .map((event) => event.action)).toEqual([
        "dashboard_widget_created",
        "dashboard_widget_created",
        "dashboard_widget_created",
        "dashboard_widget_created",
        "dashboard_widget_created",
        "dashboard_created"
      ]);

    const secondLoad = await createDashboardService().getDefaultDashboard({
      workspaceId: "workspace_1"
    });

    expect(secondLoad.dashboard.id).toBe(viewModel.dashboard.id);
    expect(new ActivityLogRepository(connection).listRecent("workspace_1", 20))
      .toHaveLength(6);
  });

  it("returns limited widget data with navigation targets", async () => {
    const taskService = createTaskService();
    const first = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "First due today",
      dueAt: new Date(2026, 4, 15, 10).toISOString()
    });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Second due today",
      dueAt: new Date(2026, 4, 15, 11).toISOString()
    });

    const data = createDashboardService().getTodayWidgetData({
      workspaceId: "workspace_1",
      limit: 1
    });

    expect(data).toMatchObject({
      widgetType: "today",
      page: {
        limit: 1,
        offset: 0,
        totalCount: 2,
        hasMore: true
      }
    });
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({
      kind: "task",
      itemId: first.item.id,
      title: "First due today",
      navigationTarget: {
        targetType: "item",
        targetId: first.item.id,
        workspaceId: "workspace_1"
      }
    });
  });

  it("updates dashboard task and activity widgets from live data changes", async () => {
    const taskService = createTaskService();
    const overdue = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Past due",
      dueAt: new Date(2026, 4, 14, 8).toISOString()
    });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Upcoming",
      dueAt: new Date(2026, 4, 16, 8).toISOString()
    });

    const beforeComplete = createDashboardService().getOverdueWidgetData({
      workspaceId: "workspace_1"
    });
    await taskService.completeTask(overdue.item.id);
    const afterComplete = createDashboardService().getOverdueWidgetData({
      workspaceId: "workspace_1"
    });
    const recentActivity = createDashboardService().getRecentActivityWidgetData({
      workspaceId: "workspace_1",
      limit: 1
    });

    expect(beforeComplete.items.map((item) => item.title)).toEqual(["Past due"]);
    expect(afterComplete.items).toEqual([]);
    expect(createDashboardService().getUpcomingWidgetData({
      workspaceId: "workspace_1"
    }).items.map((item) => item.title)).toEqual(["Upcoming"]);
    expect(recentActivity.items[0]).toMatchObject({
      kind: "activity",
      action: "task_completed",
      targetNavigationTarget: {
        targetType: "item",
        targetId: overdue.item.id,
        workspaceId: "workspace_1"
      }
    });
  });

  it("returns favourite projects for the favorites widget", async () => {
    await createProjectService().createProject({
      workspaceId: "workspace_1",
      name: "Favorite Project",
      isFavorite: true
    });
    await createProjectService().createProject({
      workspaceId: "workspace_1",
      name: "Normal Project",
      isFavorite: false
    });

    const data = createDashboardService().getWidgetData("missing_widget");
    const favorites = createDashboardService().getDefaultDashboard({
      workspaceId: "workspace_1"
    });

    await expect(favorites).resolves.toMatchObject({
      widgets: expect.arrayContaining([
        expect.objectContaining({
          widget: expect.objectContaining({ type: "favorites" }),
          data: expect.objectContaining({
            widgetType: "favorites",
            items: [
              expect.objectContaining({
                kind: "project",
                name: "Favorite Project"
              })
            ]
          })
        })
      ])
    });
    expect(data).toBeNull();
  });
});

function createDashboardService(): DashboardService {
  return new DashboardService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => NOW
  });
}

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

function createProjectService(): ProjectService {
  return new ProjectService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => NOW
  });
}

