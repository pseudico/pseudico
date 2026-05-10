import {
  ActivityLogRepository,
  AttachmentRepository,
  CategoryRepository,
  ContainerRepository,
  ContainerTabRepository,
  ItemRepository,
  MigrationService,
  RelationshipRepository,
  SearchIndexRepository,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerCloneService,
  FileAttachmentService,
  ListService,
  NoteService,
  ProjectService,
  TabService,
  TaskService
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = "2026-05-01T00:00:00.000Z";

describe("ContainerCloneService", () => {
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
      timestamp: NOW
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("clones project tabs, items, list rows, files, metadata, search records, and relationships with new ids", async () => {
    new CategoryRepository(connection).create({
      id: "category_focus",
      workspaceId: "workspace_1",
      name: "Focus",
      slug: "focus",
      color: "#245c55",
      timestamp: NOW
    });
    new TagRepository(connection).create({
      id: "tag_launch",
      workspaceId: "workspace_1",
      name: "Launch",
      slug: "launch",
      timestamp: NOW
    });

    const project = await new ProjectService({
      connection,
      idFactory,
      now
    }).createProject({
      workspaceId: "workspace_1",
      name: "Launch Plan",
      description: "Original notes",
      categoryId: "category_focus",
      isFavorite: true
    });
    const planningTab = await new TabService({
      connection,
      idFactory,
      now
    }).createTab({
      containerId: project.project.id,
      name: "Planning"
    });
    const task = await new TaskService({
      connection,
      idFactory,
      now
    }).createTask({
      workspaceId: "workspace_1",
      containerId: project.project.id,
      containerTabId: planningTab.id,
      title: "Confirm supplier",
      status: "done",
      dueAt: "2026-05-03T09:00:00.000Z",
      categoryId: "category_focus"
    });
    const note = await new NoteService({
      connection,
      idFactory,
      now
    }).createNote({
      workspaceId: "workspace_1",
      containerId: project.project.id,
      containerTabId: planningTab.id,
      title: "Brief",
      content: "Launch brief body"
    });
    const list = await new ListService({
      connection,
      idFactory,
      now
    }).createList({
      workspaceId: "workspace_1",
      containerId: project.project.id,
      containerTabId: planningTab.id,
      title: "Checklist"
    });
    const parentRow = await new ListService({
      connection,
      idFactory,
      now
    }).addListItem({
      listId: list.item.id,
      title: "Parent row",
      sortOrder: 100,
      dueAt: "2026-05-04T09:00:00.000Z"
    });
    const childRow = await new ListService({
      connection,
      idFactory,
      now
    }).addListItem({
      listId: list.item.id,
      title: "Child row",
      listItemParentId: parentRow.listItem.id,
      status: "done",
      sortOrder: 200,
      dueAt: "2026-05-05T09:00:00.000Z"
    });
    const file = await new FileAttachmentService({
      connection,
      idFactory,
      now
    }).attachFileToContainer({
      workspaceId: "workspace_1",
      containerId: project.project.id,
      containerTabId: planningTab.id,
      copiedFile: {
        originalName: "launch.pdf",
        storedName: "original.pdf",
        storagePath: "attachments/2026/05/source/original.pdf",
        sizeBytes: 123,
        checksum: "checksum-source",
        mimeType: "application/pdf"
      },
      description: "Source file"
    });

    const tagRepository = new TagRepository(connection);
    tagRepository.createTagging({
      id: "tagging_container",
      workspaceId: "workspace_1",
      tagId: "tag_launch",
      targetType: "container",
      targetId: project.project.id,
      source: "manual",
      timestamp: NOW
    });
    tagRepository.createTagging({
      id: "tagging_task",
      workspaceId: "workspace_1",
      tagId: "tag_launch",
      targetType: "item",
      targetId: task.item.id,
      source: "manual",
      timestamp: NOW
    });
    tagRepository.createTagging({
      id: "tagging_child",
      workspaceId: "workspace_1",
      tagId: "tag_launch",
      targetType: "list_item",
      targetId: childRow.listItem.id,
      source: "manual",
      timestamp: NOW
    });
    new RelationshipRepository(connection).create({
      id: "relationship_task_note",
      workspaceId: "workspace_1",
      sourceType: "item",
      sourceId: task.item.id,
      targetType: "item",
      targetId: note.item.id,
      relationType: "references",
      label: "brief",
      timestamp: NOW
    });

    const result = await createCloneService().cloneContainer({
      containerId: project.project.id,
      rebaseDates: {
        from: "2026-05-01T00:00:00.000Z",
        to: "2026-05-08T00:00:00.000Z"
      }
    });

    expect(result.container).toMatchObject({
      id: expect.not.stringMatching(project.project.id),
      name: "Launch Plan Copy",
      slug: "launch-plan-copy",
      type: "project",
      status: "active",
      categoryId: "category_focus",
      isFavorite: false
    });
    expect(result.tabs.map((tab) => tab.name)).toEqual(["Main", "Planning"]);
    expect(result.items.map((item) => item.title).sort()).toEqual([
      "Brief",
      "Checklist",
      "Confirm supplier",
      "launch.pdf"
    ]);

    const clonedTaskItem = result.items.find((item) => item.title === "Confirm supplier");
    expect(clonedTaskItem).toBeDefined();
    expect(clonedTaskItem).toMatchObject({
      status: "active",
      completedAt: null,
      categoryId: "category_focus"
    });
    expect(
      new TaskRepository(connection).getDetailsByItemId(clonedTaskItem?.id ?? "")
    ).toMatchObject({
      taskStatus: "open",
      dueAt: "2026-05-10T09:00:00.000Z",
      completedAt: null,
      reminderPolicyId: null,
      recurrenceRuleId: null
    });

    const clonedRows = result.listItems.sort((a, b) => a.sortOrder - b.sortOrder);
    expect(clonedRows).toHaveLength(2);
    expect(clonedRows[0]).toMatchObject({
      title: "Parent row",
      dueAt: "2026-05-11T09:00:00.000Z"
    });
    expect(clonedRows[1]).toMatchObject({
      title: "Child row",
      status: "open",
      completedAt: null,
      listItemParentId: clonedRows[0].id,
      dueAt: "2026-05-12T09:00:00.000Z"
    });

    expect(result.attachments).toMatchObject([
      {
        id: expect.not.stringMatching(file.attachment.id),
        originalName: "launch.pdf",
        storedName: "original.pdf",
        storagePath: expect.stringContaining("attachments/clones/"),
        description: "Source file"
      }
    ]);
    expect(result.relationships).toMatchObject([
      {
        sourceId: clonedTaskItem?.id,
        targetId: result.items.find((item) => item.title === "Brief")?.id,
        relationType: "references",
        label: "brief"
      }
    ]);
    expect(result.taggings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: "container",
          targetId: result.container.id,
          tagId: "tag_launch"
        }),
        expect.objectContaining({
          targetType: "item",
          targetId: clonedTaskItem?.id,
          tagId: "tag_launch"
        }),
        expect.objectContaining({
          targetType: "list_item",
          targetId: clonedRows[1].id,
          tagId: "tag_launch"
        })
      ])
    );
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "container",
        targetId: result.container.id
      })
    ).toMatchObject({ title: "Launch Plan Copy" });
    expect(
      new ActivityLogRepository(connection).listForTarget("container", result.container.id)
    ).toMatchObject([{ action: "container_cloned" }]);
    expect(new ContainerRepository(connection).getById(project.project.id)).toMatchObject({
      name: "Launch Plan"
    });
    expect(new ContainerTabRepository(connection).listByContainer(result.container.id)).toHaveLength(2);
    expect(new ItemRepository(connection).listByContainer(project.project.id)).toHaveLength(4);
    expect(
      new AttachmentRepository(connection).listForItem({
        workspaceId: "workspace_1",
        itemId: result.items.find((item) => item.title === "launch.pdf")?.id ?? ""
      })
    ).toHaveLength(1);
  });

  it("uses the copy adapter when cloning attachment files in copy mode", async () => {
    const project = await new ProjectService({
      connection,
      idFactory,
      now
    }).createProject({
      workspaceId: "workspace_1",
      name: "Files"
    });
    await new FileAttachmentService({
      connection,
      idFactory,
      now
    }).attachFileToContainer({
      workspaceId: "workspace_1",
      containerId: project.project.id,
      copiedFile: {
        originalName: "source.txt",
        storedName: "source.txt",
        storagePath: "attachments/2026/05/source/source.txt",
        sizeBytes: 10,
        checksum: "source-checksum"
      }
    });

    const cloned = await new ContainerCloneService({
      connection,
      idFactory,
      now,
      cloneAttachmentFile: ({ targetAttachmentId }) => ({
        storedName: `${targetAttachmentId}.txt`,
        storagePath: `attachments/2026/05/${targetAttachmentId}/source.txt`,
        sizeBytes: 10,
        checksum: "copied-checksum",
        mimeType: "text/plain"
      })
    }).cloneContainer({
      containerId: project.project.id,
      fileMode: "copy"
    });

    expect(cloned.attachments).toMatchObject([
      {
        storedName: expect.stringMatching(/^attachment_/),
        storagePath: expect.stringContaining("/source.txt"),
        checksum: "copied-checksum",
        mimeType: "text/plain"
      }
    ]);
  });
});

function createCloneService(): ContainerCloneService {
  return new ContainerCloneService({
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
