import {
  ActivityLogRepository,
  DatabaseBootstrapService,
  createDatabaseConnection
} from "@local-work-os/db";
import {
  IntegrityCheckService,
  ProjectService,
  SearchService,
  TaskService
} from "@local-work-os/features";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { App } from "electron";
import { createBackupIpcHandlers } from "./ipc/backupHandlers";
import { createCalendarIpcHandlers } from "./ipc/calendarHandlers";
import { createFileIpcHandlers } from "./ipc/fileHandlers";
import { createImportIpcHandlers } from "./ipc/importHandlers";
import {
  assertRuntimeDataPathOutsideAppBundle,
  resolveUserDataPath,
  resolveWorkspacePath
} from "./services/mainProcessPaths";
import { resolveInsideWorkspace } from "./services/safeFileSystem";
import { RecentWorkspacesService } from "./services/workspace/RecentWorkspacesService";
import { WorkspaceFileSystemService } from "./services/workspace/WorkspaceFileSystemService";

export async function runPackageSmoke(app: App): Promise<void> {
  const smokeRoot = await mkdtemp(join(tmpdir(), "local-work-os-package-smoke-"));
  const workspaceRootPath = join(smokeRoot, "Smoke Workspace");
  const recentWorkspacesPath = assertRuntimeDataPathOutsideAppBundle(
    app,
    resolveUserDataPath(app, "package-smoke", "recent-workspaces.json")
  );

  try {
    await mkdir(workspaceRootPath, { recursive: true });

    const workspaceService = new WorkspaceFileSystemService({
      databaseBootstrapService: new DatabaseBootstrapService(),
      recentWorkspacesService: new RecentWorkspacesService(recentWorkspacesPath),
      now: () => new Date("2026-05-07T00:00:00.000Z")
    });

    const workspace = await workspaceService.createWorkspace({
      name: "Smoke Workspace",
      rootPath: workspaceRootPath
    });
    const databasePath = resolveWorkspacePath(workspace.rootPath, "databasePath");
    const attachmentsPath = resolveWorkspacePath(
      workspace.rootPath,
      "attachmentsPath"
    );
    const appBundlePath = app.getAppPath();

    assertRuntimeDataPathOutsideAppBundle(app, databasePath);
    assertRuntimeDataPathOutsideAppBundle(app, attachmentsPath);

    let connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    const ids = createSmokeIdFactory();
    const projectService = new ProjectService({
      connection,
      idFactory: ids,
      now: () => new Date("2026-05-07T00:01:00.000Z")
    });
    const taskService = new TaskService({
      connection,
      idFactory: ids,
      now: () => new Date("2026-05-07T00:02:00.000Z")
    });
    const project = await projectService.createProject({
      workspaceId: workspace.id,
      name: "Packaged Smoke",
      description: "Verifies packaged workspace persistence."
    });
    const task = await taskService.createTask({
      workspaceId: workspace.id,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      title: "Persist packaged data"
    });

    connection.close();

    const sourceDirectoryPath = join(smokeRoot, "source-files");
    const sourceFilePath = join(sourceDirectoryPath, "packaged-smoke-note.txt");
    await mkdir(sourceDirectoryPath, { recursive: true });
    await writeFile(sourceFilePath, "Packaged smoke attachment\n", "utf8");

    let openedAttachmentPath: string | null = null;
    let revealedAttachmentPath: string | null = null;
    const fileHandlers = createFileIpcHandlers(workspaceService, {
      chooseSourcePath: async () => sourceFilePath,
      openPath: async (path) => {
        openedAttachmentPath = path;
        return "";
      },
      revealPath: (path) => {
        revealedAttachmentPath = path;
      }
    });
    const attachedFile = await fileHandlers.handleAttachFileToContainer({
      workspaceId: workspace.id,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      sourcePath: sourceFilePath,
      description: "Package smoke attachment",
      actorType: "system"
    });

    if (!attachedFile.ok) {
      throw new Error(
        `Packaged smoke failed to attach local file: ${attachedFile.error.message}`
      );
    }

    const attachmentPath = resolveInsideWorkspace(
      workspace.rootPath,
      attachedFile.data.attachment.storagePath
    );
    assertRuntimeDataPathOutsideAppBundle(app, attachmentPath);
    await stat(attachmentPath);

    const openedFile = await fileHandlers.handleOpenAttachment(
      attachedFile.data.attachment.id
    );
    if (!openedFile.ok) {
      throw new Error(
        `Packaged smoke failed to open local file: ${openedFile.error.message}`
      );
    }

    const revealedFile = await fileHandlers.handleRevealAttachment(
      attachedFile.data.attachment.id
    );
    if (!revealedFile.ok) {
      throw new Error(
        `Packaged smoke failed to reveal local file: ${revealedFile.error.message}`
      );
    }

    if (
      openedAttachmentPath !== attachmentPath ||
      revealedAttachmentPath !== attachmentPath
    ) {
      throw new Error("Packaged smoke external file path resolution failed.");
    }

    const importerEvidence = await runPackagedImporterSmoke({
      workspaceId: workspace.id,
      workspaceRootPath: workspace.rootPath,
      smokeRoot,
      projectId: project.project.id,
      projectTabId: project.defaultTab.id,
      workspaceService
    });

    const backupHandlers = createBackupIpcHandlers(
      workspaceService,
      () => new Date("2026-05-07T00:03:00.000Z")
    );
    const backup = await backupHandlers.handleCreateManualBackup({
      workspaceId: workspace.id
    });

    if (!backup.ok) {
      throw new Error(
        `Packaged smoke failed to create backup: ${backup.error.message}`
      );
    }

    const backupDatabasePath = resolveInsideWorkspace(
      workspace.rootPath,
      backup.data.databaseRelativePath
    );
    assertRuntimeDataPathOutsideAppBundle(app, backupDatabasePath);
    await stat(backupDatabasePath);

    connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    const activityActions = new ActivityLogRepository(connection)
      .listRecent(workspace.id, 100)
      .map((activity) => activity.action);

    if (!activityActions.includes("container_created")) {
      throw new Error("Packaged smoke did not persist project activity.");
    }

    if (!activityActions.includes("task_created")) {
      throw new Error("Packaged smoke did not persist task activity.");
    }

    if (!activityActions.includes("file_attached")) {
      throw new Error("Packaged smoke did not persist file attachment activity.");
    }

    if (!activityActions.includes("backup_created")) {
      throw new Error("Packaged smoke did not persist backup activity.");
    }

    connection.close();

    const result = {
      ok: true,
      appBundlePath,
      workspaceRootPath: workspace.rootPath,
      databasePath,
      attachmentsPath,
      projectId: project.project.id,
      taskId: task.item.id,
      attachmentId: attachedFile.data.attachment.id,
      attachmentPath,
      openedAttachmentPath,
      revealedAttachmentPath,
      importerEvidence,
      backupRelativePath: backup.data.relativePath,
      backupDatabasePath
    };

    if (process.env.LOCAL_WORK_OS_PACKAGE_SMOKE_RESULT !== undefined) {
      await writeFile(
        process.env.LOCAL_WORK_OS_PACKAGE_SMOKE_RESULT,
        `${JSON.stringify(result, null, 2)}\n`,
        "utf8"
      );
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } finally {
    await removePackageSmokeRoot(smokeRoot);
  }
}

async function runPackagedImporterSmoke(input: {
  workspaceId: string;
  workspaceRootPath: string;
  smokeRoot: string;
  projectId: string;
  projectTabId: string;
  workspaceService: WorkspaceFileSystemService;
}): Promise<{
  csvTsv: {
    previewRows: number;
    importedCount: number;
    duplicateSkippedCount: number;
    searchHitCount: number;
  };
  markdownFolder: {
    previewRows: number;
    importedCount: number;
    attachmentCount: number;
    searchHitCount: number;
  };
  markdownNote: {
    previewRows: number;
    importedCount: number;
    searchHitCount: number;
  };
  email: {
    previewCount: number;
    importedCount: number;
    attachmentCount: number;
    searchHitCount: number;
  };
  ics: {
    importedEventCount: number;
    skippedEventCount: number;
  };
  invalidInput: {
    csvWrongExtensionRejected: boolean;
    markdownFolderWrongPathRejected: boolean;
  };
  activityActions: string[];
  integrityStatus: string;
  integrityIssueCount: number;
}> {
  const importFixtureRoot = join(input.smokeRoot, "import-fixtures");
  await mkdir(importFixtureRoot, { recursive: true });

  const csvPath = join(importFixtureRoot, "tasks.csv");
  await writeFile(
    csvPath,
    [
      "title,body",
      "Imported CSV task csvimportqa,CSV body csvimportqa"
    ].join("\n"),
    "utf8"
  );
  const csvProjectPath = join(importFixtureRoot, "projects.csv");
  await writeFile(
    csvProjectPath,
    [
      "name,description",
      "CSV duplicate project token-conflict,Project duplicate conflict fixture"
    ].join("\n"),
    "utf8"
  );

  const markdownFolderPath = join(importFixtureRoot, "markdown-vault");
  await mkdir(join(markdownFolderPath, "assets"), { recursive: true });
  await writeFile(
    join(markdownFolderPath, "Project Note.md"),
    [
      "---",
      "title: Markdown folder note token-folder",
      "tags:",
      "  - folderimport",
      "---",
      "# Markdown folder note token-folder",
      "",
      "Local attachment embed ![[assets/folder-asset.txt]]"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    join(markdownFolderPath, "assets", "folder-asset.txt"),
    "folder asset token-folder\n",
    "utf8"
  );
  await writeFile(
    join(markdownFolderPath, "unsupported.canvas"),
    "{\"nodes\":[]}\n",
    "utf8"
  );

  const standaloneNotePath = join(importFixtureRoot, "standalone-note.md");
  await writeFile(
    standaloneNotePath,
    "# Standalone note token-standalone\n\nImported through the Markdown note IPC path.",
    "utf8"
  );

  const emailPath = join(importFixtureRoot, "message.eml");
  await writeFile(
    emailPath,
    [
      "From: Pilot Sender <sender@example.test>",
      "To: Operator <operator@example.test>",
      "Subject: Email import token-email",
      "Date: Thu, 7 May 2026 00:00:00 +0000",
      "Message-ID: <token-email@example.test>",
      "",
      "Please triage this imported email. #emailimport"
    ].join("\n"),
    "utf8"
  );

  const icsPath = join(importFixtureRoot, "calendar.ics");
  await writeFile(
    icsPath,
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Local Work OS//Package Smoke//EN",
      "BEGIN:VEVENT",
      "UID:token-ics@example.test",
      "DTSTAMP:20260507T000000Z",
      "DTSTART:20260508T090000Z",
      "DTEND:20260508T100000Z",
      "SUMMARY:ICS import token-ics",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n"),
    "utf8"
  );

  const wrongExtensionPath = join(importFixtureRoot, "not-csv.txt");
  await writeFile(wrongExtensionPath, "not,csv\n", "utf8");

  const importHandlers = createImportIpcHandlers(input.workspaceService, {
    chooseExportJsonPath: async () => null,
    chooseEmailImportPath: async () => emailPath,
    chooseMarkdownFolderPath: async () => markdownFolderPath
  });

  const csvPreview = await importHandlers.handlePreviewDelimitedFileImport({
    workspaceId: input.workspaceId,
    filePath: csvPath,
    targetType: "task",
    conflictStrategy: "skip_existing"
  });
  assertApiOk(csvPreview, "CSV/TSV preview");
  if (csvPreview.data.rows.length === 0) {
    throw new Error("CSV/TSV packaged smoke preview returned no rows.");
  }

  const csvImport = await importHandlers.handleImportDelimitedFile({
    workspaceId: input.workspaceId,
    filePath: csvPath,
    targetType: "task",
    conflictStrategy: "skip_existing"
  });
  assertApiOk(csvImport, "CSV/TSV import");
  if (csvImport.data.importedCount < 1) {
    throw new Error(
      `CSV/TSV packaged smoke imported ${csvImport.data.importedCount} rows; ` +
        `${csvImport.data.issues.length} issue(s) were reported.`
    );
  }

  const csvProjectImport = await importHandlers.handleImportDelimitedFile({
    workspaceId: input.workspaceId,
    filePath: csvProjectPath,
    targetType: "project",
    conflictStrategy: "skip_existing"
  });
  assertApiOk(csvProjectImport, "CSV/TSV project import");

  const csvDuplicate = await importHandlers.handleImportDelimitedFile({
    workspaceId: input.workspaceId,
    filePath: csvProjectPath,
    targetType: "project",
    conflictStrategy: "skip_existing"
  });
  assertApiOk(csvDuplicate, "CSV/TSV duplicate import");

  if (csvDuplicate.data.skippedCount < 1) {
    throw new Error("CSV/TSV packaged smoke did not skip an existing duplicate.");
  }

  const markdownFolderPreview =
    await importHandlers.handlePreviewMarkdownFolderImport({
      workspaceId: input.workspaceId,
      folderPath: markdownFolderPath,
      projectName: "Markdown folder package smoke"
    });
  assertApiOk(markdownFolderPreview, "Markdown folder preview");
  if (markdownFolderPreview.data.rows.length === 0) {
    throw new Error("Markdown folder packaged smoke preview returned no rows.");
  }

  const markdownFolderImport = await importHandlers.handleImportMarkdownFolder({
    workspaceId: input.workspaceId,
    folderPath: markdownFolderPath,
    projectName: "Markdown folder package smoke"
  });
  assertApiOk(markdownFolderImport, "Markdown folder import");
  if (markdownFolderImport.data.importedCount < 1) {
    throw new Error("Markdown folder packaged smoke imported no records.");
  }
  const markdownFolderAttachmentCount =
    markdownFolderImport.data.created.filter(
      (target) => target.targetType === "attachment"
    ).length;
  if (markdownFolderAttachmentCount < 1) {
    throw new Error("Markdown folder packaged smoke copied no attachments.");
  }

  const markdownNotePreview =
    await importHandlers.handlePreviewMarkdownNoteImport({
      workspaceId: input.workspaceId,
      containerId: input.projectId,
      containerTabId: input.projectTabId,
      filePaths: [standaloneNotePath]
    });
  assertApiOk(markdownNotePreview, "Markdown note preview");
  if (markdownNotePreview.data.rows.length === 0) {
    throw new Error("Markdown note packaged smoke preview returned no rows.");
  }

  const markdownNoteImport = await importHandlers.handleImportMarkdownNotes({
    workspaceId: input.workspaceId,
    containerId: input.projectId,
    containerTabId: input.projectTabId,
    filePaths: [standaloneNotePath]
  });
  assertApiOk(markdownNoteImport, "Markdown note import");
  if (markdownNoteImport.data.importedCount < 1) {
    throw new Error("Markdown note packaged smoke imported no notes.");
  }

  const emailPreview = await importHandlers.handlePreviewEmails({
    workspaceId: input.workspaceId,
    sourcePath: emailPath,
    containerId: input.projectId
  });
  assertApiOk(emailPreview, "Email preview");
  if (emailPreview.data.length === 0) {
    throw new Error("Email packaged smoke preview returned no messages.");
  }

  const emailImport = await importHandlers.handleImportEmailsAsTasks({
    workspaceId: input.workspaceId,
    sourcePath: emailPath,
    containerId: input.projectId,
    extractTags: true
  });
  assertApiOk(emailImport, "Email import");
  if (emailImport.data.importedCount < 1) {
    throw new Error("Email packaged smoke imported no messages.");
  }
  const emailAttachmentCount = emailImport.data.importedTasks.filter(
    (task) => task.attachmentId !== null
  ).length;
  if (emailAttachmentCount < 1) {
    throw new Error("Email packaged smoke copied no original-message attachment.");
  }

  const calendarImport = await createCalendarIpcHandlers(
    input.workspaceService
  ).handleImportIcsFile({
    workspaceId: input.workspaceId,
    filePath: icsPath,
    sourceName: "Package smoke ICS"
  });
  assertApiOk(calendarImport, "ICS import");
  if (calendarImport.data.importedEventCount < 1) {
    throw new Error("ICS packaged smoke imported no events.");
  }

  const wrongExtension = await importHandlers.handlePreviewDelimitedFileImport({
    workspaceId: input.workspaceId,
    filePath: wrongExtensionPath,
    targetType: "task"
  });
  const missingFolder = await importHandlers.handlePreviewMarkdownFolderImport({
    workspaceId: input.workspaceId,
    folderPath: join(importFixtureRoot, "missing-folder")
  });
  if (wrongExtension.ok) {
    throw new Error("CSV/TSV packaged smoke accepted a wrong file extension.");
  }
  if (missingFolder.ok) {
    throw new Error("Markdown folder packaged smoke accepted a missing folder.");
  }

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspacePath(input.workspaceRootPath, "databasePath"),
    fileMustExist: true
  });

  try {
    const searchService = new SearchService({ connection });
    const csvHits = searchService.search({
      workspaceId: input.workspaceId,
      query: "csvimportqa"
    });
    const markdownFolderHits = searchService.search({
      workspaceId: input.workspaceId,
      query: "token-folder"
    });
    const markdownNoteHits = searchService.search({
      workspaceId: input.workspaceId,
      query: "token-standalone"
    });
    const emailHits = searchService.search({
      workspaceId: input.workspaceId,
      query: "token-email"
    });
    if (csvHits.length === 0 || markdownFolderHits.length === 0 ||
      markdownNoteHits.length === 0 || emailHits.length === 0) {
      throw new Error(
        `Packaged importer smoke did not update searchable content. ` +
          `csv=${csvHits.length}, markdownFolder=${markdownFolderHits.length}, ` +
          `markdownNote=${markdownNoteHits.length}, email=${emailHits.length}.`
      );
    }

    const activityActions = new ActivityLogRepository(connection)
      .listRecent(input.workspaceId, 50)
      .map((activity) => activity.action);
    const requiredActivityActions = [
      "csv_import_completed",
      "markdown_folder_import_completed",
      "markdown_note_import_completed",
      "calendar_feed_imported",
      "task_created",
      "file_attached"
    ];
    for (const action of requiredActivityActions) {
      if (!activityActions.includes(action)) {
        throw new Error(
          `Packaged importer smoke did not persist ${action} activity.`
        );
      }
    }

    const report = await new IntegrityCheckService({
      connection,
      fileSystem: {
        workspacePathExists: async (workspaceRelativePath) => {
          try {
            await stat(resolveInsideWorkspace(
              input.workspaceRootPath,
              workspaceRelativePath
            ));
            return true;
          } catch {
            return false;
          }
        }
      }
    }).runWorkspaceIntegrityCheck(input.workspaceId);

    if (report.status !== "healthy") {
      throw new Error(
        `Packaged importer smoke left workspace integrity ${report.status}.`
      );
    }

    return {
      csvTsv: {
        previewRows: csvPreview.data.rows.length,
        importedCount: csvImport.data.importedCount,
        duplicateSkippedCount: csvDuplicate.data.skippedCount,
        searchHitCount: csvHits.length
      },
      markdownFolder: {
        previewRows: markdownFolderPreview.data.rows.length,
        importedCount: markdownFolderImport.data.importedCount,
        attachmentCount: markdownFolderAttachmentCount,
        searchHitCount: markdownFolderHits.length
      },
      markdownNote: {
        previewRows: markdownNotePreview.data.rows.length,
        importedCount: markdownNoteImport.data.importedCount,
        searchHitCount: markdownNoteHits.length
      },
      email: {
        previewCount: emailPreview.data.length,
        importedCount: emailImport.data.importedCount,
        attachmentCount: emailAttachmentCount,
        searchHitCount: emailHits.length
      },
      ics: {
        importedEventCount: calendarImport.data.importedEventCount,
        skippedEventCount: calendarImport.data.skippedEventCount
      },
      invalidInput: {
        csvWrongExtensionRejected: !wrongExtension.ok,
        markdownFolderWrongPathRejected: !missingFolder.ok
      },
      activityActions,
      integrityStatus: report.status,
      integrityIssueCount: report.issueCount
    };
  } finally {
    connection.close();
  }
}

function assertApiOk<T>(
  result: { ok: true; data: T } | { ok: false; error: { message: string } },
  label: string
): asserts result is { ok: true; data: T } {
  if (!result.ok) {
    throw new Error(`${label} failed: ${result.error.message}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removePackageSmokeRoot(path: string): Promise<void> {
  const retryDelays = [250, 500, 1_000, 2_000];
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      await rm(path, { force: true, recursive: true });
      return;
    } catch (error) {
      if (!isBusyFileSystemError(error)) {
        throw error;
      }
      if (attempt === retryDelays.length) {
        console.warn(
          `Package smoke workspace cleanup skipped because files are still busy: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return;
      }
      await delay(retryDelays[attempt]!);
    }
  }
}

function isBusyFileSystemError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EBUSY"
  );
}

function createSmokeIdFactory(): (prefix: string) => string {
  let next = 0;

  return (prefix) => `${prefix}_package_smoke_${++next}`;
}
