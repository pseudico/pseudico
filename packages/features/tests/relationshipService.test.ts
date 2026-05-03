import {
  ActivityLogRepository,
  ContainerRepository,
  ItemRepository,
  ListRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RelationshipService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("RelationshipService", () => {
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
    seedRelationshipTargets();
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("creates relationships, prevents duplicates, and logs one create event", async () => {
    const service = createService();

    const created = await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "item", id: "item_1" },
      target: { type: "container", id: "container_project_1" },
      relationType: "references",
      label: " Launch brief "
    });
    const duplicate = await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "item", id: "item_1" },
      target: { type: "container", id: "container_project_1" },
      relationType: "references",
      label: "Launch brief"
    });

    expect(created).toMatchObject({
      changed: true,
      relationship: {
        id: "relationship_1",
        label: "Launch brief"
      }
    });
    expect(duplicate).toEqual({
      relationship: created.relationship,
      changed: false
    });
    expect(service.listOutgoingRelationships({
      workspaceId: "workspace_1",
      target: { type: "item", id: "item_1" }
    })).toEqual([created.relationship]);
    expect(service.listIncomingRelationships({
      workspaceId: "workspace_1",
      target: { type: "container", id: "container_project_1" }
    })).toEqual([created.relationship]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("relationship", created.relationship.id)
        .map((event) => event.action)
    ).toEqual(["relationship_created"]);
  });

  it("lists incoming and outgoing backlinks for item and list item endpoints", async () => {
    const service = createService();
    const incoming = await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "container", id: "container_project_1" },
      target: { type: "item", id: "item_1" },
      relationType: "related"
    });
    const outgoing = await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "item", id: "item_1" },
      target: { type: "list_item", id: "list_item_1" },
      relationType: "depends_on"
    });

    expect(service.listBacklinks({
      workspaceId: "workspace_1",
      target: { type: "item", id: "item_1" }
    })).toEqual([
      {
        direction: "incoming",
        relationship: incoming.relationship
      },
      {
        direction: "outgoing",
        relationship: outgoing.relationship
      }
    ]);
  });

  it("removes relationships with activity and excludes deleted backlinks", async () => {
    const service = createService();
    const created = await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "item", id: "item_1" },
      target: { type: "list_item", id: "list_item_1" },
      relationType: "depends_on"
    });

    const removed = await service.removeRelationship(created.relationship.id);
    const duplicateRemove = await service.removeRelationship({
      relationshipId: created.relationship.id
    });

    expect(removed.changed).toBe(true);
    expect(removed.relationship.deletedAt).toBe("2026-05-02T01:02:03.000Z");
    expect(duplicateRemove.changed).toBe(false);
    expect(service.listBacklinks({
      workspaceId: "workspace_1",
      target: { type: "item", id: "item_1" }
    })).toEqual([]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("relationship", created.relationship.id)
        .map((event) => event.action)
    ).toEqual(expect.arrayContaining([
      "relationship_created",
      "relationship_removed"
    ]));
  });

  it("rejects missing source or target records before writing", async () => {
    await expect(
      createService().createRelationship({
        workspaceId: "workspace_1",
        source: { type: "item", id: "missing_item" },
        target: { type: "container", id: "container_project_1" },
        relationType: "related"
      })
    ).rejects.toThrow("Relationship item target was not found");

    expect(new ActivityLogRepository(connection).listRecent("workspace_1"))
      .toEqual([]);
  });
});

function createService(): RelationshipService {
  return new RelationshipService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function seedRelationshipTargets(): void {
  new ContainerRepository(connection).create({
    id: "container_project_1",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
  new ItemRepository(connection).create({
    id: "item_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    type: "list",
    title: "Launch list",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
  new ListRepository(connection).createDetails({
    itemId: "item_1",
    workspaceId: "workspace_1",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
  new ListRepository(connection).createListItem({
    id: "list_item_1",
    workspaceId: "workspace_1",
    listId: "item_1",
    title: "Confirm brief",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
}
