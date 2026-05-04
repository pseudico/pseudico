import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DashboardRepository, type DatabaseConnection } from "../src";
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
});

