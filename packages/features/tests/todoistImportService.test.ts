import {
  ActivityLogRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  RelationshipRepository,
  SearchIndexRepository,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TodoistImportService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("TodoistImportService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({ databasePath: testDb.databasePath });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: "2026-05-14T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("previews Todoist backup CSV tasks, sections, subtasks, comments, attachment links, and omission warnings", () => {
    const summary = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "todoist_backup.zip",
      entries: [
        {
          relativePath: "Launch.csv",
          kind: "csv",
          content: [
            "TYPE,CONTENT,DESCRIPTION,PRIORITY,INDENT,DATE,LABELS,ATTACHMENTS",
            "section,Admin,,,,,,",
            "task,Plan launch,Coordinate the launch,2,1,2026-05-20,client; launch,",
            "note,Discuss with Alice,,,,,,https://example.invalid/brief.pdf",
            "task,Book venue,,3,2,every Friday,@ops,"
          ].join("\n")
        },
        { relativePath: "manifest.json", kind: "unsupported", sizeBytes: 12 }
      ]
    });

    expect(summary).toMatchObject({
      valid: true,
      sourceKind: "backup_zip",
      projectCount: 1,
      sectionCount: 1,
      taskCount: 2,
      subtaskCount: 1,
      commentCount: 1,
      attachmentLinkCount: 1
    });
    expect(summary.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "project", title: "Launch" }),
        expect.objectContaining({ kind: "section", title: "Admin" }),
        expect.objectContaining({ kind: "task", title: "Plan launch", dueText: "2026-05-20" }),
        expect.objectContaining({ kind: "comment", action: "append", title: "Discuss with Alice" }),
        expect.objectContaining({ kind: "task", title: "Book venue", dueText: "every Friday" }),
        expect.objectContaining({ kind: "unsupported", action: "skip", title: "manifest.json" })
      ])
    );
    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "todoist_completed_archived_may_be_absent" }),
        expect.objectContaining({ code: "due_text_preserved", severity: "warning" }),
        expect.objectContaining({ code: "inert_attachment_url", severity: "warning" })
      ])
    );
    expect(summary.sourceReport).toMatchObject({
      completedAndArchivedMayBeAbsent: true,
      inertAttachmentUrls: [
        {
          relativePath: "Launch.csv",
          rowNumber: 3,
          url: "https://example.invalid/brief.pdf"
        }
      ]
    });
  });

  it("imports Todoist tasks through task, tag, search, relationship, and activity flows", async () => {
    const summary = await createService().executeImport({
      workspaceId: "workspace_1",
      rootName: "todoist_backup.zip",
      entries: [
        {
          relativePath: "Launch.csv",
          kind: "csv",
          content: [
            "TYPE,CONTENT,DESCRIPTION,PRIORITY,INDENT,DATE,LABELS,ATTACHMENTS",
            "section,Admin,,,,,,",
            "task,Plan launch,Coordinate the launch,2,1,2026-05-20,client; launch,",
            "note,Discuss with Alice,,,,,,https://example.invalid/brief.pdf",
            "task,Book venue,,3,2,every Friday,@ops,"
          ].join("\n")
        }
      ]
    });

    expect(summary.valid).toBe(true);
    expect(summary.created.map((target) => target.targetType)).toEqual(
      expect.arrayContaining(["project", "item", "relationship"])
    );

    const project = new ContainerRepository(connection).listByWorkspace("workspace_1", {
      type: "project"
    })[0]!;
    expect(project.name).toBe("Launch");

    const items = new ItemRepository(connection).listByContainer(project.id);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "heading", title: "Admin" }),
        expect.objectContaining({ type: "task", title: "Plan launch" }),
        expect.objectContaining({ type: "task", title: "Book venue" })
      ])
    );

    const tasks = new TaskRepository(connection).listByContainer(project.id);
    const parent = tasks.find((task) => task.item.title === "Plan launch")!;
    const child = tasks.find((task) => task.item.title === "Book venue")!;

    expect(parent).toMatchObject({
      item: {
        body: expect.stringContaining("Discuss with Alice")
      },
      task: {
        dueAt: "2026-05-20T00:00:00.000Z",
        priority: 2
      }
    });
    expect(parent.item.body).toContain("https://example.invalid/brief.pdf");
    expect(child).toMatchObject({
      item: {
        body: expect.stringContaining("Todoist due text: every Friday")
      },
      task: {
        dueAt: null,
        priority: 3
      }
    });

    expect(new TagRepository(connection).listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: parent.item.id
    }).map((tag) => tag.slug)).toEqual(["client", "launch"]);
    expect(new TagRepository(connection).listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: child.item.id
    }).map((tag) => tag.slug)).toEqual(["ops"]);

    expect(new RelationshipRepository(connection).listOutgoingRelationships({
      workspaceId: "workspace_1",
      target: { type: "item", id: child.item.id }
    })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: "item",
          targetId: parent.item.id,
          relationType: "belongs_to",
          label: "Todoist subtask"
        })
      ])
    );

    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: parent.item.id
    })).toMatchObject({
      title: "Plan launch",
      body: expect.stringContaining("Coordinate the launch"),
      tags: "client launch"
    });
    expect(new ActivityLogRepository(connection).listForTarget("workspace", "workspace_1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "todoist_import_completed", actorType: "importer" })
      ])
    );
  });

  it("rejects unsafe paths and empty Todoist exports", () => {
    const unsafe = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Unsafe",
      entries: [{ relativePath: "../escape.csv", kind: "csv", content: "TYPE,CONTENT\ntask,Escape\n" }]
    });

    expect(unsafe.valid).toBe(false);
    expect(unsafe.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "unsafe_path" })])
    );

    const empty = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Empty",
      entries: [{ relativePath: "readme.txt", kind: "unsupported", sizeBytes: 1 }]
    });

    expect(empty.valid).toBe(false);
    expect(empty.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "empty_todoist_export" })])
    );
  });
});

function createService(): TodoistImportService {
  return new TodoistImportService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-14T01:02:03.000Z")
  });
}
