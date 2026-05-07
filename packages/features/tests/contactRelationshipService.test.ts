import {
  ActivityLogRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContactRelationshipService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("ContactRelationshipService", () => {
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
    seedContactProjectTargets();
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("links contacts and projects, reports reciprocal summaries, and logs writes", async () => {
    const service = createService();

    const created = await service.linkContactToProject({
      workspaceId: "workspace_1",
      contactId: "contact_1",
      projectId: "project_1"
    });
    const duplicate = await service.linkContactToProject({
      workspaceId: "workspace_1",
      contactId: "contact_1",
      projectId: "project_1"
    });

    expect(created).toMatchObject({
      changed: true,
      relationship: {
        sourceType: "container",
        sourceId: "contact_1",
        targetType: "container",
        targetId: "project_1",
        relationType: "related",
        label: "project_contact"
      }
    });
    expect(duplicate).toEqual({
      relationship: created.relationship,
      changed: false
    });
    expect(service.listContactsForProject({
      workspaceId: "workspace_1",
      projectId: "project_1"
    })).toMatchObject([
      {
        relationshipId: created.relationship.id,
        contact: {
          id: "contact_1",
          name: "Alex Chen"
        },
        openTaskCount: 1,
        recentActivityCount: 1
      }
    ]);
    expect(service.listProjectsForContact({
      workspaceId: "workspace_1",
      contactId: "contact_1"
    })).toMatchObject([
      {
        relationshipId: created.relationship.id,
        project: {
          id: "project_1",
          name: "Launch Plan"
        },
        openTaskCount: 1,
        recentActivityCount: 1
      }
    ]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("relationship", created.relationship.id)
        .map((event) => event.action)
    ).toEqual(["relationship_created"]);
  });

  it("unlinks relationships with activity and excludes deleted summaries", async () => {
    const service = createService();
    const created = await service.linkContactToProject({
      workspaceId: "workspace_1",
      contactId: "contact_1",
      projectId: "project_1"
    });

    const removed = await service.unlinkContactFromProject(
      created.relationship.id
    );

    expect(removed.changed).toBe(true);
    expect(removed.relationship.deletedAt).toBe("2026-05-02T01:02:03.000Z");
    expect(service.listContactsForProject({
      workspaceId: "workspace_1",
      projectId: "project_1"
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
});

function createService(): ContactRelationshipService {
  return new ContactRelationshipService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}

function seedContactProjectTargets(): void {
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
    timestamp,
    description: "Client stakeholder"
  });
  const items = new ItemRepository(connection);
  const tasks = new TaskRepository(connection);
  items.create({
    id: "project_task_1",
    workspaceId: "workspace_1",
    containerId: "project_1",
    type: "task",
    title: "Prepare launch deck",
    timestamp
  });
  tasks.createDetails({
    itemId: "project_task_1",
    workspaceId: "workspace_1",
    timestamp,
    taskStatus: "open"
  });
  items.create({
    id: "contact_task_1",
    workspaceId: "workspace_1",
    containerId: "contact_1",
    type: "task",
    title: "Follow up with Alex",
    timestamp
  });
  tasks.createDetails({
    itemId: "contact_task_1",
    workspaceId: "workspace_1",
    timestamp,
    taskStatus: "waiting"
  });
  new ActivityLogRepository(connection).create({
    id: "activity_project_1",
    workspaceId: "workspace_1",
    actorType: "local_user",
    action: "container_updated",
    targetType: "container",
    targetId: "project_1",
    summary: "Updated Launch Plan.",
    timestamp
  });
  new ActivityLogRepository(connection).create({
    id: "activity_contact_1",
    workspaceId: "workspace_1",
    actorType: "local_user",
    action: "container_updated",
    targetType: "container",
    targetId: "contact_1",
    summary: "Updated Alex Chen.",
    timestamp
  });
}
