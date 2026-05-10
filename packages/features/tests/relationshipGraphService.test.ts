import {
  ActivityLogRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RelationshipGraphService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("RelationshipGraphService", () => {
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
      schemaVersion: 2,
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    seedGraphTargets();
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("expands direct and second-degree relationships with hydrated nodes", async () => {
    const service = createService();
    await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "container", id: "project_1" },
      target: { type: "container", id: "contact_1" },
      relationType: "related"
    });
    await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "container", id: "contact_1" },
      target: { type: "item", id: "note_1" },
      relationType: "references",
      label: "Discovery note"
    });

    const graph = service.getGraph({
      workspaceId: "workspace_1",
      root: { type: "container", id: "project_1" }
    });

    expect(graph.nodes.map((node) => [node.id, node.depth, node.title]))
      .toEqual([
        ["project_1", 0, "Launch Plan"],
        ["contact_1", 1, "Alex Chen"],
        ["note_1", 2, "Discovery notes"]
      ]);
    expect(graph.edges.map((edge) => [edge.id, edge.depth, edge.relationType]))
      .toEqual([
        ["relationship_1", 1, "related"],
        ["relationship_3", 2, "references"]
      ]);
  });

  it("filters by relationship type", async () => {
    const service = createService();
    await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "container", id: "project_1" },
      target: { type: "container", id: "contact_1" },
      relationType: "related"
    });
    await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "container", id: "project_1" },
      target: { type: "item", id: "note_1" },
      relationType: "references"
    });

    const graph = service.getGraph({
      workspaceId: "workspace_1",
      root: { type: "container", id: "project_1" },
      relationType: "references"
    });

    expect(graph.selectedRelationType).toBe("references");
    expect(graph.edges.map((edge) => edge.relationType)).toEqual(["references"]);
    expect(graph.nodes.map((node) => node.id)).toEqual(["project_1", "note_1"]);
  });

  it("handles relationship cycles without duplicating direct edges", async () => {
    const service = createService();
    await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "container", id: "project_1" },
      target: { type: "container", id: "contact_1" },
      relationType: "related"
    });
    await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "container", id: "contact_1" },
      target: { type: "container", id: "project_1" },
      relationType: "blocked_by"
    });

    const graph = service.getGraph({
      workspaceId: "workspace_1",
      root: { type: "container", id: "project_1" }
    });

    expect(graph.nodes.map((node) => node.id)).toEqual([
      "project_1",
      "contact_1"
    ]);
    expect(graph.edges.map((edge) => [edge.id, edge.depth])).toEqual([
      ["relationship_1", 1],
      ["relationship_3", 1]
    ]);
  });

  it("removes direct relationships through the graph service with activity", async () => {
    const service = createService();
    const created = await service.createRelationship({
      workspaceId: "workspace_1",
      source: { type: "container", id: "project_1" },
      target: { type: "item", id: "note_1" },
      relationType: "references"
    });

    await service.removeRelationship(created.relationship.id);

    expect(service.getGraph({
      workspaceId: "workspace_1",
      root: { type: "container", id: "project_1" }
    }).edges).toEqual([]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("relationship", created.relationship.id)
        .map((event) => event.action)
    ).toEqual(["relationship_created", "relationship_removed"]);
  });
});

function createService(): RelationshipGraphService {
  return new RelationshipGraphService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function seedGraphTargets(): void {
  const timestamp = "2026-05-01T00:00:00.000Z";
  const containers = new ContainerRepository(connection);
  containers.create({
    id: "project_1",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    timestamp
  });
  containers.create({
    id: "contact_1",
    workspaceId: "workspace_1",
    type: "contact",
    name: "Alex Chen",
    slug: "alex-chen",
    timestamp
  });
  new ItemRepository(connection).create({
    id: "note_1",
    workspaceId: "workspace_1",
    containerId: "contact_1",
    type: "note",
    title: "Discovery notes",
    timestamp
  });
}
