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
import {
  CategoryService,
  FileAttachmentService,
  TagService,
  TaskService,
  WORKFLOW_TRIGGER_ITEM_ID_TOKEN,
  WORKFLOW_TRIGGER_TARGET_ID_TOKEN,
  WorkflowService,
  WorkflowTriggerService
} from "../src";

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

  it("runs item-created workflows when type, text, category, and container filters match", async () => {
    const workflowService = createWorkflowService();
    const workflow = await workflowService.createWorkflow({
      workspaceId: "workspace_1",
      name: "Finance triage",
      trigger: {
        type: "item_created",
        filters: {
          itemTypes: ["task"],
          textIncludes: "invoice",
          categoryIds: ["category_1"],
          containerIds: ["container_project_1"]
        }
      },
      actions: [
        {
          type: "add_tag",
          targetType: "item",
          targetId: WORKFLOW_TRIGGER_ITEM_ID_TOKEN,
          tagName: "Finance"
        }
      ]
    });
    const triggerService = new WorkflowTriggerService({
      connection,
      idFactory,
      now
    });

    const task = await new TaskService({
      connection,
      idFactory,
      now,
      itemCreatedWorkflowHook: triggerService
    }).createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      categoryId: "category_1",
      title: "Send invoice"
    });

    expect(
      new TagRepository(connection)
        .listTagsForTarget({
          workspaceId: "workspace_1",
          targetType: "item",
          targetId: task.item.id
        })
        .map((tag) => tag.slug)
    ).toEqual(["finance"]);
    expect(new WorkflowRepository(connection).listRunsForWorkflow(workflow.id)).toMatchObject([
      {
        workflowDefinitionId: workflow.id,
        triggerType: "item_created",
        status: "completed"
      }
    ]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("workflow", workflow.id)
        .map((event) => event.action)
    ).toEqual(["workflow_created", "workflow_run_completed"]);
  });

  it("interpolates item, container, today, and upstream action variables while honoring conditions", async () => {
    const workflowService = createWorkflowService();
    const workflow = await workflowService.createWorkflow({
      workspaceId: "workspace_1",
      name: "Variable follow-up",
      trigger: {
        type: "item_created",
        filters: {
          textIncludes: "invoice"
        }
      },
      actions: [
        {
          type: "create_task",
          containerId: "{{item.containerId}}",
          title: "Review {{item.title}} for {{container.name}} on {{today}}",
          condition: {
            left: "{{item.title}}",
            op: "contains",
            right: "invoice"
          }
        },
        {
          type: "add_tag",
          targetType: "item",
          targetId: "{{previous.targetId}}",
          tagName: "Spawned from {{item.title}}"
        },
        {
          type: "create_task",
          containerId: "{{item.containerId}}",
          title: "Skipped quote task",
          condition: {
            left: "{{item.title}}",
            op: "contains",
            right: "quote"
          }
        }
      ]
    });

    await new TaskService({
      connection,
      idFactory,
      now,
      itemCreatedWorkflowHook: new WorkflowTriggerService({ connection, idFactory, now })
    }).createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Send invoice"
    });

    const tasks = new TaskRepository(connection).listByContainer("container_project_1");
    expect(tasks.map((record) => record.item.title)).toEqual([
      "Send invoice",
      "Review Send invoice for Launch Plan on 2026-05-02"
    ]);
    expect(
      new TagRepository(connection)
        .listTagsForTarget({
          workspaceId: "workspace_1",
          targetType: "item",
          targetId: tasks[1].item.id
        })
        .map((tag) => tag.slug)
    ).toEqual(["spawned-from-send-invoice"]);

    const [run] = new WorkflowRepository(connection).listRunsForWorkflow(workflow.id);
    expect(run).toMatchObject({
      workflowDefinitionId: workflow.id,
      triggerType: "item_created",
      status: "completed"
    });
    expect(JSON.parse(run.actionResultsJson ?? "[]")).toMatchObject([
      { actionType: "create_task", status: "completed", targetId: tasks[1].item.id },
      { actionType: "add_tag", status: "completed", targetId: tasks[1].item.id },
      { actionType: "create_task", status: "skipped", targetId: null }
    ]);
    const firstPreview = JSON.parse(run.previewJson).actionPreviews[0];
    expect(firstPreview).toMatchObject({
      actionType: "create_task",
      status: "ready"
    });
    expect(firstPreview.interpolations).toEqual(expect.arrayContaining([
      { token: "{{item.title}}", path: "item.title", value: "Send invoice" },
      { token: "{{item.containerId}}", path: "item.containerId", value: "container_project_1" },
      { token: "{{container.name}}", path: "container.name", value: "Launch Plan" },
      { token: "{{today}}", path: "today", value: "2026-05-02" }
    ]));
  });

  it("fails safely when workflow variables are missing from the execution context", async () => {
    const service = createWorkflowService();
    const workflow = await service.createWorkflow({
      workspaceId: "workspace_1",
      name: "Needs item context",
      actions: [
        {
          type: "create_task",
          containerId: "container_project_1",
          title: "Review {{item.title}}"
        }
      ]
    });

    const preview = await service.previewWorkflowRun({ workflowId: workflow.id });
    const result = await service.runManualWorkflow({ workflowId: workflow.id });

    expect(preview).toMatchObject({
      canRun: false,
      actionPreviews: [{ status: "blocked" }]
    });
    expect(result.run).toMatchObject({
      status: "failed",
      errorMessage: "Workflow preview has blocked actions."
    });
    expect(JSON.parse(result.run.previewJson).actionPreviews[0]).toMatchObject({
      reason: "Workflow variables could not be resolved: item.title."
    });
    expect(new TaskRepository(connection).listByContainer("container_project_1")).toEqual([]);
  });

  it("skips item-created workflows when filters do not match", async () => {
    const workflowService = createWorkflowService();
    const workflow = await workflowService.createWorkflow({
      workspaceId: "workspace_1",
      name: "Invoice-only",
      trigger: {
        type: "item_created",
        filters: {
          textIncludes: "invoice"
        }
      },
      actions: [
        {
          type: "add_tag",
          targetType: "item",
          targetId: WORKFLOW_TRIGGER_ITEM_ID_TOKEN,
          tagName: "Finance"
        }
      ]
    });

    await new TaskService({
      connection,
      idFactory,
      now,
      itemCreatedWorkflowHook: new WorkflowTriggerService({ connection, idFactory, now })
    }).createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Prepare agenda"
    });

    expect(new WorkflowRepository(connection).listRunsForWorkflow(workflow.id)).toEqual([]);
  });

  it("prevents item-created workflow loops while recording triggered run history", async () => {
    const workflowService = createWorkflowService();
    const workflow = await workflowService.createWorkflow({
      workspaceId: "workspace_1",
      name: "Spawn follow-up",
      trigger: {
        type: "item_created",
        filters: {
          textIncludes: "invoice"
        }
      },
      actions: [
        {
          type: "create_task",
          containerId: "container_project_1",
          title: "Review invoice trail"
        }
      ]
    });

    await new TaskService({
      connection,
      idFactory,
      now,
      itemCreatedWorkflowHook: new WorkflowTriggerService({ connection, idFactory, now })
    }).createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Invoice arrived"
    });

    expect(new WorkflowRepository(connection).listRunsForWorkflow(workflow.id)).toHaveLength(1);
    expect(
      new TaskRepository(connection)
        .listByContainer("container_project_1")
        .map((record) => record.item.title)
    ).toEqual(["Invoice arrived", "Review invoice trail"]);
  });

  it("runs file-imported workflows when extension, MIME, name, size, and container filters match", async () => {
    const workflowService = createWorkflowService();
    const workflow = await workflowService.createWorkflow({
      workspaceId: "workspace_1",
      name: "Receipt triage",
      trigger: {
        type: "file_imported",
        filters: {
          extensions: [".PDF"],
          mimeTypes: ["application/pdf"],
          nameIncludes: "receipt",
          minSizeBytes: 100,
          maxSizeBytes: 5_000,
          containerIds: ["container_project_1"]
        }
      },
      actions: [
        {
          type: "add_tag",
          targetType: "item",
          targetId: WORKFLOW_TRIGGER_ITEM_ID_TOKEN,
          tagName: "Receipt"
        },
        {
          type: "set_category",
          targetType: "item",
          targetId: WORKFLOW_TRIGGER_ITEM_ID_TOKEN,
          categoryId: "category_1"
        },
        {
          type: "create_task",
          containerId: "container_project_1",
          title: "Review imported receipt"
        }
      ]
    });

    const result = await new FileAttachmentService({
      connection,
      idFactory,
      now,
      fileImportedWorkflowHook: new WorkflowTriggerService({ connection, idFactory, now })
    }).attachFileToContainer({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      copiedFile: {
        attachmentId: "attachment_receipt",
        originalName: "May Receipt.PDF",
        storedName: "May Receipt.PDF",
        storagePath: "attachments/2026/05/attachment_receipt/May Receipt.PDF",
        sizeBytes: 512,
        checksum: "c".repeat(64),
        mimeType: "application/pdf"
      }
    });

    expect(
      new TagRepository(connection)
        .listTagsForTarget({
          workspaceId: "workspace_1",
          targetType: "item",
          targetId: result.item.id
        })
        .map((tag) => tag.slug)
    ).toEqual(["receipt"]);
    expect(new ItemRepository(connection).getById(result.item.id)).toMatchObject({
      categoryId: "category_1"
    });
    expect(
      new TaskRepository(connection)
        .listByContainer("container_project_1")
        .map((record) => record.item.title)
    ).toEqual(["Review imported receipt"]);

    const [run] = new WorkflowRepository(connection).listRunsForWorkflow(workflow.id);
    expect(run).toMatchObject({
      workflowDefinitionId: workflow.id,
      triggerType: "file_imported",
      status: "completed"
    });
    expect(JSON.parse(run.previewJson)).toMatchObject({
      triggerType: "file_imported",
      triggerItemId: result.item.id,
      triggerAttachmentId: "attachment_receipt",
      file: {
        originalName: "May Receipt.PDF",
        extension: "pdf",
        mimeType: "application/pdf",
        sizeBytes: 512,
        containerId: "container_project_1"
      }
    });
  });

  it("skips file-imported workflows when file metadata filters do not match", async () => {
    const workflowService = createWorkflowService();
    const workflow = await workflowService.createWorkflow({
      workspaceId: "workspace_1",
      name: "PDF receipts",
      trigger: {
        type: "file_imported",
        filters: {
          extensions: ["pdf"],
          nameIncludes: "receipt"
        }
      },
      actions: [
        {
          type: "add_tag",
          targetType: "item",
          targetId: WORKFLOW_TRIGGER_ITEM_ID_TOKEN,
          tagName: "Receipt"
        }
      ]
    });

    await new FileAttachmentService({
      connection,
      idFactory,
      now,
      fileImportedWorkflowHook: new WorkflowTriggerService({ connection, idFactory, now })
    }).attachFileToContainer({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      copiedFile: {
        attachmentId: "attachment_image",
        originalName: "Whiteboard.png",
        storedName: "Whiteboard.png",
        storagePath: "attachments/2026/05/attachment_image/Whiteboard.png",
        sizeBytes: 512,
        checksum: "d".repeat(64),
        mimeType: "image/png"
      }
    });

    expect(new WorkflowRepository(connection).listRunsForWorkflow(workflow.id)).toEqual([]);
  });

  it("runs tag-added workflows and avoids loops when workflow actions add metadata", async () => {
    const task = await createTask("Waiting on contract");
    const workflowService = createWorkflowService();
    const workflow = await workflowService.createWorkflow({
      workspaceId: "workspace_1",
      name: "Move waiting work",
      trigger: {
        type: "tag_added",
        filters: {
          targetTypes: ["item"],
          tagSlugs: ["waiting"]
        }
      },
      actions: [
        {
          type: "move_item",
          itemId: WORKFLOW_TRIGGER_TARGET_ID_TOKEN,
          targetContainerId: "container_project_2"
        },
        {
          type: "add_tag",
          targetType: "item",
          targetId: WORKFLOW_TRIGGER_TARGET_ID_TOKEN,
          tagName: "Automated"
        }
      ]
    });

    await new TagService({
      connection,
      idFactory,
      now,
      workflowHook: new WorkflowTriggerService({ connection, idFactory, now })
    }).addTagToTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: task.item.id,
      name: "Waiting"
    });

    expect(new ItemRepository(connection).getById(task.item.id)).toMatchObject({
      containerId: "container_project_2"
    });
    expect(
      new TagRepository(connection)
        .listTagsForTarget({
          workspaceId: "workspace_1",
          targetType: "item",
          targetId: task.item.id
        })
        .map((tag) => tag.slug)
        .sort()
    ).toEqual(["automated", "waiting"]);
    expect(new WorkflowRepository(connection).listRunsForWorkflow(workflow.id)).toHaveLength(1);
  });

  it("runs category-assigned workflows when target and category filters match", async () => {
    const task = await createTask("Categorize invoice");
    const workflowService = createWorkflowService();
    const workflow = await workflowService.createWorkflow({
      workspaceId: "workspace_1",
      name: "Finance follow-up",
      trigger: {
        type: "category_assigned",
        filters: {
          targetTypes: ["item"],
          categoryIds: ["category_1"]
        }
      },
      actions: [
        {
          type: "create_task",
          containerId: "container_project_1",
          title: "Review categorized item"
        }
      ]
    });

    await new CategoryService({
      connection,
      idFactory,
      now,
      workflowHook: new WorkflowTriggerService({ connection, idFactory, now })
    }).assignCategoryToItem({
      workspaceId: "workspace_1",
      itemId: task.item.id,
      categoryId: "category_1"
    });

    expect(
      new TaskRepository(connection)
        .listByContainer("container_project_1")
        .map((record) => record.item.title)
    ).toEqual(["Categorize invoice", "Review categorized item"]);
    expect(new WorkflowRepository(connection).listRunsForWorkflow(workflow.id)).toMatchObject([
      {
        workflowDefinitionId: workflow.id,
        triggerType: "category_assigned",
        status: "completed"
      }
    ]);
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
