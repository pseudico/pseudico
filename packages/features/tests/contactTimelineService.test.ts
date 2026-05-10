import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  NoteRepository,
  RelationshipRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { ContactTimelineService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;

describe("ContactTimelineService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    new MigrationService({ connection }).runPendingMigrations();
    seedWorkspace();
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("orders contact items, files, relationships, and activity chronologically", () => {
    const timeline = createService().getTimeline({ contactId: "contact_1" });

    expect(timeline.contact.name).toBe("Alex Chen");
    expect(timeline.followUpSummary).toMatchObject({
      openFollowUpCount: 2,
      overdueTaskCount: 1,
      nextDueTask: { itemId: "task_overdue", overdue: true }
    });
    expect(timeline.entries.map((entry) => entry.id).slice(0, 5)).toEqual([
      "activity:activity_note_updated",
      "item:file_1",
      "relationship:relationship_1",
      "item:task_future",
      "item:note_1"
    ]);
    expect(timeline.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "file",
          title: "Proposal PDF (proposal.pdf)"
        }),
        expect.objectContaining({
          kind: "relationship",
          relatedTargetName: "Launch Plan"
        }),
        expect.objectContaining({
          kind: "activity",
          activityAction: "note_updated"
        })
      ])
    );
  });

  it("filters to open follow-up tasks", () => {
    const timeline = createService().getTimeline({
      contactId: "contact_1",
      filter: "follow_up"
    });

    expect(timeline.entries.map((entry) => entry.targetId)).toEqual([
      "task_future",
      "task_overdue"
    ]);
    expect(timeline.entries.every((entry) => entry.kind === "task")).toBe(true);
    expect(timeline.entries.find((entry) => entry.targetId === "task_overdue"))
      .toMatchObject({ overdue: true, dueAt: "2026-05-08T00:00:00.000Z" });
  });
});

function createService(): ContactTimelineService {
  return new ContactTimelineService({
    connection,
    now: () => new Date("2026-05-10T12:00:00.000Z")
  });
}

function seedWorkspace(): void {
  new WorkspaceRepository(connection).create({
    id: "workspace_1",
    name: "Personal Work",
    schemaVersion: 2,
    timestamp: "2026-05-01T00:00:00.000Z"
  });

  const containers = new ContainerRepository(connection);
  containers.create({
    id: "contact_1",
    workspaceId: "workspace_1",
    type: "contact",
    name: "Alex Chen",
    slug: "alex-chen",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
  containers.create({
    id: "project_1",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    timestamp: "2026-05-01T00:00:00.000Z"
  });

  const items = new ItemRepository(connection);
  const tasks = new TaskRepository(connection);
  items.create({
    id: "task_overdue",
    workspaceId: "workspace_1",
    containerId: "contact_1",
    type: "task",
    title: "Send overdue follow-up",
    timestamp: "2026-05-03T10:00:00.000Z"
  });
  tasks.createDetails({
    itemId: "task_overdue",
    workspaceId: "workspace_1",
    taskStatus: "open",
    dueAt: "2026-05-08T00:00:00.000Z",
    timestamp: "2026-05-03T10:00:00.000Z"
  });
  items.create({
    id: "task_future",
    workspaceId: "workspace_1",
    containerId: "contact_1",
    type: "task",
    title: "Book review call",
    timestamp: "2026-05-06T08:00:00.000Z"
  });
  tasks.createDetails({
    itemId: "task_future",
    workspaceId: "workspace_1",
    taskStatus: "waiting",
    dueAt: "2026-05-12T00:00:00.000Z",
    timestamp: "2026-05-06T08:00:00.000Z"
  });

  items.create({
    id: "note_1",
    workspaceId: "workspace_1",
    containerId: "contact_1",
    type: "note",
    title: "Kickoff notes",
    body: "Discussed launch milestones.",
    timestamp: "2026-05-05T09:00:00.000Z"
  });
  new NoteRepository(connection).createDetails({
    itemId: "note_1",
    workspaceId: "workspace_1",
    content: "Discussed launch milestones.",
    preview: "Discussed launch milestones.",
    timestamp: "2026-05-05T09:00:00.000Z"
  });

  items.create({
    id: "file_1",
    workspaceId: "workspace_1",
    containerId: "contact_1",
    type: "file",
    title: "Proposal PDF",
    timestamp: "2026-05-08T13:00:00.000Z"
  });
  new AttachmentRepository(connection).create({
    id: "attachment_1",
    workspaceId: "workspace_1",
    itemId: "file_1",
    originalName: "proposal.pdf",
    storedName: "proposal.pdf",
    sizeBytes: 128,
    storagePath: "attachments/proposal.pdf",
    timestamp: "2026-05-08T13:00:00.000Z"
  });

  new RelationshipRepository(connection).create({
    id: "relationship_1",
    workspaceId: "workspace_1",
    sourceType: "container",
    sourceId: "contact_1",
    targetType: "container",
    targetId: "project_1",
    relationType: "related",
    label: "project_contact",
    timestamp: "2026-05-07T10:00:00.000Z"
  });

  new ActivityLogRepository(connection).create({
    id: "activity_note_updated",
    workspaceId: "workspace_1",
    actorType: "local_user",
    action: "note_updated",
    targetType: "item",
    targetId: "note_1",
    summary: "Updated kickoff notes.",
    timestamp: "2026-05-09T11:00:00.000Z"
  });
}
