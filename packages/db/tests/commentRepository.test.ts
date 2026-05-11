import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CommentRepository,
  ContainerRepository,
  ItemRepository,
  type DatabaseConnection
} from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("CommentRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: TEST_TIMESTAMP
    });
    new ItemRepository(connection).create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "task",
      title: "Draft proposal",
      timestamp: TEST_TIMESTAMP
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates, lists, updates, and soft-deletes target comments", () => {
    const repository = new CommentRepository(connection);

    const first = repository.create({
      id: "comment_1",
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      body: "Check revised supplier numbers.",
      authorLabel: "Local user",
      timestamp: TEST_TIMESTAMP
    });
    const second = repository.create({
      id: "comment_2",
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      body: "Attach signed approval.",
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(repository.listForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1"
    })).toEqual([first, second]);
    expect(second.sortOrder).toBe(2048);

    const updated = repository.update("comment_1", {
      body: "Check final supplier numbers.",
      timestamp: TEST_TIMESTAMP_LATER
    });
    expect(updated).toMatchObject({
      body: "Check final supplier numbers.",
      editedAt: TEST_TIMESTAMP_LATER
    });

    const deleted = repository.softDelete("comment_2", TEST_TIMESTAMP_LATER);
    expect(deleted.deletedAt).toBe(TEST_TIMESTAMP_LATER);
    expect(repository.countForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1"
    })).toBe(1);
    expect(repository.listForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1"
    }).map((comment) => comment.id)).toEqual(["comment_1"]);
  });
});
