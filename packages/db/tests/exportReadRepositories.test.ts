import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ContainerTabRepository,
  DailyPlanRepository,
  DashboardRepository,
  ItemRepository,
  ListRepository,
  RelationshipRepository,
  TagRepository,
  TaskRepository,
  type DatabaseConnection
} from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("export repository read methods", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    seedExportRows();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("lists workspace-scoped rows needed by full JSON export", () => {
    expect(
      new ContainerTabRepository(connection).listByWorkspace("workspace_1")
    ).toMatchObject([{ id: "container_tab_1" }]);
    expect(
      new TaskRepository(connection).listDetailsByWorkspace("workspace_1")
    ).toMatchObject([{ itemId: "item_task_1" }]);
    expect(
      new ListRepository(connection).listDetailsByWorkspace("workspace_1")
    ).toMatchObject([{ itemId: "item_list_1" }]);
    expect(
      new TagRepository(connection).listTaggingsByWorkspace("workspace_1")
    ).toMatchObject([{ id: "tagging_1", targetId: "item_task_1" }]);
    expect(
      new RelationshipRepository(connection).listByWorkspace("workspace_1")
    ).toMatchObject([{ id: "relationship_1" }]);
    expect(
      new DashboardRepository(connection).listByWorkspace("workspace_1")
    ).toMatchObject([{ id: "dashboard_1" }]);
    expect(
      new DashboardRepository(connection).listWidgetsByWorkspace("workspace_1")
    ).toMatchObject([{ id: "dashboard_widget_1" }]);
    expect(
      new DailyPlanRepository(connection).listPlansByWorkspace("workspace_1")
    ).toMatchObject([{ id: "daily_plan_1" }]);
    expect(
      new DailyPlanRepository(connection).listPlanItemsByWorkspace("workspace_1")
    ).toMatchObject([{ id: "daily_plan_item_1" }]);
  });
});

function seedExportRows(): void {
  new ContainerRepository(connection).create({
    id: "container_project_1",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    timestamp: TEST_TIMESTAMP
  });
  new ContainerTabRepository(connection).create({
    id: "container_tab_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    timestamp: TEST_TIMESTAMP
  });
  new ItemRepository(connection).create({
    id: "item_task_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    type: "task",
    title: "Call supplier",
    timestamp: TEST_TIMESTAMP
  });
  new TaskRepository(connection).createDetails({
    itemId: "item_task_1",
    workspaceId: "workspace_1",
    timestamp: TEST_TIMESTAMP
  });
  new ItemRepository(connection).create({
    id: "item_list_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    type: "list",
    title: "Launch checklist",
    timestamp: TEST_TIMESTAMP
  });
  new ListRepository(connection).createDetails({
    itemId: "item_list_1",
    workspaceId: "workspace_1",
    timestamp: TEST_TIMESTAMP
  });
  const tagRepository = new TagRepository(connection);
  tagRepository.create({
    id: "tag_1",
    workspaceId: "workspace_1",
    name: "Launch",
    slug: "launch",
    timestamp: TEST_TIMESTAMP
  });
  tagRepository.createTagging({
    id: "tagging_1",
    workspaceId: "workspace_1",
    tagId: "tag_1",
    targetType: "item",
    targetId: "item_task_1",
    source: "manual",
    timestamp: TEST_TIMESTAMP
  });
  new RelationshipRepository(connection).create({
    id: "relationship_1",
    workspaceId: "workspace_1",
    sourceType: "item",
    sourceId: "item_task_1",
    targetType: "item",
    targetId: "item_list_1",
    relationType: "related",
    timestamp: TEST_TIMESTAMP
  });
  const dashboardRepository = new DashboardRepository(connection);
  dashboardRepository.createDefaultDashboard({
    id: "dashboard_1",
    workspaceId: "workspace_1",
    timestamp: TEST_TIMESTAMP
  });
  dashboardRepository.createWidget({
    id: "dashboard_widget_1",
    workspaceId: "workspace_1",
    dashboardId: "dashboard_1",
    type: "today",
    title: "Today",
    configJson: "{}",
    positionJson: "{}",
    sortOrder: 1,
    timestamp: TEST_TIMESTAMP
  });
  const dailyPlanRepository = new DailyPlanRepository(connection);
  dailyPlanRepository.createPlan({
    id: "daily_plan_1",
    workspaceId: "workspace_1",
    planDate: "2026-05-06",
    timestamp: TEST_TIMESTAMP
  });
  dailyPlanRepository.createPlanItem({
    id: "daily_plan_item_1",
    workspaceId: "workspace_1",
    dailyPlanId: "daily_plan_1",
    itemType: "task",
    itemId: "item_task_1",
    lane: "today",
    sortOrder: 1,
    timestamp: TEST_TIMESTAMP
  });
}
