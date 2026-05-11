import {
  ActivityLogRepository,
  AttachmentRepository,
  CategoryRepository,
  ContainerRepository,
  ListRepository,
  MigrationService,
  RelationshipRepository,
  SearchIndexRepository,
  TagRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ListService,
  RelationshipService,
  TagService,
  TaskListConversionService,
  TaskService
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("TaskListConversionService", () => {
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
      name: "Support Plan",
      slug: "support-plan",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    new CategoryRepository(connection).create({
      id: "category_ops",
      workspaceId: "workspace_1",
      name: "Ops",
      slug: "ops",
      color: "#ffaa00",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("converts a tagged dated task into a list while preserving metadata, attachments, relationships, activity, and search", async () => {
    const task = await createTaskService().createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Call launch supplier",
      body: "Confirm booth requirements",
      categoryId: "category_ops",
      dueAt: "2026-05-05",
      priority: 2,
      pinned: true
    });
    await createTagService().addTagToTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: task.item.id,
      name: "vendor"
    });
    new AttachmentRepository(connection).create({
      id: "attachment_1",
      workspaceId: "workspace_1",
      itemId: task.item.id,
      originalName: "brief.pdf",
      storedName: "brief.pdf",
      sizeBytes: 42,
      storagePath: "attachments/brief.pdf",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    await createRelationshipService().createRelationship({
      workspaceId: "workspace_1",
      source: { type: "item", id: task.item.id },
      target: { type: "container", id: "container_project_2" },
      relationType: "related"
    });

    const result = await createConversionService().convertTaskToList({
      taskId: task.item.id
    });

    expect(result.list.item).toMatchObject({
      type: "list",
      title: "Call launch supplier",
      body: "Confirm booth requirements",
      categoryId: "category_ops",
      pinned: true
    });
    expect(result.firstListItem).toMatchObject({
      listId: result.list.item.id,
      title: "Call launch supplier",
      body: "Confirm booth requirements",
      dueAt: "2026-05-05T00:00:00.000Z",
      status: "open"
    });
    expect(
      new TagRepository(connection).listTagsForTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: result.list.item.id
      })
    ).toMatchObject([{ slug: "vendor" }]);
    expect(
      new AttachmentRepository(connection).listForItem({
        workspaceId: "workspace_1",
        itemId: result.list.item.id
      })
    ).toMatchObject([{ id: "attachment_1" }]);
    expect(
      new RelationshipRepository(connection).listOutgoingRelationships({
        workspaceId: "workspace_1",
        target: { type: "item", id: result.list.item.id }
      })
    ).toMatchObject([{ targetId: "container_project_2" }]);
    expectSearchDeleted(task.item.id, true);
    expectSearchDeleted(result.list.item.id, false);
    expectSearchDeleted(result.firstListItem.id, false, "list_item");
    expectActivity(result.list.item.id, "task_converted_to_list");
  });

  it("breaks a tagged dated list item out into a task and inherits the parent list category", async () => {
    const list = await createListService().createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist",
      categoryId: "category_ops"
    });
    const row = await createListService().addListItem({
      listId: list.item.id,
      title: "Book venue",
      body: "Needs capacity check",
      dueAt: "2026-05-06",
      status: "waiting"
    });
    await createTagService().addTagToTarget({
      workspaceId: "workspace_1",
      targetType: "list_item",
      targetId: row.listItem.id,
      name: "venue"
    });
    await createRelationshipService().createRelationship({
      workspaceId: "workspace_1",
      source: { type: "list_item", id: row.listItem.id },
      target: { type: "container", id: "container_project_2" },
      relationType: "references"
    });

    const result = await createConversionService().convertListItemToTask({
      listItemId: row.listItem.id
    });

    expect(result.task.item).toMatchObject({
      type: "task",
      title: "Book venue",
      body: "Needs capacity check",
      categoryId: "category_ops",
      status: "waiting"
    });
    expect(result.task.task).toMatchObject({
      taskStatus: "waiting",
      dueAt: "2026-05-06T00:00:00.000Z"
    });
    expect(
      new TagRepository(connection).listTagsForTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: result.task.item.id
      })
    ).toMatchObject([{ slug: "venue" }]);
    expect(
      new RelationshipRepository(connection).listOutgoingRelationships({
        workspaceId: "workspace_1",
        target: { type: "item", id: result.task.item.id }
      })
    ).toMatchObject([{ relationType: "references" }]);
    expectSearchDeleted(row.listItem.id, true, "list_item");
    expectSearchDeleted(result.task.item.id, false);
    expectActivity(result.task.item.id, "list_item_converted_to_task");
  });

  it("merges a task into a target list as a row while moving attachments to the target list and copying row metadata", async () => {
    const targetList = await createListService().createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist"
    });
    const task = await createTaskService().createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Send invites",
      body: "VIP list first",
      dueAt: "2026-05-07",
      status: "done"
    });
    await createTagService().addTagToTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: task.item.id,
      name: "vip"
    });
    new AttachmentRepository(connection).create({
      id: "attachment_2",
      workspaceId: "workspace_1",
      itemId: task.item.id,
      originalName: "invite-list.csv",
      storedName: "invite-list.csv",
      sizeBytes: 84,
      storagePath: "attachments/invite-list.csv",
      timestamp: "2026-05-01T00:00:00.000Z"
    });

    const result = await createConversionService().mergeTaskIntoList({
      taskId: task.item.id,
      targetListId: targetList.item.id
    });

    expect(result.listItem).toMatchObject({
      listId: targetList.item.id,
      title: "Send invites",
      body: "VIP list first",
      status: "done",
      dueAt: "2026-05-07T00:00:00.000Z"
    });
    expect(
      new TagRepository(connection).listTagsForTarget({
        workspaceId: "workspace_1",
        targetType: "list_item",
        targetId: result.listItem.id
      })
    ).toMatchObject([{ slug: "vip" }]);
    expect(
      new AttachmentRepository(connection).listForItem({
        workspaceId: "workspace_1",
        itemId: targetList.item.id
      })
    ).toMatchObject([{ id: "attachment_2" }]);
    expect(new ListRepository(connection).listItems(targetList.item.id)).toHaveLength(1);
    expectSearchDeleted(task.item.id, true);
    expectSearchDeleted(result.listItem.id, false, "list_item");
    expectActivity(result.listItem.id, "task_merged_into_list", "list_item");
  });
});

function createConversionService(): TaskListConversionService {
  return new TaskListConversionService({
    connection,
    idFactory: createId,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function createTaskService(): TaskService {
  return new TaskService({
    connection,
    idFactory: createId,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function createListService(): ListService {
  return new ListService({
    connection,
    idFactory: createId,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function createTagService(): TagService {
  return new TagService({
    connection,
    idFactory: createId,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function createRelationshipService(): RelationshipService {
  return new RelationshipService({
    connection,
    idFactory: createId,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function expectSearchDeleted(
  targetId: string,
  isDeleted: boolean,
  targetType: "item" | "list_item" = "item"
): void {
  expect(
    new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType,
      targetId
    })
  ).toMatchObject({ isDeleted });
}

function expectActivity(
  targetId: string,
  action: string,
  targetType: "item" | "list_item" = "item"
): void {
  expect(
    new ActivityLogRepository(connection)
      .listForTarget(targetType, targetId)
      .map((event) => event.action)
  ).toContain(action);
}
