import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WorkflowRepository, type DatabaseConnection } from "../src";
import {
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  createRepositoryTestDatabase,
  seedWorkspace,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let database: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("WorkflowRepository", () => {
  beforeEach(async () => {
    database = await createRepositoryTestDatabase();
    connection = database.connection;
    seedWorkspace(connection);
  });

  afterEach(async () => {
    await database.cleanup();
  });

  it("persists manual workflow definitions and lists them by workspace", () => {
    const repository = new WorkflowRepository(connection);
    const actionsJson = JSON.stringify([
      {
        type: "add_tag",
        targetType: "item",
        targetId: "item_1",
        tagName: "Follow up"
      }
    ]);

    const created = repository.createDefinition({
      id: "workflow_1",
      workspaceId: "workspace_1",
      name: "Follow-up prep",
      description: "Prepare a task for follow-up",
      actionsJson,
      timestamp: TEST_TIMESTAMP
    });

    expect(created).toMatchObject({
      id: "workflow_1",
      workspaceId: "workspace_1",
      name: "Follow-up prep",
      description: "Prepare a task for follow-up",
      triggerType: "manual",
      status: "enabled",
      actionsJson,
      createdAt: TEST_TIMESTAMP,
      updatedAt: TEST_TIMESTAMP,
      deletedAt: null
    });
    expect(repository.getDefinitionById("workflow_1")).toEqual(created);
    expect(repository.listDefinitions({ workspaceId: "workspace_1" })).toEqual([
      created
    ]);
  });

  it("records workflow runs and updates completion state", () => {
    const repository = new WorkflowRepository(connection);
    repository.createDefinition({
      id: "workflow_1",
      workspaceId: "workspace_1",
      name: "Follow-up prep",
      actionsJson: "[]",
      timestamp: TEST_TIMESTAMP
    });

    const run = repository.createRun({
      id: "workflow_run_1",
      workspaceId: "workspace_1",
      workflowDefinitionId: "workflow_1",
      status: "running",
      previewJson: JSON.stringify({ canRun: true }),
      startedAt: TEST_TIMESTAMP
    });
    const completed = repository.updateRun({
      id: run.id,
      status: "completed",
      actionResultsJson: JSON.stringify([{ index: 0, status: "completed" }]),
      completedAt: TEST_TIMESTAMP_LATER
    });

    expect(completed).toMatchObject({
      id: "workflow_run_1",
      workflowDefinitionId: "workflow_1",
      status: "completed",
      completedAt: TEST_TIMESTAMP_LATER,
      errorMessage: null
    });
    expect(repository.listRunsForWorkflow("workflow_1")).toEqual([completed]);
  });
});
