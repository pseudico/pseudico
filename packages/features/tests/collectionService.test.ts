import {
  ActivityLogRepository,
  CategoryRepository,
  ContainerRepository,
  MigrationService,
  SearchIndexRepository,
  TagRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CollectionService, TaskService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("CollectionService", () => {
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
      timestamp: "2026-05-03T00:00:00.000Z"
    });
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-05-03T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("creates tag and keyword collections as persisted saved views", async () => {
    const service = createService();
    const tagCollection = await service.createTagCollection({
      workspaceId: "workspace_1",
      tagSlug: " Phone Call ",
      name: "Phone calls"
    });
    const keywordCollection = await service.createKeywordCollection({
      workspaceId: "workspace_1",
      query: " launch supplier "
    });

    expect(tagCollection).toMatchObject({
      id: "saved_view_1",
      kind: "tag",
      tagSlug: "phone-call",
      name: "Phone calls"
    });
    expect(keywordCollection).toMatchObject({
      id: "saved_view_4",
      kind: "keyword",
      keyword: "launch supplier",
      name: "Search: launch supplier"
    });
    expect(service.listCollections("workspace_1")).toMatchObject([
      {
        id: "saved_view_1",
        kind: "tag"
      },
      {
        id: "saved_view_4",
        kind: "keyword"
      }
    ]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("saved_view", "saved_view_1")
        .map((event) => event.action)
    ).toEqual(["saved_view_created"]);
  });

  it("evaluates collections with grouped results", async () => {
    const service = createService();
    await new TaskService({
      connection,
      idFactory,
      now: () => new Date("2026-05-03T01:00:00.000Z")
    }).createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Call @phone-call supplier"
    });
    const collection = await service.createTagCollection({
      workspaceId: "workspace_1",
      tagSlug: "phone-call"
    });

    expect(service.evaluateCollection(collection.id)).toMatchObject({
      collection: {
        id: collection.id,
        kind: "tag"
      },
      total: 1,
      groups: [
        {
          key: "container_project_1",
          label: "Launch Plan",
          results: [
            {
              targetId: "item_1",
              kind: "task",
              title: "Call @phone-call supplier",
              tags: ["phone-call"]
            }
          ]
        }
      ]
    });
  });

  it("paginates large collection evaluations while preserving total count", async () => {
    const service = createService();

    for (let index = 0; index < 75; index += 1) {
      const hour = 1 + Math.floor(index / 60);
      const minute = index % 60;
      await new TaskService({
        connection,
        idFactory,
        now: () =>
          new Date(
            `2026-05-03T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`
          )
      }).createTask({
        workspaceId: "workspace_1",
        containerId: "container_project_1",
        title: `Follow up ${index} @finance`
      });
    }

    const collection = await service.createTagCollection({
      workspaceId: "workspace_1",
      tagSlug: "finance"
    });
    const firstPage = service.evaluateCollection({
      collectionId: collection.id,
      limit: 50,
      offset: 0
    });
    const secondPage = service.evaluateCollection({
      collectionId: collection.id,
      limit: 50,
      offset: firstPage.results.length
    });

    expect(firstPage.total).toBe(75);
    expect(firstPage.results).toHaveLength(50);
    expect(firstPage.page).toMatchObject({
      limit: 50,
      offset: 0,
      hasMore: true
    });
    expect(secondPage.results).toHaveLength(25);
    expect(secondPage.page.hasMore).toBe(false);
  });

  it("creates tasks in tag collections with task, tag, activity, and search updates", async () => {
    const service = createService();
    const collection = await service.createTagCollection({
      workspaceId: "workspace_1",
      tagSlug: "finance"
    });
    const created = await service.createTaskInCollection({
      collectionId: collection.id,
      containerId: "container_project_1",
      title: "Call accountant"
    });

    expect(created).toMatchObject({
      inheritedMetadata: {
        tagSlugs: ["finance"],
        categoryId: null
      },
      item: {
        title: "Call accountant"
      },
      task: {
        taskStatus: "open"
      }
    });
    expect(
      new TagRepository(connection)
        .listTagsForTarget({
          workspaceId: "workspace_1",
          targetType: "item",
          targetId: created.item.id
        })
        .map((tag) => ({ slug: tag.slug, source: tag.taggingSource }))
    ).toEqual([{ slug: "finance", source: "manual" }]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: created.item.id
      })
    ).toMatchObject({
      title: "Call accountant",
      tags: "finance"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", created.item.id)
        .map((event) => event.action)
    ).toEqual(expect.arrayContaining(["task_created", "tag_added"]));
    expect(service.evaluateCollection(collection.id).results).toMatchObject([
      {
        targetId: created.item.id,
        tags: ["finance"]
      }
    ]);
  });
  it("creates notes in metadata collections with inherited tags and category", async () => {
    new CategoryRepository(connection).create({
      id: "category_calls",
      workspaceId: "workspace_1",
      name: "Calls",
      slug: "calls",
      color: "blue",
      timestamp: "2026-05-03T00:00:00.000Z"
    });
    const service = createService();
    const collection = await service.createMetadataCollection({
      workspaceId: "workspace_1",
      tagSlugs: ["phone-call"],
      categoryId: "category_calls"
    });

    const created = await service.createNoteInCollection({
      collectionId: collection.id,
      containerId: "container_project_1",
      title: "Call notes",
      content: "Discussed the renewal timeline."
    });

    expect(created).toMatchObject({
      inheritedMetadata: {
        tagSlugs: ["phone-call"],
        categoryId: "category_calls"
      },
      item: {
        title: "Call notes",
        categoryId: "category_calls"
      },
      note: {
        content: "Discussed the renewal timeline."
      }
    });
    expect(
      new TagRepository(connection)
        .listTagsForTarget({
          workspaceId: "workspace_1",
          targetType: "item",
          targetId: created.item.id
        })
        .map((tag) => ({ slug: tag.slug, source: tag.taggingSource }))
    ).toEqual([{ slug: "phone-call", source: "manual" }]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: created.item.id
      })
    ).toMatchObject({
      title: "Call notes",
      tags: "phone-call"
    });
    expect(created.item.categoryId).toBe("category_calls");
    expect(service.evaluateCollection(collection.id).results).toMatchObject([
      {
        targetId: created.item.id,
        kind: "note",
        tags: ["phone-call"],
        categoryId: "category_calls"
      }
    ]);
  });

});

function createService(): CollectionService {
  return new CollectionService({
    connection,
    idFactory,
    now: () => new Date("2026-05-03T00:00:00.000Z")
  });
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
