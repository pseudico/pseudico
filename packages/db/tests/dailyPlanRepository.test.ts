import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  DailyPlanRepository,
  ItemRepository,
  TaskRepository,
  type DatabaseConnection
} from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("DailyPlanRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: TEST_TIMESTAMP
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates plans, plans tasks into ordered lanes, and removes plan items", () => {
    createTask("item_first", "First task");
    createTask("item_second", "Second task");
    const repository = new DailyPlanRepository(connection);

    const plan = repository.createPlan({
      id: "daily_plan_1",
      workspaceId: "workspace_1",
      planDate: "2026-05-04",
      timestamp: TEST_TIMESTAMP
    });
    repository.createPlanItem({
      id: "daily_plan_item_1",
      workspaceId: "workspace_1",
      dailyPlanId: plan.id,
      itemType: "task",
      itemId: "item_second",
      lane: "today",
      sortOrder: 2048,
      timestamp: TEST_TIMESTAMP
    });
    repository.createPlanItem({
      id: "daily_plan_item_2",
      workspaceId: "workspace_1",
      dailyPlanId: plan.id,
      itemType: "task",
      itemId: "item_first",
      lane: "today",
      sortOrder: 1024,
      timestamp: TEST_TIMESTAMP
    });

    expect(repository.findPlanByDate({
      workspaceId: "workspace_1",
      planDate: "2026-05-04"
    })).toMatchObject({ id: "daily_plan_1" });
    expect(repository.getNextSortOrder({
      dailyPlanId: plan.id,
      lane: "today"
    })).toBe(3072);
    expect(repository.listPlannedTasks({
      workspaceId: "workspace_1",
      dailyPlanId: plan.id,
      lane: "today"
    }).map((record) => record.task.item.id)).toEqual([
      "item_first",
      "item_second"
    ]);

    const updated = repository.updatePlanItemSortOrder({
      dailyPlanId: plan.id,
      itemType: "task",
      itemId: "item_second",
      lane: "today",
      sortOrder: 512,
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(updated).toMatchObject({
      itemId: "item_second",
      sortOrder: 512,
      updatedAt: TEST_TIMESTAMP_LATER
    });
    expect(repository.listPlannedTasks({
      workspaceId: "workspace_1",
      dailyPlanId: plan.id,
      lane: "today"
    }).map((record) => record.task.item.id)).toEqual([
      "item_second",
      "item_first"
    ]);

    expect(repository.deletePlanItems({
      dailyPlanId: plan.id,
      itemType: "task",
      itemId: "item_first"
    })).toHaveLength(1);
    expect(repository.findPlanItemsForTarget({
      dailyPlanId: plan.id,
      itemType: "task",
      itemId: "item_first"
    })).toEqual([]);
  });

  it("excludes completed, archived, and deleted tasks from planned projections", () => {
    const active = createTask("item_active", "Active task");
    const completed = createTask("item_completed", "Completed task");
    const archived = createTask("item_archived", "Archived task");
    const deleted = createTask("item_deleted", "Deleted task");
    new TaskRepository(connection).updateDetails(completed.item.id, {
      taskStatus: "done",
      completedAt: TEST_TIMESTAMP_LATER,
      timestamp: TEST_TIMESTAMP_LATER
    });
    new ItemRepository(connection).update(completed.item.id, {
      completedAt: TEST_TIMESTAMP_LATER,
      timestamp: TEST_TIMESTAMP_LATER
    });
    new ItemRepository(connection).archive(archived.item.id, TEST_TIMESTAMP_LATER);
    new ItemRepository(connection).softDelete(deleted.item.id, TEST_TIMESTAMP_LATER);

    const repository = new DailyPlanRepository(connection);
    const plan = repository.createPlan({
      id: "daily_plan_1",
      workspaceId: "workspace_1",
      planDate: "2026-05-04",
      timestamp: TEST_TIMESTAMP
    });

    for (const task of [active, completed, archived, deleted]) {
      repository.createPlanItem({
        id: `daily_plan_${task.item.id}`,
        workspaceId: "workspace_1",
        dailyPlanId: plan.id,
        itemType: "task",
        itemId: task.item.id,
        lane: "today",
        sortOrder: 1024,
        timestamp: TEST_TIMESTAMP
      });
    }

    expect(repository.listPlannedTasks({
      workspaceId: "workspace_1",
      dailyPlanId: plan.id,
      lane: "today"
    }).map((record) => record.task.item.id)).toEqual(["item_active"]);
  });
});

function createTask(id: string, title: string) {
  const item = new ItemRepository(connection).create({
    id,
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    type: "task",
    title,
    timestamp: TEST_TIMESTAMP
  });
  const task = new TaskRepository(connection).createDetails({
    itemId: item.id,
    workspaceId: item.workspaceId,
    taskStatus: "open",
    timestamp: TEST_TIMESTAMP
  });

  return { item, task };
}
