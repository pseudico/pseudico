import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DashboardRepository, SavedViewRepository, type DatabaseConnection } from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("DashboardRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates the default dashboard and persists ordered widgets", () => {
    const repository = new DashboardRepository(connection);
    const dashboard = repository.createDefaultDashboard({
      id: "dashboard_1",
      workspaceId: "workspace_1",
      timestamp: TEST_TIMESTAMP
    });
    const today = repository.createWidget({
      id: "widget_today",
      workspaceId: "workspace_1",
      dashboardId: dashboard.id,
      type: "today",
      title: "Today",
      sortOrder: 2,
      configJson: JSON.stringify({ limit: 5 }),
      positionJson: JSON.stringify({ column: 0, row: 0 }),
      timestamp: TEST_TIMESTAMP
    });
    const overdue = repository.createWidget({
      id: "widget_overdue",
      workspaceId: "workspace_1",
      dashboardId: dashboard.id,
      type: "overdue",
      title: "Overdue",
      sortOrder: 1,
      configJson: "{}",
      positionJson: JSON.stringify({ column: 1, row: 0 }),
      timestamp: TEST_TIMESTAMP
    });

    expect(repository.findDefaultDashboard("workspace_1")).toEqual(dashboard);
    expect(repository.getWidgetById(today.id)).toEqual(today);
    expect(repository.findWidgetByType({
      dashboardId: dashboard.id,
      type: "overdue"
    })).toEqual(overdue);
    expect(repository.listWidgetsByDashboard(dashboard.id).map((widget) =>
      widget.id
    )).toEqual(["widget_overdue", "widget_today"]);
  });

  it("updates layout, widget configuration, ordering, and soft deletion", () => {
    const repository = new DashboardRepository(connection);
    const dashboard = repository.createDefaultDashboard({
      id: "dashboard_1",
      workspaceId: "workspace_1",
      timestamp: TEST_TIMESTAMP
    });
    new SavedViewRepository(connection).create({
      id: "saved_view_1",
      workspaceId: "workspace_1",
      type: "dashboard_widget",
      name: "Phone Calls",
      queryJson: "{}",
      timestamp: TEST_TIMESTAMP
    });
    const widget = repository.createWidget({
      id: "widget_saved_view",
      workspaceId: "workspace_1",
      dashboardId: dashboard.id,
      type: "saved_view",
      title: "Calls",
      savedViewId: "saved_view_1",
      sortOrder: 0,
      configJson: JSON.stringify({ limit: 5 }),
      positionJson: JSON.stringify({ column: 0, row: 0, width: 1 }),
      timestamp: TEST_TIMESTAMP
    });

    const updatedDashboard = repository.updateDashboardLayout({
      dashboardId: dashboard.id,
      layoutJson: JSON.stringify({ columns: 3 }),
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    const updatedWidget = repository.updateWidget({
      widgetId: widget.id,
      title: "Phone calls",
      configJson: JSON.stringify({ limit: 8 }),
      positionJson: JSON.stringify({ column: 1, row: 0, width: 2 }),
      sortOrder: 2,
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    const deleted = repository.softDeleteWidget({
      widgetId: widget.id,
      timestamp: "2026-05-03T00:00:00.000Z"
    });

    expect(updatedDashboard.layoutJson).toBe(JSON.stringify({ columns: 3 }));
    expect(updatedWidget).toMatchObject({
      id: widget.id,
      title: "Phone calls",
      savedViewId: "saved_view_1",
      sortOrder: 2,
      configJson: JSON.stringify({ limit: 8 }),
      positionJson: JSON.stringify({ column: 1, row: 0, width: 2 })
    });
    expect(deleted.deletedAt).toBe("2026-05-03T00:00:00.000Z");
    expect(repository.getWidgetById(widget.id)).toBeNull();
    expect(repository.listWidgetsByDashboard(dashboard.id)).toEqual([]);
  });

});

