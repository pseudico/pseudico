import {
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  ListRepository,
  MetadataBrowserRepository,
  MigrationService,
  TagRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "../src";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;

describe("MetadataBrowserRepository", () => {
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
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("counts active tag and category targets", () => {
    seedMetadataTargets();
    const repository = new MetadataBrowserRepository(connection);

    expect(repository.listTagsWithCounts("workspace_1")).toMatchObject([
      {
        slug: "finance",
        targetCount: 2
      },
      {
        slug: "priority",
        targetCount: 1
      }
    ]);
    expect(repository.listCategoriesWithCounts("workspace_1")).toMatchObject([
      {
        slug: "admin",
        targetCount: 1
      },
      {
        slug: "finance",
        targetCount: 2
      }
    ]);
  });

  it("lists targets by tag, category, and multi-tag narrowing", () => {
    seedMetadataTargets();
    const repository = new MetadataBrowserRepository(connection);

    expect(
      repository
        .listTargetsByMetadata({
          workspaceId: "workspace_1",
          tagSlugs: ["finance"]
        })
        .map((target) => target.title)
    ).toEqual(["Tax Prep", "Send forms"]);
    expect(
      repository
        .listTargetsByMetadata({
          workspaceId: "workspace_1",
          tagSlugs: ["finance", "priority"]
        })
        .map((target) => target.title)
    ).toEqual(["Send forms"]);
    expect(
      repository
        .listTargetsByMetadata({
          workspaceId: "workspace_1",
          categorySlug: "finance"
        })
        .map((target) => target.title)
    ).toEqual(["Tax Prep", "Send forms"]);
  });

  it("excludes archived and deleted targets by default", () => {
    seedMetadataTargets();
    const repository = new MetadataBrowserRepository(connection);

    expect(
      repository
        .listTargetsByMetadata({
          workspaceId: "workspace_1",
          tagSlugs: ["finance"],
          includeArchived: true,
          includeDeleted: true
        })
        .map((target) => target.title)
    ).toEqual([
      "Archived project",
      "Tax Prep",
      "Archived task",
      "Send forms",
      "Deleted checklist row"
    ]);
    expect(
      repository
        .listTargetsByMetadata({
          workspaceId: "workspace_1",
          tagSlugs: ["finance"]
        })
        .map((target) => target.title)
    ).toEqual(["Tax Prep", "Send forms"]);
  });
});

function seedMetadataTargets(): void {
  const timestamp = "2026-05-01T00:00:00.000Z";
  const categories = new CategoryRepository(connection);
  const containers = new ContainerRepository(connection);
  const items = new ItemRepository(connection);
  const lists = new ListRepository(connection);
  const tags = new TagRepository(connection);

  categories.create({
    id: "category_finance",
    workspaceId: "workspace_1",
    name: "Finance",
    slug: "finance",
    color: "#2c6b8f",
    timestamp
  });
  categories.create({
    id: "category_admin",
    workspaceId: "workspace_1",
    name: "Admin",
    slug: "admin",
    color: "#245c55",
    timestamp
  });
  tags.create({
    id: "tag_finance",
    workspaceId: "workspace_1",
    name: "Finance",
    slug: "finance",
    timestamp
  });
  tags.create({
    id: "tag_priority",
    workspaceId: "workspace_1",
    name: "Priority",
    slug: "priority",
    timestamp
  });

  containers.create({
    id: "container_tax",
    workspaceId: "workspace_1",
    type: "project",
    name: "Tax Prep",
    slug: "tax-prep",
    categoryId: "category_finance",
    timestamp
  });
  containers.create({
    id: "container_ops",
    workspaceId: "workspace_1",
    type: "project",
    name: "Operations",
    slug: "operations",
    categoryId: "category_admin",
    timestamp
  });
  containers.create({
    id: "container_archived",
    workspaceId: "workspace_1",
    type: "project",
    name: "Archived project",
    slug: "archived-project",
    timestamp
  });
  containers.archive("container_archived", "2026-05-02T00:00:00.000Z");

  items.create({
    id: "item_forms",
    workspaceId: "workspace_1",
    containerId: "container_tax",
    type: "task",
    title: "Send forms",
    categoryId: "category_finance",
    timestamp
  });
  items.create({
    id: "item_archived",
    workspaceId: "workspace_1",
    containerId: "container_tax",
    type: "task",
    title: "Archived task",
    timestamp
  });
  items.archive("item_archived", "2026-05-02T00:00:00.000Z");
  items.create({
    id: "item_list",
    workspaceId: "workspace_1",
    containerId: "container_tax",
    type: "list",
    title: "Checklist",
    timestamp
  });
  lists.createDetails({
    itemId: "item_list",
    workspaceId: "workspace_1",
    timestamp
  });
  lists.createListItem({
    id: "list_item_deleted",
    workspaceId: "workspace_1",
    listId: "item_list",
    title: "Deleted checklist row",
    timestamp
  });
  lists.updateListItem("list_item_deleted", {
    title: "Deleted checklist row",
    timestamp
  });
  connection.sqlite
    .prepare("update list_items set deleted_at = ? where id = ?")
    .run("2026-05-02T00:00:00.000Z", "list_item_deleted");

  for (const [taggingId, tagId, targetType, targetId] of [
    ["tagging_1", "tag_finance", "container", "container_tax"],
    ["tagging_2", "tag_finance", "item", "item_forms"],
    ["tagging_3", "tag_priority", "item", "item_forms"],
    ["tagging_4", "tag_finance", "container", "container_archived"],
    ["tagging_5", "tag_finance", "item", "item_archived"],
    ["tagging_6", "tag_finance", "list_item", "list_item_deleted"]
  ] as const) {
    tags.createTagging({
      id: taggingId,
      workspaceId: "workspace_1",
      tagId,
      targetType,
      targetId,
      source: "manual",
      timestamp
    });
  }
}
