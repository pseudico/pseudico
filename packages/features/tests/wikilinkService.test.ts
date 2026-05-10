import {
  ActivityLogRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  RelationshipRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoteService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("NoteService wikilinks", () => {
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
    seedTargets();
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("resolves unique project, contact, and item wikilinks and creates reference relationships", async () => {
    const result = await createService().createNote({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Meeting note",
      content: "Discuss [[Client A]], [[Launch Plan]], and [[Brief Item]]."
    });

    expect(result.wikilinks.map((link) => ({ title: link.title, status: link.status, kind: link.target?.kind }))).toEqual([
      { title: "Client A", status: "resolved", kind: "contact" },
      { title: "Launch Plan", status: "resolved", kind: "project" },
      { title: "Brief Item", status: "resolved", kind: "item" }
    ]);
    expect(
      new RelationshipRepository(connection)
        .listByWorkspace("workspace_1")
        .map((relationship) => ({
          sourceId: relationship.sourceId,
          targetType: relationship.targetType,
          targetId: relationship.targetId,
          relationType: relationship.relationType,
          label: relationship.label
        }))
    ).toEqual([
      {
        sourceId: result.item.id,
        targetType: "container",
        targetId: "container_contact_1",
        relationType: "references",
        label: "Client A"
      },
      {
        sourceId: result.item.id,
        targetType: "container",
        targetId: "container_project_1",
        relationType: "references",
        label: "Launch Plan"
      },
      {
        sourceId: result.item.id,
        targetType: "item",
        targetId: "item_brief_1",
        relationType: "references",
        label: "Brief Item"
      }
    ]);
    expect(
      new ActivityLogRepository(connection)
        .listRecent("workspace_1")
        .map((event) => event.action)
    ).toEqual(expect.arrayContaining(["relationship_created"]));
  });

  it("marks duplicate-title wikilinks ambiguous and does not create a relationship", async () => {
    const result = await createService().createNote({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Ambiguous note",
      content: "Follow up with [[Shared Title]] and [[Missing Title]]."
    });

    expect(result.wikilinks.map((link) => ({
      title: link.title,
      status: link.status,
      candidateCount: link.candidates.length
    }))).toEqual([
      { title: "Shared Title", status: "ambiguous", candidateCount: 2 },
      { title: "Missing Title", status: "broken", candidateCount: 0 }
    ]);
    expect(new RelationshipRepository(connection).listByWorkspace("workspace_1")).toEqual([]);
  });
});

function createService(): NoteService {
  return new NoteService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function seedTargets(): void {
  const containers = new ContainerRepository(connection);
  containers.create({
    id: "container_project_1",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
  containers.create({
    id: "container_contact_1",
    workspaceId: "workspace_1",
    type: "contact",
    name: "Client A",
    slug: "client-a",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
  containers.create({
    id: "container_project_2",
    workspaceId: "workspace_1",
    type: "project",
    name: "Shared Title",
    slug: "shared-title-project",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
  containers.create({
    id: "container_contact_2",
    workspaceId: "workspace_1",
    type: "contact",
    name: "Shared Title",
    slug: "shared-title-contact",
    timestamp: "2026-05-01T00:00:00.000Z"
  });

  new ItemRepository(connection).create({
    id: "item_brief_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    type: "task",
    title: "Brief Item",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
}