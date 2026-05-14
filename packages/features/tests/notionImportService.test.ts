import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  MigrationService,
  NoteRepository,
  SearchIndexRepository,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NotionImportService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("NotionImportService", () => {
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

  it("previews Notion Markdown pages, database rows, assets, and unsupported source report warnings", () => {
    const summary = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Notion Export",
      entries: [
        {
          relativePath: "Projects/Launch.md",
          kind: "markdown",
          content: "# Launch plan\nSee https://example.invalid/file.png\n[Unsupported block]"
        },
        {
          relativePath: "Tasks.csv",
          kind: "csv",
          content: "Name,Due,Tags,Person\nFollow up,2026-05-20,client; launch,Alice\n"
        },
        { relativePath: "assets/logo.png", kind: "asset", sizeBytes: 12 },
        { relativePath: "Workspace export.html", kind: "unsupported", sizeBytes: 20 }
      ]
    });

    expect(summary.valid).toBe(true);
    expect(summary).toMatchObject({
      projectName: "Notion Export",
      pageCount: 1,
      databaseCount: 1,
      databaseRowCount: 1,
      assetCount: 1,
      unsupportedCount: 1
    });
    expect(summary.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "project", title: "Notion Export" }),
        expect.objectContaining({ kind: "page", title: "Launch plan" }),
        expect.objectContaining({ kind: "database_row", title: "Follow up" }),
        expect.objectContaining({ kind: "asset", title: "logo.png" }),
        expect.objectContaining({ kind: "unsupported", action: "skip" })
      ])
    );
    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unsupported_block", severity: "warning" }),
        expect.objectContaining({ code: "unsupported_source_field", severity: "warning" }),
        expect.objectContaining({ code: "inert_remote_url", severity: "warning" })
      ])
    );
  });

  it("imports Markdown pages, database rows, and copied assets through local services", async () => {
    const summary = await createService().executeImport({
      workspaceId: "workspace_1",
      rootName: "Notion Export",
      entries: [
        {
          relativePath: "Projects/Launch.md",
          kind: "markdown",
          content: "# Launch plan\nCoordinate launch notes @launch"
        },
        {
          relativePath: "Tasks.csv",
          kind: "csv",
          content: "Name,Due,Tags,Person\nFollow up,2026-05-20,client; launch,Alice\n"
        },
        {
          relativePath: "assets/logo.png",
          kind: "asset",
          copiedFile: {
            attachmentId: "attachment_logo",
            originalName: "logo.png",
            storedName: "logo.png",
            storagePath: "attachments/2026/05/attachment_logo/logo.png",
            sizeBytes: 12,
            checksum: "b".repeat(64),
            mimeType: "image/png"
          }
        }
      ]
    });

    expect(summary.valid).toBe(true);
    expect(summary.created.map((target) => target.targetType)).toEqual(
      expect.arrayContaining(["project", "item", "attachment"])
    );

    const project = new ContainerRepository(connection).listByWorkspace("workspace_1", {
      type: "project"
    })[0]!;
    expect(project.name).toBe("Notion Export");

    const notes = new NoteRepository(connection).listByContainer(project.id);
    expect(notes[0]).toMatchObject({
      item: { title: "Launch plan" },
      note: { content: expect.stringContaining("Coordinate launch") }
    });

    const task = new TaskRepository(connection).listByContainer(project.id)[0]!;
    expect(task).toMatchObject({
      item: {
        title: "Follow up",
        body: expect.stringContaining("Imported from Notion database CSV")
      },
      task: {
        dueAt: "2026-05-20T00:00:00.000Z"
      }
    });

    expect(new TagRepository(connection).listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: task.item.id
    }).map((tag) => tag.slug)).toEqual(["client", "launch"]);

    expect(new AttachmentRepository(connection).getById("attachment_logo")).toMatchObject({
      originalName: "logo.png"
    });
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: notes[0]!.item.id
    })).toMatchObject({
      title: "Launch plan",
      body: expect.stringContaining("Coordinate launch")
    });
    expect(new ActivityLogRepository(connection).listForTarget("workspace", "workspace_1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "notion_import_completed", actorType: "importer" })
      ])
    );
  });

  it("rejects unsafe paths and empty exports", () => {
    const unsafe = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Unsafe",
      entries: [{ relativePath: "../escape.md", kind: "markdown", content: "# Escape" }]
    });

    expect(unsafe.valid).toBe(false);
    expect(unsafe.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "unsafe_path" })])
    );

    const empty = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Empty",
      entries: [{ relativePath: "asset.png", kind: "asset", sizeBytes: 1 }]
    });

    expect(empty.valid).toBe(false);
    expect(empty.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "empty_notion_export" })])
    );
  });
});

function createService(): NotionImportService {
  return new NotionImportService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-14T01:02:03.000Z")
  });
}
