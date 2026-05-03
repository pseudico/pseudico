import {
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  TagRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MetadataBrowserService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;

describe("MetadataBrowserService", () => {
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
    seedServiceTargets();
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("lists metadata counts and matching active targets", () => {
    const service = new MetadataBrowserService({ connection });

    expect(service.listTagsWithCounts("workspace_1")).toMatchObject([
      {
        slug: "finance",
        targetCount: 2
      },
      {
        slug: "office",
        targetCount: 1
      }
    ]);
    expect(service.listCategoriesWithCounts("workspace_1")).toMatchObject([
      {
        slug: "finance",
        targetCount: 2
      }
    ]);
    expect(
      service
        .listTargetsByMetadata({
          workspaceId: "workspace_1",
          tagSlugs: ["@finance", "office"]
        })
        .map((target) => target.title)
    ).toEqual(["Collect receipts"]);
  });

  it("returns no targets when no metadata filter is selected", () => {
    const service = new MetadataBrowserService({ connection });

    expect(
      service.listTargetsByMetadata({
        workspaceId: "workspace_1",
        tagSlugs: []
      })
    ).toEqual([]);
  });

  it("validates tag slugs before querying", () => {
    const service = new MetadataBrowserService({ connection });

    expect(() =>
      service.listTargetsByMetadata({
        workspaceId: "workspace_1",
        tagSlugs: ["bad_tag"]
      })
    ).toThrow("Tag slugs must contain only letters, numbers, and hyphens.");
  });
});

function seedServiceTargets(): void {
  const timestamp = "2026-05-01T00:00:00.000Z";
  const categories = new CategoryRepository(connection);
  const containers = new ContainerRepository(connection);
  const items = new ItemRepository(connection);
  const tags = new TagRepository(connection);

  categories.create({
    id: "category_finance",
    workspaceId: "workspace_1",
    name: "Finance",
    slug: "finance",
    color: "#2c6b8f",
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
    id: "tag_office",
    workspaceId: "workspace_1",
    name: "Office",
    slug: "office",
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
  items.create({
    id: "item_receipts",
    workspaceId: "workspace_1",
    containerId: "container_tax",
    type: "task",
    title: "Collect receipts",
    categoryId: "category_finance",
    timestamp
  });
  tags.createTagging({
    id: "tagging_container",
    workspaceId: "workspace_1",
    tagId: "tag_finance",
    targetType: "container",
    targetId: "container_tax",
    source: "manual",
    timestamp
  });
  tags.createTagging({
    id: "tagging_item_finance",
    workspaceId: "workspace_1",
    tagId: "tag_finance",
    targetType: "item",
    targetId: "item_receipts",
    source: "manual",
    timestamp
  });
  tags.createTagging({
    id: "tagging_item_office",
    workspaceId: "workspace_1",
    tagId: "tag_office",
    targetType: "item",
    targetId: "item_receipts",
    source: "inline",
    timestamp
  });
}
