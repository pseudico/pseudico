import {
  ActivityLogRepository,
  AttachmentRepository,
  CategoryRepository,
  ContainerRepository,
  ContainerTabRepository,
  ItemRepository,
  ListRepository,
  MigrationService,
  SearchIndexRepository,
  TagRepository,
  TaskRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerTemplateService,
  FileAttachmentService,
  ListService,
  NoteService,
  ProjectService,
  TabService,
  TaskService,
  validateContainerTemplateJson
} from "../src";
import { WorkspaceRepository } from "@local-work-os/db";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("ContainerTemplateService", () => {
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
    new CategoryRepository(connection).create({
      id: "category_1",
      workspaceId: "workspace_1",
      name: "Client Work",
      slug: "client-work",
      color: "#14b8a6",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    new TagRepository(connection).create({
      id: "tag_1",
      workspaceId: "workspace_1",
      name: "Launch",
      slug: "launch",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("saves and applies a project template with tabs, items, relative dates, tags, categories, and file placeholders", async () => {
    const project = await new ProjectService({
      connection,
      idFactory: createId,
      now: now
    }).createProject({
      workspaceId: "workspace_1",
      name: "Client launch",
      description: "Repeatable launch plan",
      categoryId: "category_1",
      color: "#14b8a6",
      isFavorite: true
    });
    const docsTab = await new TabService({
      connection,
      idFactory: createId,
      now: now
    }).createTab({
      containerId: project.project.id,
      name: "Docs",
      sortOrder: 1
    });
    new TagRepository(connection).createTagging({
      id: "tagging_container",
      workspaceId: "workspace_1",
      tagId: "tag_1",
      targetType: "container",
      targetId: project.project.id,
      source: "manual",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    const task = await new TaskService({
      connection,
      idFactory: createId,
      now: now
    }).createTask({
      workspaceId: "workspace_1",
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      title: "Kickoff call",
      categoryId: "category_1",
      dueAt: "2026-05-06"
    });
    new TagRepository(connection).createTagging({
      id: "tagging_task",
      workspaceId: "workspace_1",
      tagId: "tag_1",
      targetType: "item",
      targetId: task.item.id,
      source: "manual",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    const list = await new ListService({
      connection,
      idFactory: createId,
      now: now
    }).createList({
      workspaceId: "workspace_1",
      containerId: project.project.id,
      containerTabId: docsTab.id,
      title: "Launch checklist"
    });
    const row = await new ListService({
      connection,
      idFactory: createId,
      now: now
    }).addListItem({
      listId: list.item.id,
      title: "Draft launch brief",
      dueAt: "2026-05-07"
    });
    await new NoteService({
      connection,
      idFactory: createId,
      now: now
    }).createNote({
      workspaceId: "workspace_1",
      containerId: project.project.id,
      containerTabId: docsTab.id,
      title: "Meeting note",
      content: "Reusable note body"
    });
    const sourceFile = await new FileAttachmentService({
      connection,
      idFactory: createId,
      now: now
    }).attachFileToContainer({
      workspaceId: "workspace_1",
      containerId: project.project.id,
      containerTabId: docsTab.id,
      copiedFile: {
        originalName: "brief.pdf",
        storedName: "brief.pdf",
        storagePath: "attachments/2026/05/file_1/brief.pdf",
        sizeBytes: 128,
        checksum: "abc123"
      },
      description: "Source file"
    });

    const template = await new ContainerTemplateService({
      connection,
      idFactory: createId,
      now: now
    }).saveContainerAsTemplate({
      containerId: project.project.id,
      name: "Launch project template",
      baseDate: "2026-05-04"
    });
    const templateJson = validateContainerTemplateJson(JSON.parse(template.templateJson));

    expect(template.kind).toBe("project");
    expect(templateJson.container.tabs.map((tab) => tab.name)).toEqual(["Main", "Docs"]);
    expect(templateJson.container.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stableId: task.item.id,
          type: "task",
          dueOffsetDays: 2,
          tags: [expect.objectContaining({ slug: "launch" })]
        }),
        expect.objectContaining({
          stableId: sourceFile.item.id,
          type: "file",
          filePlaceholder: expect.objectContaining({
            attachments: [expect.objectContaining({ originalName: "brief.pdf" })]
          })
        })
      ])
    );

    const created = await new ContainerTemplateService({
      connection,
      idFactory: createId,
      now: now
    }).createContainerFromTemplate({
      templateId: template.id,
      workspaceId: "workspace_1",
      name: "June launch",
      baseDate: "2026-06-01"
    });

    const createdContainer =
      "project" in created.container ? created.container.project : created.container.contact;
    const createdTask = new TaskRepository(connection)
      .listByContainer(createdContainer.id)
      .find((entry) => entry.item.title === "Kickoff call");
    const createdList = new ListRepository(connection)
      .listByContainer(createdContainer.id)
      .find((entry) => entry.item.title === "Launch checklist");
    const createdFile = new ItemRepository(connection)
      .listByContainer(createdContainer.id, { type: "file" })
      .find((item) => item.title === "brief.pdf");

    expect(createdContainer).toMatchObject({
      name: "June launch",
      categoryId: "category_1",
      isFavorite: true
    });
    expect(new ContainerTabRepository(connection).listByContainer(createdContainer.id).map((tab) => tab.name)).toEqual([
      "Main",
      "Docs"
    ]);
    expect(createdTask?.task.dueAt).toBe("2026-06-03T00:00:00.000Z");
    expect(createdList).toBeDefined();
    expect(new ListRepository(connection).listItems(createdList!.item.id)[0]).toMatchObject({
      title: "Draft launch brief",
      dueAt: "2026-06-04T00:00:00.000Z"
    });
    expect(createdFile).toBeDefined();
    expect(
      new AttachmentRepository(connection).listForItem({
        workspaceId: "workspace_1",
        itemId: createdFile!.id
      })
    ).toEqual([]);
    expect(
      new TagRepository(connection).listTagsForTarget({
        workspaceId: "workspace_1",
        targetType: "container",
        targetId: createdContainer.id
      })
    ).toEqual([expect.objectContaining({ slug: "launch" })]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: createdTask!.item.id
      })
    ).toMatchObject({ tags: "launch", category: "Client Work" });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("template", template.id)
        .map((event) => event.action)
    ).toEqual(["template_created", "template_applied"]);
    expect(new ContainerRepository(connection).getById(createdContainer.id)).not.toBeNull();
    expect(row.listItem.title).toBe("Draft launch brief");
  });
});

function now(): Date {
  return new Date("2026-05-02T01:02:03.000Z");
}

function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
