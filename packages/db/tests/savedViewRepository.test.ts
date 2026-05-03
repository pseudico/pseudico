import {
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  SavedViewRepository,
  TagRepository,
  TaskRepository
} from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let testDb: RepositoryTestDatabase;

describe("SavedViewRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    seedWorkspace(testDb.connection);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates, updates, lists, and soft deletes saved views", () => {
    const repository = new SavedViewRepository(testDb.connection);
    const created = repository.create({
      id: "saved_view_1",
      workspaceId: "workspace_1",
      type: "collection",
      name: "Phone calls",
      description: "Call tasks",
      queryJson: JSON.stringify({ version: 1, match: "all", conditions: [] }),
      timestamp: TEST_TIMESTAMP,
      isFavorite: true
    });

    expect(created).toMatchObject({
      id: "saved_view_1",
      type: "collection",
      name: "Phone calls",
      isFavorite: true,
      deletedAt: null
    });

    const updated = repository.update("saved_view_1", {
      name: "Priority calls",
      isFavorite: false,
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(updated).toMatchObject({
      name: "Priority calls",
      isFavorite: false,
      updatedAt: TEST_TIMESTAMP_LATER
    });
    expect(repository.listByWorkspace("workspace_1")).toHaveLength(1);

    const deleted = repository.softDelete("saved_view_1", TEST_TIMESTAMP_LATER);

    expect(deleted.deletedAt).toBe(TEST_TIMESTAMP_LATER);
    expect(repository.listByWorkspace("workspace_1")).toHaveLength(0);
    expect(
      repository.listByWorkspace("workspace_1", { includeDeleted: true })
    ).toHaveLength(1);
  });

  it("hydrates evaluation targets with container, category, tag, and task fields", () => {
    const category = new CategoryRepository(testDb.connection).create({
      id: "category_1",
      workspaceId: "workspace_1",
      name: "Work",
      slug: "work",
      color: "#245c55",
      timestamp: TEST_TIMESTAMP
    });
    const project = new ContainerRepository(testDb.connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      categoryId: category.id,
      timestamp: TEST_TIMESTAMP
    });
    const item = new ItemRepository(testDb.connection).create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "task",
      title: "Call supplier",
      categoryId: category.id,
      timestamp: TEST_TIMESTAMP
    });

    new TaskRepository(testDb.connection).createDetails({
      itemId: item.id,
      workspaceId: "workspace_1",
      taskStatus: "waiting",
      dueAt: "2026-05-05T00:00:00.000Z",
      timestamp: TEST_TIMESTAMP
    });

    const tagRepository = new TagRepository(testDb.connection);
    const tag = tagRepository.create({
      id: "tag_1",
      workspaceId: "workspace_1",
      name: "phone-call",
      slug: "phone-call",
      timestamp: TEST_TIMESTAMP
    });
    tagRepository.createTagging({
      id: "tagging_1",
      workspaceId: "workspace_1",
      tagId: tag.id,
      targetType: "item",
      targetId: item.id,
      source: "manual",
      timestamp: TEST_TIMESTAMP
    });

    expect(
      new SavedViewRepository(testDb.connection).listEvaluationTargets(
        "workspace_1"
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: "item",
          targetId: "item_1",
          kind: "task",
          containerType: "project",
          containerTitle: "Launch Plan",
          categorySlug: "work",
          taskStatus: "waiting",
          dueAt: "2026-05-05T00:00:00.000Z",
          tagSlugs: ["phone-call"]
        }),
        expect.objectContaining({
          targetType: "container",
          targetId: "container_1",
          kind: "project",
          categorySlug: "work"
        })
      ])
    );
  });
});
