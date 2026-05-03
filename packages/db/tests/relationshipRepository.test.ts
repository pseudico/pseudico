import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ItemRepository,
  ListRepository,
  RelationshipRepository,
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

describe("RelationshipRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    seedRelationshipTargets();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates exact relationships once and lists outgoing and incoming backlinks", () => {
    const repository = new RelationshipRepository(connection);

    const relationship = repository.create({
      id: "relationship_1",
      workspaceId: "workspace_1",
      sourceType: "item",
      sourceId: "item_1",
      targetType: "container",
      targetId: "container_project_1",
      relationType: "references",
      label: "Brief",
      timestamp: TEST_TIMESTAMP
    });
    const duplicate = repository.create({
      id: "relationship_duplicate",
      workspaceId: "workspace_1",
      sourceType: "item",
      sourceId: "item_1",
      targetType: "container",
      targetId: "container_project_1",
      relationType: "references",
      label: "Brief",
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(duplicate).toEqual(relationship);
    expect(repository.listOutgoingRelationships({
      workspaceId: "workspace_1",
      target: { type: "item", id: "item_1" }
    })).toEqual([relationship]);
    expect(repository.listIncomingRelationships({
      workspaceId: "workspace_1",
      target: { type: "container", id: "container_project_1" }
    })).toEqual([relationship]);
    expect(repository.listBacklinks({
      workspaceId: "workspace_1",
      target: { type: "item", id: "item_1" }
    })).toEqual([
      {
        direction: "outgoing",
        relationship
      }
    ]);
  });

  it("supports list item endpoints and soft-deletes relationships", () => {
    const repository = new RelationshipRepository(connection);
    const relationship = repository.create({
      id: "relationship_1",
      workspaceId: "workspace_1",
      sourceType: "list_item",
      sourceId: "list_item_1",
      targetType: "item",
      targetId: "item_1",
      relationType: "depends_on",
      timestamp: TEST_TIMESTAMP
    });

    const deleted = repository.softDelete(relationship.id, TEST_TIMESTAMP_LATER);

    expect(deleted.deletedAt).toBe(TEST_TIMESTAMP_LATER);
    expect(repository.getById(relationship.id)).toBeNull();
    expect(repository.listOutgoingRelationships({
      workspaceId: "workspace_1",
      target: { type: "list_item", id: "list_item_1" }
    })).toEqual([]);
    expect(repository.listOutgoingRelationships({
      workspaceId: "workspace_1",
      target: { type: "list_item", id: "list_item_1" },
      includeDeleted: true
    })).toEqual([deleted]);
  });
});

function seedRelationshipTargets(): void {
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
    type: "list",
    title: "Launch list",
    timestamp: TEST_TIMESTAMP
  });
  new ListRepository(connection).createDetails({
    itemId: "item_1",
    workspaceId: "workspace_1",
    timestamp: TEST_TIMESTAMP
  });
  new ListRepository(connection).createListItem({
    id: "list_item_1",
    workspaceId: "workspace_1",
    listId: "item_1",
    title: "Confirm brief",
    timestamp: TEST_TIMESTAMP
  });
}
