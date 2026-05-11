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
import { ListService, TaskService, TimelineService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = new Date(2026, 4, 15, 9, 30, 0, 0);
const TIMESTAMP = "2026-05-01T00:00:00.000Z";

describe("TimelineService", () => {
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
    new CategoryRepository(connection).create({
      id: "category_sales",
      workspaceId: "workspace_1",
      name: "Sales",
      slug: "sales",
      color: "green",
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
    new ContainerRepository(connection).create({
      id: "container_project_2",
      workspaceId: "workspace_1",
      type: "project",
      name: "Client Rollout",
      slug: "client-rollout",
      timestamp: TIMESTAMP
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("returns dated tasks in range and hides completed tasks by default", async () => {
    const taskService = createTaskService();
    const list = await createListService().createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch list"
    });
    const launch = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist",
      dueAt: "2026-05-15T12:00:00.000Z",
      priority: 2
    });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_2",
      title: "Spanning rollout",
      startAt: "2026-05-14T09:00:00.000Z",
      dueAt: "2026-05-17T17:00:00.000Z",
      categoryId: "category_sales"
    });
    const completed = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Completed launch prep",
      dueAt: "2026-05-15T14:00:00.000Z"
    });
    await taskService.completeTask(completed.item.id);
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Outside range",
      dueAt: "2026-05-20T12:00:00.000Z"
    });
    const listItem = await createListService().addListItem({
      listId: list.item.id,
      title: "Confirm rollout list row",
      startAt: "2026-05-15T08:00:00.000Z",
      dueAt: "2026-05-15T10:00:00.000Z"
    });

    const service = createTimelineService();
    const items = service.getTimelineItems({
      workspaceId: "workspace_1",
      start: "2026-05-15",
      end: "2026-05-16"
    });

    expect(items.map((item) => item.title)).toEqual([
      "Spanning rollout",
      "Confirm rollout list row",
      "Launch checklist"
    ]);
    expect(items[1]).toMatchObject({
      itemId: listItem.listItem.id,
      kind: "list_item",
      priority: null,
      timelineStartAt: "2026-05-15T08:00:00.000Z",
      timelineEndAt: "2026-05-15T10:00:00.000Z",
      navigationTarget: {
        targetType: "list_item",
        targetId: listItem.listItem.id,
        sourceItemId: list.item.id
      }
    });
    expect(items[2]).toMatchObject({
      itemId: launch.item.id,
      kind: "task",
      containerId: "container_project_1",
      containerName: "Launch Plan",
      categoryId: "category_ops",
      categoryName: "Operations",
      priority: 2,
      timelineStartAt: "2026-05-15T12:00:00.000Z",
      timelineEndAt: "2026-05-15T12:00:00.000Z",
      navigationTarget: {
        targetType: "item",
        targetId: launch.item.id,
        containerId: "container_project_1",
        workspaceId: "workspace_1",
        sourceItemId: null
      }
    });
    expect(service.getTimelineItems({
      workspaceId: "workspace_1",
      start: "2026-05-15",
      end: "2026-05-16",
      includeCompleted: true
    }).map((item) => item.title)).toContain("Completed launch prep");
  });

  it("groups timeline tasks by project or category", async () => {
    const taskService = createTaskService();
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch task",
      dueAt: "2026-05-15T12:00:00.000Z"
    });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_2",
      title: "Sales task",
      dueAt: "2026-05-15T13:00:00.000Z",
      categoryId: "category_sales"
    });

    const byProject = createTimelineService().groupTimelineItems({
      workspaceId: "workspace_1",
      start: "2026-05-15",
      end: "2026-05-16",
      groupBy: "project"
    });
    const byCategory = createTimelineService().groupTimelineItems({
      workspaceId: "workspace_1",
      start: "2026-05-15",
      end: "2026-05-16",
      groupBy: "category"
    });

    expect(byProject).toMatchObject({
      workspaceId: "workspace_1",
      generatedAt: NOW.toISOString(),
      includeCompleted: false,
      groupBy: "project",
      totalCount: 2,
      groups: [
        { key: "container_project_2", label: "Client Rollout", itemCount: 1 },
        { key: "container_project_1", label: "Launch Plan", itemCount: 1 }
      ]
    });
    expect(byCategory.groups.map((group) => group.label)).toEqual([
      "Operations",
      "Sales"
    ]);
  });

  it("rejects invalid ranges and workspace ids", () => {
    const service = createTimelineService();

    expect(() =>
      service.groupTimelineItems({
        workspaceId: " ",
        start: "2026-05-15",
        end: "2026-05-16"
      })
    ).toThrow("workspaceId must be a non-empty string.");
    expect(() =>
      service.setTimelineRange({
        start: "2026-05-16",
        end: "2026-05-15"
      })
    ).toThrow("range end must be after range start.");
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

function createTimelineService(): TimelineService {
  return new TimelineService({
    connection,
    now: () => NOW
  });
}

function createListService(): ListService {
  return new ListService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => NOW
  });
}
