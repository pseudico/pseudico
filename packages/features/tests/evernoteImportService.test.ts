import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  MigrationService,
  NoteRepository,
  SearchIndexRepository,
  TagRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EvernoteImportService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("EvernoteImportService", () => {
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

  it("previews ENEX and HTML notes, tags, timestamps, resources, and source-report warnings", () => {
    const summary = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Notebook.enex",
      entries: [
        { relativePath: "Notebook.enex", kind: "enex", content: createEnex() },
        {
          relativePath: "Notebook.resources/launch.png",
          kind: "resource",
          resourceHash: "abc123",
          copiedFile: copiedAttachment("attachment_launch", "launch.png", "image/png")
        },
        { relativePath: "Notebook.html", kind: "html", content: createHtml() },
        {
          relativePath: "Notebook_files/photo.jpg",
          kind: "resource",
          noteRelativePath: "Notebook.html",
          copiedFile: copiedAttachment("attachment_photo", "photo.jpg", "image/jpeg")
        },
        { relativePath: "README.txt", kind: "unsupported", sizeBytes: 12 }
      ]
    });

    expect(summary).toMatchObject({
      valid: true,
      notebookName: "Notebook",
      enexCount: 1,
      htmlCount: 1,
      noteCount: 2,
      tagCount: 3,
      resourceCount: 2,
      attachedResourceCount: 2,
      unsupportedCount: 1
    });
    expect(summary.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "project", title: "Notebook" }),
        expect.objectContaining({
          kind: "note",
          title: "Launch note",
          createdAt: "2026-05-13T01:02:03.000Z",
          updatedAt: "2026-05-14T04:05:06.000Z",
          tags: ["client", "launch"]
        }),
        expect.objectContaining({ kind: "resource", title: "launch.png", action: "attach" }),
        expect.objectContaining({ kind: "note", title: "HTML note", tags: ["html-tag"] }),
        expect.objectContaining({ kind: "resource", title: "photo.jpg", action: "attach" }),
        expect.objectContaining({ kind: "unsupported", action: "skip" })
      ])
    );
    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unsupported_formatting_preserved", severity: "warning" }),
        expect.objectContaining({ code: "html_resource_link", severity: "warning" }),
        expect.objectContaining({ code: "unsupported_evernote_export_file", severity: "warning" })
      ])
    );
  });

  it("imports Evernote notes through project, note, tag, attachment, search, and activity flows", async () => {
    const summary = await createService().executeImport({
      workspaceId: "workspace_1",
      rootName: "Notebook.enex",
      entries: [
        { relativePath: "Notebook.enex", kind: "enex", content: createEnex() },
        {
          relativePath: "Notebook.resources/launch.png",
          kind: "resource",
          resourceHash: "abc123",
          copiedFile: copiedAttachment("attachment_launch", "launch.png", "image/png")
        },
        { relativePath: "Notebook.html", kind: "html", content: createHtml() },
        {
          relativePath: "Notebook_files/photo.jpg",
          kind: "resource",
          noteRelativePath: "Notebook.html",
          copiedFile: copiedAttachment("attachment_photo", "photo.jpg", "image/jpeg")
        }
      ]
    });

    expect(summary.valid).toBe(true);
    expect(summary.created.map((target) => target.targetType)).toEqual(
      expect.arrayContaining(["project", "item", "attachment"])
    );

    const project = new ContainerRepository(connection).listByWorkspace("workspace_1", { type: "project" })[0]!;
    expect(project.name).toBe("Notebook");

    const notes = new NoteRepository(connection).listByContainer(project.id);
    expect(notes.map((note) => note.item.title).sort()).toEqual(["HTML note", "Launch note"]);
    const launch = notes.find((note) => note.item.title === "Launch note")!;
    expect(launch.note.content).toEqual(expect.stringContaining("Evernote created: 2026-05-13T01:02:03.000Z"));
    expect(launch.note.content).toEqual(expect.stringContaining("Evernote updated: 2026-05-14T04:05:06.000Z"));

    expect(new TagRepository(connection).listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: launch.item.id
    }).map((tag) => tag.slug).sort()).toEqual(["client", "launch"]);

    expect(new AttachmentRepository(connection).listForItem({
      workspaceId: "workspace_1",
      itemId: launch.item.id
    })[0]).toMatchObject({ originalName: "launch.png" });
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: launch.item.id
    })).toMatchObject({
      title: "Launch note",
      body: expect.stringContaining("Coordinate the launch")
    });
    expect(new ActivityLogRepository(connection).listForTarget("workspace", "workspace_1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "evernote_import_completed", actorType: "importer" })
      ])
    );
  });

  it("rejects unsafe paths and empty Evernote exports", () => {
    const unsafe = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Unsafe",
      entries: [{ relativePath: "../Notebook.enex", kind: "enex", content: createEnex() }]
    });
    expect(unsafe.valid).toBe(false);
    expect(unsafe.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "unsafe_path" })]));

    const empty = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Empty",
      entries: [{ relativePath: "photo.jpg", kind: "resource", sizeBytes: 1 }]
    });
    expect(empty.valid).toBe(false);
    expect(empty.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "empty_evernote_export" })]));
  });
});

function createService(): EvernoteImportService {
  return new EvernoteImportService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-14T01:02:03.000Z")
  });
}

function createEnex(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<en-export>
  <note>
    <title>Launch note</title>
    <guid>note_guid_1</guid>
    <created>20260513T010203Z</created>
    <updated>20260514T040506Z</updated>
    <tag>Client</tag>
    <tag>Launch</tag>
    <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
      <en-note><div>Coordinate the launch</div><en-todo checked="true"/> Confirm assets</en-note>]]></content>
    <resource>
      <data encoding="base64" hash="abc123">AAAA</data>
      <mime>image/png</mime>
      <resource-attributes>
        <file-name>launch.png</file-name>
      </resource-attributes>
    </resource>
  </note>
</en-export>`;
}

function createHtml(): string {
  return `<!doctype html>
<html>
  <head>
    <title>HTML note</title>
    <meta name="created" content="2026-05-10T00:00:00.000Z">
    <meta name="updated" content="2026-05-11T00:00:00.000Z">
    <meta name="keywords" content="html tag">
  </head>
  <body><h1>HTML note</h1><p>Body from HTML export.</p><img src="Notebook_files/photo.jpg"></body>
</html>`;
}

function copiedAttachment(attachmentId: string, originalName: string, mimeType: string) {
  return {
    attachmentId,
    originalName,
    storedName: originalName,
    storagePath: `attachments/2026/05/${attachmentId}/${originalName}`,
    sizeBytes: 12,
    checksum: "d".repeat(64),
    mimeType
  };
}
