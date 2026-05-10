import {
  CategoryRepository,
  ContainerRepository,
  ProjectTagBrowserRepository,
  TagRepository,
  type DatabaseConnection
} from "../src";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let db: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("ProjectTagBrowserRepository", () => {
  beforeEach(async () => {
    db = await createRepositoryTestDatabase();
    connection = db.connection;
    seedWorkspace(connection);
    seedProjectTags();
  });

  afterEach(async () => {
    await db.cleanup();
  });

  it("returns hierarchical tag counts for project drill-down", () => {
    const repository = new ProjectTagBrowserRepository(connection);

    expect(
      repository.listTagFacets({ workspaceId: "workspace_1" }).map((tag) => [
        tag.slug,
        tag.projectCount
      ])
    ).toEqual([
      ["client", 2],
      ["design", 2],
      ["urgent", 2]
    ]);

    expect(
      repository
        .listTagFacets({ workspaceId: "workspace_1", tagSlugs: ["client"] })
        .map((tag) => [tag.slug, tag.projectCount])
    ).toEqual([
      ["client", 2],
      ["design", 2],
      ["urgent", 1]
    ]);
  });

  it("narrows projects by multiple tags, category, and status", () => {
    const repository = new ProjectTagBrowserRepository(connection);

    expect(
      repository
        .listProjects({ workspaceId: "workspace_1", tagSlugs: ["client", "urgent"] })
        .map((project) => project.name)
    ).toEqual(["Website Launch"]);

    expect(
      repository
        .listProjects({
          workspaceId: "workspace_1",
          tagSlugs: ["client"],
          categoryId: "category_ops"
        })
        .map((project) => project.name)
    ).toEqual(["Ops Playbook"]);

    expect(
      repository
        .listProjects({ workspaceId: "workspace_1", status: "waiting" })
        .map((project) => project.name)
    ).toEqual(["Ops Playbook"]);
  });

  it("excludes archived projects unless archived status is selected", () => {
    const repository = new ProjectTagBrowserRepository(connection);

    expect(
      repository
        .listProjects({ workspaceId: "workspace_1", tagSlugs: ["client"] })
        .map((project) => project.name)
    ).toEqual(["Ops Playbook", "Website Launch"]);

    expect(
      repository
        .listProjects({
          workspaceId: "workspace_1",
          tagSlugs: ["client"],
          status: "archived"
        })
        .map((project) => project.name)
    ).toEqual(["Archived Client"]);
  });
});

function seedProjectTags(): void {
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
  categories.create({
    id: "category_ops",
    workspaceId: "workspace_1",
    name: "Operations",
    slug: "operations",
    color: "#2c6b8f",
    timestamp
  });

  for (const [id, name, slug] of [
    ["tag_client", "Client", "client"],
    ["tag_urgent", "Urgent", "urgent"],
    ["tag_design", "Design", "design"]
  ] as const) {
    tags.create({ id, workspaceId: "workspace_1", name, slug, timestamp });
  }

  containers.create({
    id: "project_launch",
    workspaceId: "workspace_1",
    type: "project",
    name: "Website Launch",
    slug: "website-launch",
    categoryId: "category_client",
    timestamp
  });
  containers.create({
    id: "project_ops",
    workspaceId: "workspace_1",
    type: "project",
    name: "Ops Playbook",
    slug: "ops-playbook",
    categoryId: "category_ops",
    status: "waiting",
    timestamp
  });
  containers.create({
    id: "project_internal",
    workspaceId: "workspace_1",
    type: "project",
    name: "Internal Urgent",
    slug: "internal-urgent",
    timestamp
  });
  containers.create({
    id: "project_archived",
    workspaceId: "workspace_1",
    type: "project",
    name: "Archived Client",
    slug: "archived-client",
    timestamp
  });
  containers.archive("project_archived", "2026-05-02T00:00:00.000Z");

  for (const [id, tagId, projectId] of [
    ["tagging_1", "tag_client", "project_launch"],
    ["tagging_2", "tag_urgent", "project_launch"],
    ["tagging_3", "tag_design", "project_launch"],
    ["tagging_4", "tag_client", "project_ops"],
    ["tagging_5", "tag_design", "project_ops"],
    ["tagging_6", "tag_urgent", "project_internal"],
    ["tagging_7", "tag_client", "project_archived"]
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
