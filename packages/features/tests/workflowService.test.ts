import {
  ActivityLogRepository,
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  SearchIndexRepository,
  TagRepository,
  TaskRepository,
  WorkflowRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskService, WorkflowService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = "2026-05-02T01:02:03.000Z";

describe("WorkflowService", () => {
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

  it("creates, previews, and runs a manual workflow through existing services", async () => {
    const task = await createTask("Prepare launch");
    const service = createWorkflowService();
    const workflow = await service.createWorkflow({
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
          title: "Book review call",
          body: "Created by workflow"
        }
      ]
    });

    const preview = await service.previewWorkflowRun({ workflowId: workflow.id });
    const result = await service.runManualWorkflow({ workflowId: workflow.id });

    expect(preview).toMatchObject({
      workflowId: workflow.id,
      canRun: true,
      actionPreviews: [
        { actionType: "add_tag", status: "ready" },
        { actionType: "set_category", status: "ready" },
        { actionType: "move_item", status: "ready" },
        { actionType: "create_task", status: "ready" }
      ]
    });
    expect(result.run).toMatchObject({
      workflowDefinitionId: workflow.id,
      status: "completed",
      errorMessage: null
    });
    expect(result.actionResults).toHaveLength(4);
    expect(new ItemRepository(connection).getById(task.item.id)).toMatchObject({
      containerId: "container_project_2",
      categoryId: "category_1"
    });
    expect(
      new TagRepository(connection)
        .listTagsForTarget({
          workspaceId: "workspace_1",
          targetType: "item",
          targetId: task.item.id
        })
        .map((tag) => tag.slug)
    ).toEqual(["follow-up"]);
    expect(
      new TaskRepository(connection)
        .listByContainer("container_project_2")
        .map((record) => record.item.title)
    ).toEqual(["Prepare launch", "Book review call"]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: task.item.id
      })
    ).toMatchObject({
      targetId: task.item.id,
      tags: "follow-up"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("workflow", workflow.id)
        .map((event) => event.action)
    ).toEqual(["workflow_created", "workflow_run_completed"]);
  });

  it("rolls back action writes and records a failed run when an action fails", async () => {
    const task = await createTask("Prepare launch");
    const service = createWorkflowService();
    const workflow = await service.createWorkflow({
      workspaceId: "workspace_1",
      name: "Invalid schedule",
      actions: [
        {
          type: "add_tag",
          targetType: "item",
          targetId: task.item.id,
          tagName: "Should Roll Back"
        },
        {
          type: "create_task",
          containerId: "container_project_1",
          title: "Impossible schedule",
          startAt: "2026-05-10T00:00:00.000Z",
          dueAt: "2026-05-01T00:00:00.000Z"
        }
      ]
    });

    const result = await service.runManualWorkflow({ workflowId: workflow.id });

    expect(result.run.status).toBe("failed");
    expect(result.run.errorMessage).toContain(
      "startAt must be before or equal to dueAt"
    );
    expect(
      new TagRepository(connection).listTagsForTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: task.item.id
      })
    ).toEqual([]);
    expect(
      new TaskRepository(connection)
        .listByContainer("container_project_1")
        .map((record) => record.item.title)
    ).toEqual(["Prepare launch"]);
    expect(new WorkflowRepository(connection).listRunsForWorkflow(workflow.id)).toHaveLength(1);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("workflow", workflow.id)
        .map((event) => event.action)
    ).toEqual(["workflow_created", "workflow_run_failed"]);
  });

  it("rejects enabling an unsupported non-local workflow definition", async () => {
    const service = createWorkflowService();

    await expect(
      service.createWorkflow({
        workspaceId: "workspace_1",
        name: "Remote webhook",
        actions: [
          {
            type: "http_request",
            url: "https://example.com/hook"
          } as never
        ]
      })
    ).rejects.toThrow("Workflow cannot be enabled");

    expect(new WorkflowRepository(connection).listDefinitions({ workspaceId: "workspace_1" })).toEqual([]);
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

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function now(): Date {
  return new Date(NOW);
}
