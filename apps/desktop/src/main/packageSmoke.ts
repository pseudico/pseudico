import {
  ActivityLogRepository,
  DatabaseBootstrapService,
  createDatabaseConnection
} from "@local-work-os/db";
import { ProjectService, TaskService } from "@local-work-os/features";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { App } from "electron";
import { createBackupIpcHandlers } from "./ipc/backupHandlers";
import { createFileIpcHandlers } from "./ipc/fileHandlers";
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
      .listRecent(workspace.id, 10)
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
    await rm(smokeRoot, { force: true, recursive: true });
  }
}

function createSmokeIdFactory(): (prefix: string) => string {
  let next = 0;

  return (prefix) => `${prefix}_package_smoke_${++next}`;
}
