import {
  ActivityLogRepository,
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
import {
  CsvTaskImporter,
  ImportPreviewService,
  MarkdownNoteImporter
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const TIMESTAMP = "2026-05-15T00:00:00.000Z";

describe("LWO-M8-009 import foundations", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({ databasePath: testDb.databasePath });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: TIMESTAMP
    });
    new ContainerRepository(connection).createSystemInbox({
      id: "container_inbox_1",
      workspaceId: "workspace_1",
      timestamp: TIMESTAMP
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("previews and applies task CSV imports through the task-only importer facade", async () => {
    const importer = createCsvTaskImporter();
    const preview = importer.previewTaskCsvImport({
      workspaceId: "workspace_1",
      contents: "Project,Task,Due,Tags,Body\nLaunch,Follow up,2026-05-20,client;launch,Bring notes\n"
    });

    expect(preview).toMatchObject({
      valid: true,
      targetType: "task",
      creatableCount: 1,
      rows: [expect.objectContaining({ title: "Follow up", containerName: "Launch" })]
    });

    const summary = await importer.applyTaskCsvImport({
      workspaceId: "workspace_1",
      contents: "Project,Task,Due,Tags,Body\nLaunch,Follow up,2026-05-20,client;launch,Bring notes\n"
    });

    expect(summary.importedCount).toBe(1);
    const task = new TaskRepository(connection).getByItemId(summary.created[0]!.id);
    expect(task).toMatchObject({
      item: { title: "Follow up", body: "Bring notes" },
      task: { dueAt: "2026-05-20T00:00:00.000Z" }
    });
  });

  it("previews Markdown notes with invalid-row reporting before writes", () => {
    const preview = createPreviewService().previewMarkdownImport({
      workspaceId: "workspace_1",
      containerId: "container_inbox_1",
      files: [
        { relativePath: "daily/brief.md", content: "# Brief\nBody" },
        { relativePath: "daily/brief.md", content: "# Duplicate\nBody" },
        { relativePath: "../escape.md", content: "# Escape" },
        { relativePath: "notes.txt", content: "# Wrong extension" }
      ]
    });

    expect(preview.valid).toBe(false);
    expect(preview.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate_path_skipped", severity: "warning" }),
        expect.objectContaining({ code: "unsafe_path", severity: "error" }),
        expect.objectContaining({ code: "unsupported_file_type", severity: "error" })
      ])
    );
    expect(preview.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Brief", action: "create" }),
        expect.objectContaining({ title: "Duplicate", action: "skip" })
      ])
    );
  });

  it("applies Markdown note imports through NoteService with activity, tags, and search", async () => {
    const summary = await createMarkdownNoteImporter().applyMarkdownImport({
      workspaceId: "workspace_1",
      containerId: "container_inbox_1",
      files: [
        {
          relativePath: "research/brief.md",
          content: "---\ntitle: Imported Brief\ntags: [client, launch]\n---\n# Ignored Heading\nBody with #field tag and [[Launch Plan]]."
        }
      ]
    });

    expect(summary).toMatchObject({
      valid: true,
      importedCount: 1,
      created: [expect.objectContaining({ targetType: "item", title: "Imported Brief" })]
    });

    const note = new NoteRepository(connection).getByItemId(summary.created[0]!.id);
    expect(note).toMatchObject({
      item: {
        containerId: "container_inbox_1",
        title: "Imported Brief"
      },
      note: {
        content: expect.stringContaining("Body with #field tag")
      }
    });
    expect(new TagRepository(connection).listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: summary.created[0]!.id
    }).map((tag) => tag.slug).sort()).toEqual(["client", "field", "launch"]);
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: summary.created[0]!.id
    })).toMatchObject({
      title: "Imported Brief",
      body: expect.stringContaining("Body with #field tag")
    });
    expect(new ActivityLogRepository(connection).listForTarget("workspace", "workspace_1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "markdown_note_import_completed", actorType: "importer" })
      ])
    );
  });
});

function createCsvTaskImporter(): CsvTaskImporter {
  return new CsvTaskImporter({
    connection,
    idFactory: nextId,
    now: () => new Date("2026-05-15T01:02:03.000Z")
  });
}

function createMarkdownNoteImporter(): MarkdownNoteImporter {
  return new MarkdownNoteImporter({
    connection,
    idFactory: nextId,
    now: () => new Date("2026-05-15T01:02:03.000Z")
  });
}

function createPreviewService(): ImportPreviewService {
  return new ImportPreviewService({
    connection,
    idFactory: nextId,
    now: () => new Date("2026-05-15T01:02:03.000Z")
  });
}

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
