import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AttachmentRepository,
  ActivityLogRepository,
  ContainerRepository,
  DatabaseBootstrapService,
  NoteRepository,
  SearchIndexRepository,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath
} from "@local-work-os/db";
import { afterEach, describe, expect, it } from "vitest";
import { createImportIpcHandlers } from "../../src/main/ipc/importHandlers";

describe("import IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("validates a selected workspace JSON export without requiring an open workspace", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-import-ipc-"));
    const exportPath = join(tempRoot, "workspace-export.json");
    await writeFile(exportPath, JSON.stringify(createWorkspaceExport()), "utf8");

    const handlers = createImportIpcHandlers();
    const result = await handlers.handleValidateWorkspaceExportJson({
      filePath: exportPath
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        valid: true,
        workspace: {
          id: "workspace_1"
        },
        targetPolicy: {
          mode: "new_workspace_only",
          canApplyToActiveWorkspace: false
        }
      }
    });
  });

  it("uses the chooser platform and reports cancellation as null", async () => {
    const handlers = createImportIpcHandlers({
      chooseExportJsonPath: async () => null
    });

    await expect(
      handlers.handleChooseAndValidateWorkspaceExportJson()
    ).resolves.toEqual({
      ok: true,
      data: null
    });
  });


  it("previews and imports a Markdown folder fixture into the open workspace", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-markdown-import-ipc-"));
    const workspaceRoot = join(tempRoot, "workspace");
    const sourceRoot = join(tempRoot, "source-notes");
    await mkdir(join(sourceRoot, "Research"), { recursive: true });
    await writeFile(join(sourceRoot, "Research", "brief.md"), "# Brief\nLocal note body", "utf8");
    await writeFile(join(sourceRoot, "Research", "source.pdf"), "pdf", "utf8");

    const databasePath = resolveWorkspaceDatabasePath(workspaceRoot);
    await new DatabaseBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });
    const workspaceService = {
      getCurrentWorkspace: () => ({
        id: "workspace_1",
        name: "Personal",
        rootPath: workspaceRoot,
        databasePath,
        schemaVersion: 1,
        openedAt: "2026-05-13T00:00:00.000Z"
      })
    };
    const handlers = createImportIpcHandlers(workspaceService);

    const preview = await handlers.handlePreviewMarkdownFolderImport({
      workspaceId: "workspace_1",
      folderPath: sourceRoot
    });

    expect(preview).toMatchObject({
      ok: true,
      data: {
        valid: true,
        markdownCount: 1,
        fileCount: 1,
        tabCount: 1
      }
    });

    const imported = await handlers.handleImportMarkdownFolder({
      workspaceId: "workspace_1",
      folderPath: sourceRoot
    });

    expect(imported).toMatchObject({
      ok: true,
      data: {
        valid: true,
        fileCount: 1,
        markdownCount: 1
      }
    });

    const connection = await createDatabaseConnection({ databasePath, fileMustExist: true });
    try {
      const project = new ContainerRepository(connection).listByWorkspace("workspace_1", { type: "project" })[0]!;
      expect(project.name).toBe("source-notes");
      expect(new NoteRepository(connection).listByContainer(project.id)).toMatchObject([
        { item: { title: "Brief" }, note: { content: expect.stringContaining("Local note body") } }
      ]);
      expect(new AttachmentRepository(connection).getById(
        imported.ok ? imported.data.created.find((entry) => entry.targetType === "attachment")!.id : ""
      )).toMatchObject({ originalName: "source.pdf" });
    } finally {
      connection.close();
    }
  });

  it("previews and imports selected Markdown files as notes through main-process IPC", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-markdown-note-import-ipc-"));
    const workspaceRoot = join(tempRoot, "workspace");
    const sourceRoot = join(tempRoot, "selected-notes");
    await mkdir(sourceRoot, { recursive: true });
    const markdownPath = join(sourceRoot, "brief.md");
    await writeFile(markdownPath, "---\ntitle: Selected Brief\ntags: [imported]\n---\n# Fallback\nLocal file body", "utf8");

    const databasePath = resolveWorkspaceDatabasePath(workspaceRoot);
    await new DatabaseBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });
    const workspaceService = {
      getCurrentWorkspace: () => ({
        id: "workspace_1",
        name: "Personal",
        rootPath: workspaceRoot,
        databasePath,
        schemaVersion: 1,
        openedAt: "2026-05-13T00:00:00.000Z"
      })
    };
    const handlers = createImportIpcHandlers(workspaceService);
    const connection = await createDatabaseConnection({ databasePath, fileMustExist: true });
    const inbox = new ContainerRepository(connection).listByWorkspace("workspace_1", { type: "inbox" })[0]!;
    connection.close();

    const preview = await handlers.handlePreviewMarkdownNoteImport({
      workspaceId: "workspace_1",
      containerId: inbox.id,
      filePaths: [markdownPath]
    });

    expect(preview).toMatchObject({
      ok: true,
      data: {
        valid: true,
        creatableCount: 1,
        rows: [expect.objectContaining({ title: "Selected Brief" })]
      }
    });

    const imported = await handlers.handleImportMarkdownNotes({
      workspaceId: "workspace_1",
      containerId: inbox.id,
      filePaths: [markdownPath]
    });

    expect(imported).toMatchObject({
      ok: true,
      data: {
        valid: true,
        importedCount: 1,
        created: [expect.objectContaining({ title: "Selected Brief" })]
      }
    });

    const verification = await createDatabaseConnection({ databasePath, fileMustExist: true });
    try {
      const itemId = imported.ok ? imported.data.created[0]!.id : "";
      expect(new NoteRepository(verification).getByItemId(itemId)).toMatchObject({
        item: { title: "Selected Brief", containerId: inbox.id },
        note: { content: expect.stringContaining("Local file body") }
      });
      expect(new SearchIndexRepository(verification).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: itemId
      })).toMatchObject({ title: "Selected Brief" });
      expect(new ActivityLogRepository(verification).listForTarget("workspace", "workspace_1")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: "markdown_note_import_completed", actorType: "importer" })
        ])
      );
    } finally {
      verification.close();
    }
  });

  it("imports a selected EML file through the file-only email chooser", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-email-import-ipc-"));
    const workspaceRoot = join(tempRoot, "workspace");
    const sourceRoot = join(tempRoot, "email-source");
    await mkdir(sourceRoot, { recursive: true });
    const emailPath = join(sourceRoot, "operator-follow-up.eml");
    await writeFile(
      emailPath,
      `From: Alice <alice@example.test>
To: Operator <operator@example.test>
Subject: Native picker follow-up @pilot
Date: Mon, 18 May 2026 08:30:00 +1000
Message-ID: <native-picker@example.test>
Content-Type: text/plain; charset=utf-8

Confirm the Windows picker can select this local EML file.`,
      "utf8"
    );

    const databasePath = resolveWorkspaceDatabasePath(workspaceRoot);
    await new DatabaseBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });
    const workspaceService = {
      getCurrentWorkspace: () => ({
        id: "workspace_1",
        name: "Personal",
        rootPath: workspaceRoot,
        databasePath,
        schemaVersion: 1,
        openedAt: "2026-05-18T00:00:00.000Z"
      })
    };
    const selectedKinds: string[] = [];
    const handlers = createImportIpcHandlers(workspaceService, {
      chooseExportJsonPath: async () => null,
      chooseEmailImportPath: async (sourceKind) => {
        selectedKinds.push(sourceKind);
        return emailPath;
      }
    });

    const imported = await handlers.handleChooseAndImportEmailsAsTasks({
      workspaceId: "workspace_1",
      sourceKind: "file",
      extractTags: true
    });

    expect(selectedKinds).toEqual(["file"]);
    expect(imported).toMatchObject({
      ok: true,
      data: {
        importedCount: 1,
        skippedCount: 0,
        issues: [],
        importedTasks: [
          expect.objectContaining({
            title: "Email: Native picker follow-up @pilot",
            attachmentId: expect.any(String)
          })
        ]
      }
    });

    const verification = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });
    try {
      const task = imported.ok ? imported.data!.importedTasks[0]! : null;
      expect(new SearchIndexRepository(verification).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: task?.itemId ?? ""
      })).toMatchObject({
        title: "Email: Native picker follow-up @pilot",
        body: expect.stringContaining("Windows picker")
      });
      expect(new AttachmentRepository(verification).getById(
        task?.attachmentId ?? ""
      )).toMatchObject({
        originalName: "operator-follow-up.eml",
        mimeType: "message/rfc822"
      });
      expect(new ActivityLogRepository(verification).listForTarget(
        "item",
        task?.itemId ?? ""
      )).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: "task_created", actorType: "importer" })
        ])
      );
      expect(new ActivityLogRepository(verification).listForTarget(
        "attachment",
        task?.attachmentId ?? ""
      )).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: "file_attached", actorType: "importer" })
        ])
      );
    } finally {
      verification.close();
    }
  });

  it("routes email folder imports through the directory chooser and treats cancel as no-op", async () => {
    const chosenKinds: string[] = [];
    const handlers = createImportIpcHandlers({
      chooseExportJsonPath: async () => null,
      chooseEmailImportPath: async (sourceKind) => {
        chosenKinds.push(sourceKind);
        return null;
      }
    });

    await expect(
      handlers.handleChooseAndImportEmailsAsTasks({ sourceKind: "directory" })
    ).resolves.toEqual({
      ok: true,
      data: null
    });
    expect(chosenKinds).toEqual(["directory"]);

    await expect(
      handlers.handleChooseAndImportEmailsAsTasks({ sourceKind: "mixed" })
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "INVALID_INPUT"
      }
    });
  });

  it("rejects non-JSON file paths before reading", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-import-ipc-"));
    const exportPath = join(tempRoot, "workspace-export.txt");
    await writeFile(exportPath, "{}", "utf8");

    const handlers = createImportIpcHandlers();

    await expect(
      handlers.handleValidateWorkspaceExportJson({ filePath: exportPath })
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Import validation requires a JSON file."
      }
    });
  });

  it("returns validation errors for invalid JSON", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-import-ipc-"));
    const exportPath = join(tempRoot, "workspace-export.json");
    await writeFile(exportPath, "{", "utf8");

    const handlers = createImportIpcHandlers();

    await expect(
      handlers.handleValidateWorkspaceExportJson({ filePath: exportPath })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        valid: false,
        issues: [
          {
            code: "invalid_json"
          }
        ]
      }
    });
  });
});

function createWorkspaceExport(): unknown {
  const timestamp = "2026-05-06T00:00:00.000Z";

  return {
    schemaVersion: 1,
    exportedAt: timestamp,
    workspace: {
      id: "workspace_1",
      name: "Personal",
      schemaVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    data: {
      containers: [
        {
          id: "container_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Project",
          slug: "project",
          description: null,
          status: "active",
          categoryId: null,
          color: null,
          isFavorite: false,
          isSystem: false,
          sortOrder: 10,
          createdAt: timestamp,
          updatedAt: timestamp,
          archivedAt: null,
          deletedAt: null
        }
      ],
      containerTabs: [],
      items: [],
      taskDetails: [],
      noteDetails: [],
      listDetails: [],
      listItems: [],
      linkDetails: [],
      tags: [],
      taggings: [],
      categories: [],
      relationships: [],
      savedViews: [],
      dashboards: [],
      dashboardWidgets: [],
      dailyPlans: [],
      dailyPlanItems: []
    },
    attachmentManifest: {
      attachments: [],
      attachmentCount: 0,
      totalAttachmentBytes: 0
    }
  };
}

