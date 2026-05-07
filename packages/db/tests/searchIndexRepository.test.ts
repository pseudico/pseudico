import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SearchIndexRepository, type DatabaseConnection } from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("SearchIndexRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    seedWorkspace(connection, "workspace_2");
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("upserts and searches records within a workspace", () => {
    const repository = new SearchIndexRepository(connection);

    const record = repository.upsert({
      id: "search_1",
      workspaceId: "workspace_1",
      targetType: "container",
      targetId: "container_1",
      title: "Launch Plan",
      body: "Supplier checklist",
      tags: "ops planning",
      category: "Work",
      metadataJson: JSON.stringify({ type: "project" }),
      timestamp: TEST_TIMESTAMP
    });
    repository.upsert({
      id: "search_2",
      workspaceId: "workspace_2",
      targetType: "container",
      targetId: "container_2",
      title: "Launch Plan",
      timestamp: TEST_TIMESTAMP
    });

    expect(record).toMatchObject({
      targetType: "container",
      targetId: "container_1",
      title: "Launch Plan",
      isDeleted: false
    });
    expect(repository.search("workspace_1", "supplier")).toEqual([record]);
    expect(repository.search("workspace_2", "supplier")).toEqual([]);
  });

  it("updates existing target records without changing the stable row id", () => {
    const repository = new SearchIndexRepository(connection);
    repository.upsert({
      id: "search_1",
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      title: "Draft note",
      timestamp: TEST_TIMESTAMP
    });

    const updated = repository.upsert({
      id: "search_replacement",
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      title: "Final note",
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(updated).toMatchObject({
      id: "search_1",
      title: "Final note",
      updatedAt: TEST_TIMESTAMP_LATER
    });
    expect(repository.search("workspace_1", "draft")).toEqual([]);
    expect(repository.search("workspace_1", "final")).toEqual([updated]);
  });

  it("removes records and excludes deleted records from normal search", () => {
    const repository = new SearchIndexRepository(connection);
    repository.upsert({
      id: "search_1",
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      title: "Archived note",
      isDeleted: true,
      timestamp: TEST_TIMESTAMP
    });
    repository.upsert({
      id: "search_2",
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_2",
      title: "Active note",
      timestamp: TEST_TIMESTAMP
    });

    expect(repository.search("workspace_1", "note")).toHaveLength(1);
    expect(
      repository.search("workspace_1", "note", { includeDeleted: true })
    ).toHaveLength(2);

    repository.remove({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_2"
    });

    expect(repository.search("workspace_1", "active")).toEqual([]);
  });

  it("applies limit and offset to large search result sets", () => {
    const repository = new SearchIndexRepository(connection);

    for (let index = 0; index < 40; index += 1) {
      repository.upsert({
        id: `search_${index}`,
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: `item_${index}`,
        title: `Supplier result ${index.toString().padStart(2, "0")}`,
        timestamp: `2026-05-01T00:${String(index).padStart(2, "0")}:00.000Z`
      });
    }

    expect(
      repository
        .search("workspace_1", "supplier", { limit: 10, offset: 0 })
        .map((record) => record.targetId)
    ).toEqual([
      "item_39",
      "item_38",
      "item_37",
      "item_36",
      "item_35",
      "item_34",
      "item_33",
      "item_32",
      "item_31",
      "item_30"
    ]);
    expect(
      repository
        .search("workspace_1", "supplier", { limit: 10, offset: 10 })
        .map((record) => record.targetId)
    ).toEqual([
      "item_29",
      "item_28",
      "item_27",
      "item_26",
      "item_25",
      "item_24",
      "item_23",
      "item_22",
      "item_21",
      "item_20"
    ]);
  });
});
