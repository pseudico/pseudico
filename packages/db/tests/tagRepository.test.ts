import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TagRepository, type DatabaseConnection } from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("TagRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates and finds tags by workspace slug", () => {
    const repository = new TagRepository(connection);

    const tag = repository.create({
      id: "tag_1",
      workspaceId: "workspace_1",
      name: "Ops",
      slug: "ops",
      timestamp: TEST_TIMESTAMP
    });

    expect(tag).toMatchObject({
      id: "tag_1",
      workspaceId: "workspace_1",
      name: "Ops",
      slug: "ops",
      deletedAt: null
    });
    expect(repository.findBySlug({ workspaceId: "workspace_1", slug: "ops" }))
      .toEqual(tag);
    expect(repository.listByWorkspace("workspace_1")).toEqual([tag]);
  });

  it("adds taggings once and lists active tags for a target", () => {
    const repository = new TagRepository(connection);
    const tag = repository.create({
      id: "tag_1",
      workspaceId: "workspace_1",
      name: "ops",
      slug: "ops",
      timestamp: TEST_TIMESTAMP
    });

    const tagging = repository.createTagging({
      id: "tagging_1",
      workspaceId: "workspace_1",
      tagId: tag.id,
      targetType: "item",
      targetId: "item_1",
      source: "manual",
      timestamp: TEST_TIMESTAMP
    });
    const duplicate = repository.createTagging({
      id: "tagging_duplicate",
      workspaceId: "workspace_1",
      tagId: tag.id,
      targetType: "item",
      targetId: "item_1",
      source: "manual",
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(duplicate).toEqual(tagging);
    expect(
      repository.listTagsForTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: "item_1"
      })
    ).toMatchObject([
      {
        id: "tag_1",
        taggingId: "tagging_1",
        taggingSource: "manual"
      }
    ]);
  });

  it("soft deletes taggings and excludes them by default", () => {
    const repository = new TagRepository(connection);
    repository.create({
      id: "tag_1",
      workspaceId: "workspace_1",
      name: "ops",
      slug: "ops",
      timestamp: TEST_TIMESTAMP
    });
    repository.createTagging({
      id: "tagging_1",
      workspaceId: "workspace_1",
      tagId: "tag_1",
      targetType: "item",
      targetId: "item_1",
      source: "inline",
      timestamp: TEST_TIMESTAMP
    });

    const deleted = repository.softDeleteTagging(
      "tagging_1",
      TEST_TIMESTAMP_LATER
    );

    expect(deleted.deletedAt).toBe(TEST_TIMESTAMP_LATER);
    expect(
      repository.listTagsForTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: "item_1"
      })
    ).toEqual([]);
    expect(
      repository.listTaggingsForTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: "item_1",
        includeDeleted: true
      })
    ).toHaveLength(1);
  });
});
