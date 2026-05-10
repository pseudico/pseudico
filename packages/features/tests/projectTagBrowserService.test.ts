import {
  CategoryRepository,
  ContainerRepository,
  TagRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "@local-work-os/test-utils";
import { ProjectTagBrowserService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;

describe("ProjectTagBrowserService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({ databasePath: testDb.databasePath });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    seedServiceProjects();
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("normalizes multi-tag input and returns project facets", () => {
    const service = new ProjectTagBrowserService({
      connection,
      now: () => new Date("2026-05-03T00:00:00.000Z")
    });

    const viewModel = service.getViewModel({
      workspaceId: "workspace_1",
      tagSlugs: ["urgent", "client", "client"]
    });

    expect(viewModel.filters.tagSlugs).toEqual(["client", "urgent"]);
    expect(viewModel.generatedAt).toBe("2026-05-03T00:00:00.000Z");
    expect(viewModel.selectedTags.map((tag) => tag.slug)).toEqual([
      "client",
      "urgent"
    ]);
    expect(viewModel.projects.map((project) => project.name)).toEqual([
      "Launch"
    ]);
    expect(viewModel.tagFacets.map((tag) => tag.slug)).toContain("urgent");
  });

  it("rejects invalid tag slugs", () => {
    const service = new ProjectTagBrowserService({ connection });

    expect(() =>
      service.getViewModel({ workspaceId: "workspace_1", tagSlugs: ["bad#tag"] })
    ).toThrow("Tag slugs must contain only letters, numbers, and hyphens.");
  });
});

function seedServiceProjects(): void {
  const timestamp = "2026-05-01T00:00:00.000Z";
  const categories = new CategoryRepository(connection);
  const containers = new ContainerRepository(connection);
  const tags = new TagRepository(connection);

  categories.create({
    id: "category_client",
    workspaceId: "workspace_1",
    name: "Client",
    slug: "client",
    color: "#245c55",
    timestamp
  });

  tags.create({
    id: "tag_client",
    workspaceId: "workspace_1",
    name: "Client",
    slug: "client",
    timestamp
  });
  tags.create({
    id: "tag_urgent",
    workspaceId: "workspace_1",
    name: "Urgent",
    slug: "urgent",
    timestamp
  });

  containers.create({
    id: "project_launch",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch",
    slug: "launch",
    categoryId: "category_client",
    timestamp
  });
  containers.create({
    id: "project_other",
    workspaceId: "workspace_1",
    type: "project",
    name: "Other",
    slug: "other",
    timestamp
  });

  for (const [id, tagId, projectId] of [
    ["tagging_1", "tag_client", "project_launch"],
    ["tagging_2", "tag_urgent", "project_launch"],
    ["tagging_3", "tag_client", "project_other"]
  ] as const) {
    tags.createTagging({
      id,
      workspaceId: "workspace_1",
      tagId,
      targetType: "container",
      targetId: projectId,
      source: "manual",
      timestamp
    });
  }
}
