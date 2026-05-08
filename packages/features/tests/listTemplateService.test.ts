import {
  ActivityLogRepository,
  CategoryRepository,
  ContainerRepository,
  MigrationService,
  SearchIndexRepository,
  TagRepository,
  TemplateRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ListService,
  ListTemplateService,
  applyRelativeDates,
  validateTemplateJson
} from "../src";
import { WorkspaceRepository } from "@local-work-os/db";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("ListTemplateService", () => {
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
    new CategoryRepository(connection).create({
      id: "category_1",
      workspaceId: "workspace_1",
      name: "Operations",
      slug: "operations",
      color: "#8b5cf6",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    new TagRepository(connection).create({
      id: "tag_1",
      workspaceId: "workspace_1",
      name: "Launch",
      slug: "launch",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    new TagRepository(connection).create({
      id: "tag_2",
      workspaceId: "workspace_1",
      name: "Vendor",
      slug: "vendor",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("saves a list as a template with tags, category, list rows, and relative dates", async () => {
    const listService = createListService();
    const source = await listService.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist",
      body: "Reusable launch steps",
      categoryId: "category_1",
      showCompleted: false
    });
    const parent = await listService.addListItem({
      listId: source.item.id,
      title: "Book venue",
      dueAt: "2026-05-05"
    });
    const child = await listService.addListItem({
      listId: source.item.id,
      title: "Confirm caterer",
      listItemParentId: parent.listItem.id,
      depth: 1,
      dueAt: "2026-05-06"
    });
    new TagRepository(connection).createTagging({
      id: "tagging_source_list",
      workspaceId: "workspace_1",
      tagId: "tag_1",
      targetType: "item",
      targetId: source.item.id,
      source: "manual",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    new TagRepository(connection).createTagging({
      id: "tagging_source_child",
      workspaceId: "workspace_1",
      tagId: "tag_2",
      targetType: "list_item",
      targetId: child.listItem.id,
      source: "manual",
      timestamp: "2026-05-02T00:00:00.000Z"
    });

    const template = await createTemplateService().saveListAsTemplate({
      listId: source.item.id,
      name: "Launch playbook",
      baseDate: "2026-05-04"
    });
    const templateJson = validateTemplateJson(JSON.parse(template.templateJson));

    expect(template).toMatchObject({
      workspaceId: "workspace_1",
      kind: "list",
      name: "Launch playbook",
      sourceType: "list",
      sourceId: source.item.id
    });
    expect(templateJson.list).toMatchObject({
      title: "Launch checklist",
      body: "Reusable launch steps",
      categoryId: "category_1",
      showCompleted: false,
      tags: [expect.objectContaining({ tagId: "tag_1", slug: "launch" })]
    });
    expect(templateJson.list.items).toEqual([
      expect.objectContaining({
        stableId: parent.listItem.id,
        parentStableId: null,
        title: "Book venue",
        dueOffsetDays: 1
      }),
      expect.objectContaining({
        stableId: child.listItem.id,
        parentStableId: parent.listItem.id,
        title: "Confirm caterer",
        dueOffsetDays: 2,
        tags: [expect.objectContaining({ tagId: "tag_2", slug: "vendor" })]
      })
    ]);
    expect(
      new TemplateRepository(connection).listByWorkspace({ workspaceId: "workspace_1" })
    ).toHaveLength(1);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("template", template.id)
        .map((event) => event.action)
    ).toEqual(["template_created"]);
  });

  it("creates a list from a template and refreshes activity, tags, category, dates, and search", async () => {
    const listService = createListService();
    const source = await listService.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist",
      categoryId: "category_1"
    });
    const parent = await listService.addListItem({
      listId: source.item.id,
      title: "Book venue",
      dueAt: "2026-05-05"
    });
    const child = await listService.addListItem({
      listId: source.item.id,
      title: "Confirm caterer",
      listItemParentId: parent.listItem.id,
      depth: 1,
      dueAt: "2026-05-06"
    });
    new TagRepository(connection).createTagging({
      id: "tagging_source_list",
      workspaceId: "workspace_1",
      tagId: "tag_1",
      targetType: "item",
      targetId: source.item.id,
      source: "manual",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    new TagRepository(connection).createTagging({
      id: "tagging_source_child",
      workspaceId: "workspace_1",
      tagId: "tag_2",
      targetType: "list_item",
      targetId: child.listItem.id,
      source: "manual",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    const template = await createTemplateService().saveListAsTemplate({
      listId: source.item.id,
      baseDate: "2026-05-04"
    });

    const created = await createTemplateService().createListFromTemplate({
      templateId: template.id,
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "June launch checklist",
      baseDate: "2026-06-01"
    });

    expect(created.list.item).toMatchObject({
      title: "June launch checklist",
      categoryId: "category_1"
    });
    expect(created.listItems).toHaveLength(2);
    expect(created.listItems[0]).toMatchObject({
      title: "Book venue",
      dueAt: "2026-06-02T00:00:00.000Z",
      listItemParentId: null
    });
    expect(created.listItems[1]).toMatchObject({
      title: "Confirm caterer",
      dueAt: "2026-06-03T00:00:00.000Z",
      listItemParentId: created.listItems[0]?.id,
      depth: 1
    });
    expect(
      new TagRepository(connection).listTagsForTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: created.list.item.id
      })
    ).toEqual([expect.objectContaining({ slug: "launch" })]);
    expect(
      new TagRepository(connection).listTagsForTarget({
        workspaceId: "workspace_1",
        targetType: "list_item",
        targetId: created.listItems[1]!.id
      })
    ).toEqual([expect.objectContaining({ slug: "vendor" })]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: created.list.item.id
      })
    ).toMatchObject({ tags: "launch", category: "Operations" });
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "list_item",
        targetId: created.listItems[1]!.id
      })
    ).toMatchObject({ tags: "vendor" });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("template", template.id)
        .map((event) => event.action)
    ).toEqual(["template_created", "template_applied"]);
  });

  it("applies relative dates in validated template JSON", () => {
    const template = validateTemplateJson({
      version: 1,
      kind: "list",
      createdFrom: { sourceType: "list", sourceId: "item_1" },
      baseDate: "2026-05-01",
      list: {
        title: "Checklist",
        body: null,
        categoryId: null,
        displayMode: "checklist",
        showCompleted: true,
        progressMode: "count",
        tags: [],
        items: [
          {
            stableId: "row_1",
            parentStableId: null,
            title: "Follow up",
            body: null,
            status: "open",
            depth: 0,
            sortOrder: 1024,
            startAt: null,
            dueAt: null,
            completedAt: null,
            startOffsetDays: 0,
            dueOffsetDays: 3,
            completedOffsetDays: null,
            tags: []
          }
        ]
      }
    });

    expect(applyRelativeDates(template, "2026-07-10").list.items[0]).toMatchObject({
      startAt: "2026-07-10",
      dueAt: "2026-07-13"
    });
  });
});

function createListService(): ListService {
  return new ListService({
    connection,
    idFactory: createId,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function createTemplateService(): ListTemplateService {
  return new ListTemplateService({
    connection,
    idFactory: createId,
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
