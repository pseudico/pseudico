import {
  ActivityLogRepository,
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  TaskService,
  WorkflowRunHistoryService,
  WorkflowService
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = "2026-05-02T01:02:03.000Z";

describe("WorkflowRunHistoryService", () => {
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
    new ContainerRepository(connection).create({
      id: "container_project_2",
      workspaceId: "workspace_1",
      type: "project",
      name: "Follow Ups",
      slug: "follow-ups",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    new CategoryRepository(connection).create({
      id: "category_1",
      workspaceId: "workspace_1",
      name: "Client",
      slug: "client",
      color: "#123456",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("lists persisted run history with action targets, diagnostics, and undoable activities", async () => {
    const task = await createTask("Prepare launch");
    const workflow = await createWorkflowService().createWorkflow({
      workspaceId: "workspace_1",
      name: "Prepare follow-up",
      actions: [
        {
          type: "add_tag",
          targetType: "item",
          targetId: task.item.id,
          tagName: "Follow Up"
        },
        {
          type: "move_item",
          itemId: task.item.id,
          targetContainerId: "container_project_2"
        },
        {
          type: "create_task",
          containerId: "container_project_2",
          title: "Book review call"
        }
      ]
    });

    const result = await createWorkflowService().runManualWorkflow({
      workflowId: workflow.id
    });
    const [history] = createRunHistoryService().listRunHistory({
      workspaceId: "workspace_1"
    });

    expect(history.run.id).toBe(result.run.id);
    expect(history.actions).toHaveLength(3);
    expect(history.actions.map((action) => action.actionType)).toEqual([
      "add_tag",
      "move_item",
      "create_task"
    ]);
    expect(history.actions.every((action) => action.activityIds.length > 0)).toBe(true);
    expect(history.diagnostics).toMatchObject({
      runId: result.run.id,
      workflowDefinitionId: workflow.id,
      status: "completed",
      triggerType: "manual",
      canRollback: true,
      actionCount: 3,
      completedActionCount: 3,
      skippedActionCount: 0
    });
    expect(history.diagnostics.undoableActivityIds.length).toBeGreaterThanOrEqual(3);
  });

  it("rolls back undoable workflow run activities in reverse order", async () => {
    const task = await createTask("Prepare launch");
    const workflow = await createWorkflowService().createWorkflow({
      workspaceId: "workspace_1",
      name: "Rollback follow-up",
      actions: [
        {
          type: "add_tag",
          targetType: "item",
          targetId: task.item.id,
          tagName: "Follow Up"
        },
        {
          type: "set_category",
          targetType: "item",
          targetId: task.item.id,
          categoryId: "category_1"
        },
        {
          type: "move_item",
          itemId: task.item.id,
          targetContainerId: "container_project_2"
        },
        {
          type: "create_task",
          containerId: "container_project_2",
          title: "Book review call"
        }
      ]
    });
    const result = await createWorkflowService().runManualWorkflow({
      workflowId: workflow.id
    });

    const rollback = await createRunHistoryService().rollbackRun({
      runId: result.run.id
    });

    expect(rollback.status).toBe("completed");
    expect(rollback.failed).toEqual([]);
    expect(new ItemRepository(connection).getById(task.item.id)).toMatchObject({
      containerId: "container_project_1",
      categoryId: null
    });
    expect(
      new TagRepository(connection).listTagsForTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: task.item.id
      })
    ).toEqual([]);
    expect(
      new TaskRepository(connection)
        .listByContainer("container_project_2")
        .map((record) => record.item.title)
    ).toEqual([]);
    expect(createRunHistoryService().getRunHistory(result.run.id).diagnostics).toMatchObject({
      canRollback: false,
      rollbackStatus: "completed"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("workflow", workflow.id)
        .map((event) => event.action)
    ).toEqual([
      "workflow_created",
      "workflow_run_completed",
      "workflow_run_rolled_back"
    ]);
  });

  it("surfaces failure diagnostics for blocked workflow previews", async () => {
    const workflow = await createWorkflowService().createWorkflow({
      workspaceId: "workspace_1",
      name: "Invalid date math",
      actions: [
        {
          type: "create_task",
          containerId: "container_project_1",
          title: "Impossible follow-up",
          startAt: "{{today+1w}}",
          dueAt: "{{today}}"
        }
      ]
    });

    const result = await createWorkflowService().runManualWorkflow({
      workflowId: workflow.id
    });
    const diagnostics = createRunHistoryService().getRunDiagnostics(result.run.id);

    expect(diagnostics).toMatchObject({
      status: "failed",
      canRollback: false,
      errorMessage: "Workflow preview has blocked actions.",
      failedActionCount: 1
    });
    expect(diagnostics.issues).toContain("Workflow preview has blocked actions.");
  });
});

async function createTask(title: string) {
  return await new TaskService({
    connection,
    idFactory,
    now
  }).createTask({
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    title
  });
}

function createWorkflowService(): WorkflowService {
  return new WorkflowService({
    connection,
    idFactory,
    now
  });
}

function createRunHistoryService(): WorkflowRunHistoryService {
  return new WorkflowRunHistoryService({
    connection,
    idFactory,
    now
  });
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function now(): Date {
  return new Date(NOW);
}
