import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  ContainerTabRepository,
  ItemRepository,
  MigrationService,
  NoteRepository,
  RelationshipRepository,
  SearchIndexRepository,
  TagRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MarkdownFolderImportService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("MarkdownFolderImportService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({ databasePath: testDb.databasePath });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: "2026-05-13T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("previews Markdown folders as project, tabs, headings, notes, and files", () => {
    const summary = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Client Alpha",
      entries: [
        { relativePath: "Research", kind: "directory" },
        { relativePath: "Research/Sources", kind: "directory" },
        { relativePath: "Research/brief.md", kind: "markdown", content: "# Brief\nBody" },
        { relativePath: "Research/Sources/source.pdf", kind: "file", sizeBytes: 10 }
      ]
    });

    expect(summary).toMatchObject({
      valid: true,
      projectName: "Client Alpha",
      markdownCount: 1,
      fileCount: 1,
      tabCount: 1,
      headingCount: 1
    });
    expect(summary.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "project", title: "Client Alpha" }),
        expect.objectContaining({ kind: "tab", title: "Research" }),
        expect.objectContaining({ kind: "heading", title: "Sources" }),
        expect.objectContaining({ kind: "markdown", title: "Brief" }),
        expect.objectContaining({ kind: "file", title: "source.pdf" })
      ])
    );
  });

  it("imports Markdown notes and copied files through existing activity and search flows", async () => {
    const summary = await createService().executeImport({
      workspaceId: "workspace_1",
      rootName: "Client Alpha",
      entries: [
        { relativePath: "Research", kind: "directory" },
        { relativePath: "Research/Sources", kind: "directory" },
        { relativePath: "Research/brief.md", kind: "markdown", content: "# Brief\nBody @alpha" },
        {
          relativePath: "Research/Sources/source.pdf",
          kind: "file",
          copiedFile: {
            attachmentId: "attachment_pdf",
            originalName: "source.pdf",
            storedName: "source.pdf",
            storagePath: "attachments/2026/05/attachment_pdf/source.pdf",
            sizeBytes: 10,
            checksum: "a".repeat(64),
            mimeType: "application/pdf"
          }
        }
      ]
    });

    expect(summary.valid).toBe(true);
    expect(summary.created.map((entry) => entry.targetType)).toEqual(
      expect.arrayContaining(["project", "container_tab", "item", "attachment"])
    );

    const project = new ContainerRepository(connection).listByWorkspace("workspace_1", { type: "project" })[0]!;
    expect(project.name).toBe("Client Alpha");

    const tabs = new ContainerTabRepository(connection).listByContainer(project.id);
    expect(tabs.map((tab) => tab.name)).toEqual(["Main", "Research"]);

    const notes = new NoteRepository(connection).listByContainer(project.id);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.item.title).toBe("Brief");
    expect(notes[0]!.note.content).toContain("@alpha");

    const headings = new ItemRepository(connection).listByContainer(project.id, { type: "heading" });
    expect(headings).toMatchObject([{ title: "Sources" }]);

    const attachment = new AttachmentRepository(connection).getById("attachment_pdf");
    expect(attachment).toMatchObject({
      originalName: "source.pdf"
    });
    expect(new AttachmentRepository(connection).listForItem({
      workspaceId: "workspace_1",
      itemId: attachment!.itemId
    })).toHaveLength(1);
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: notes[0]!.item.id
    })).toMatchObject({
      title: "Brief",
      body: expect.stringContaining("Body")
    });
    expect(new ActivityLogRepository(connection).listForTarget("workspace", "workspace_1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "markdown_folder_import_completed", actorType: "importer" })
      ])
    );
  });

  it("rejects unsafe relative paths before import", () => {
    const summary = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Unsafe",
      entries: [
        { relativePath: "../escape.md", kind: "markdown", content: "Nope" },
        { relativePath: "C:/temp/file.md", kind: "markdown", content: "Nope" }
      ]
    });

    expect(summary.valid).toBe(false);
    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unsafe_path", severity: "error" })
      ])
    );
  });

  it("parses Obsidian frontmatter, tags, wiki-links, embeds, and canvas warnings", async () => {
    const summary = await createService().executeImport({
      workspaceId: "workspace_1",
      rootName: "Vault",
      entries: [
        { relativePath: "Notes", kind: "directory" },
        {
          relativePath: "Notes/target.md",
          kind: "markdown",
          content: "# Target\nLinked note"
        },
        {
          relativePath: "Notes/source.md",
          kind: "markdown",
          content: [
            "---",
            "title: Source Note",
            "tags: [Research, #Client/Alpha]",
            "---",
            "Body with #follow-up, [[Target|the target]], and ![[assets/sketch.png]]."
          ].join("\n")
        },
        {
          relativePath: "Notes/assets/sketch.png",
          kind: "file",
          copiedFile: {
            attachmentId: "attachment_sketch_file",
            originalName: "sketch.png",
            storedName: "sketch.png",
            storagePath: "attachments/2026/05/attachment_sketch_file/sketch.png",
            sizeBytes: 12,
            checksum: "b".repeat(64),
            mimeType: "image/png"
          }
        },
        { relativePath: "Board.canvas", kind: "unsupported", content: "{}" }
      ]
    });

    expect(summary).toMatchObject({
      valid: true,
      frontmatterCount: 1,
      tagCount: 3,
      wikilinkCount: 1,
      attachmentEmbedCount: 1,
      resolvedAttachmentEmbedCount: 1,
      unsupportedCount: 1
    });
    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unsupported_canvas_file",
          severity: "warning",
          relativePath: "Board.canvas"
        })
      ])
    );

    const project = new ContainerRepository(connection).listByWorkspace("workspace_1", { type: "project" })[0]!;
    const notes = new NoteRepository(connection).listByContainer(project.id);
    const sourceNote = notes.find((note) => note.item.title === "Source Note")!;
    const targetNote = notes.find((note) => note.item.title === "Target")!;

    expect(sourceNote.note.content).not.toContain("title: Source Note");
    expect(sourceNote.note.content).toContain("Imported Obsidian tags: @research @client-alpha @follow-up");
    expect(sourceNote.note.content).toContain("[[Target]]");

    expect(
      new TagRepository(connection)
        .listTagsForTarget({
          workspaceId: "workspace_1",
          targetType: "item",
          targetId: sourceNote.item.id
        })
        .map((tag) => tag.slug)
        .sort()
    ).toEqual(["client-alpha", "follow-up", "research"]);

    expect(
      new RelationshipRepository(connection)
        .listByWorkspace("workspace_1")
        .map((relationship) => ({
          sourceId: relationship.sourceId,
          targetId: relationship.targetId,
          label: relationship.label
        }))
    ).toEqual(
      expect.arrayContaining([
        {
          sourceId: sourceNote.item.id,
          targetId: targetNote.item.id,
          label: "Target"
        }
      ])
    );

    expect(
      new AttachmentRepository(connection).listForItem({
        workspaceId: "workspace_1",
        itemId: sourceNote.item.id
      })
    ).toEqual([
      expect.objectContaining({
        originalName: "sketch.png"
      })
    ]);
  });
});

function createService(): MarkdownFolderImportService {
  return new MarkdownFolderImportService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-13T01:02:03.000Z")
  });
}
