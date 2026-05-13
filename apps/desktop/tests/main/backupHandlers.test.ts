import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  DatabaseBootstrapService,
  ItemRepository,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath
} from "@local-work-os/db";
import { afterEach, describe, expect, it } from "vitest";
import { createBackupIpcHandlers } from "../../src/main/ipc/backupHandlers";

describe("backup IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("requires an open workspace", async () => {
    const handlers = createBackupIpcHandlers({
      getCurrentWorkspace: () => null
    });

    await expect(
      handlers.handleCreateManualBackup(undefined)
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_ERROR",
        message: "No workspace is open."
      }
    });
  });

  it("creates and lists manual backups for the current workspace", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-backup-ipc-"));
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);
    await new DatabaseBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });
    const connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    try {
      new ContainerRepository(connection).create({
        id: "container_project_1",
        workspaceId: "workspace_1",
        type: "project",
        name: "Launch Plan",
        slug: "launch-plan",
        timestamp: "2026-05-01T00:00:00.000Z"
      });
      const item = new ItemRepository(connection).create({
        id: "item_file_1",
        workspaceId: "workspace_1",
        containerId: "container_project_1",
        type: "file",
        title: "Brief.pdf",
        timestamp: "2026-05-01T00:00:00.000Z"
      });
      new AttachmentRepository(connection).create({
        id: "attachment_1",
        workspaceId: "workspace_1",
        itemId: item.id,
        originalName: "Brief.pdf",
        storedName: "Brief.pdf",
        sizeBytes: 14,
        checksum: "a".repeat(64),
        storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
        timestamp: "2026-05-01T00:00:00.000Z"
      });
    } finally {
      connection.close();
    }

    const handlers = createBackupIpcHandlers(
      {
        getCurrentWorkspace: () => ({
          id: "workspace_1",
          name: "Personal",
          rootPath: tempRoot!,
          openedAt: "2026-05-01T00:00:00.000Z",
          schemaVersion: 1
        })
      },
      () => new Date("2026-05-01T00:00:00.000Z")
    );
    const created = await handlers.handleCreateManualBackup({
      workspaceId: "workspace_1"
    });

    expect(created).toMatchObject({
      ok: true,
      data: {
        workspaceId: "workspace_1",
        relativePath: "backups/2026-05-01T00-00-00-000Z",
        databaseRelativePath:
          "backups/2026-05-01T00-00-00-000Z/local-work-os.sqlite",
        manifestRelativePath:
          "backups/2026-05-01T00-00-00-000Z/attachment-manifest.json",
        kind: "manual",
        attachmentCount: 1,
        totalAttachmentBytes: 14
      }
    });

    if (!created.ok) {
      throw new Error(created.error.message);
    }

    await expect(
      stat(join(tempRoot, created.data.databaseRelativePath))
    ).resolves.toMatchObject({
      size: expect.any(Number)
    });
    await expect(
      handlers.handleListBackups({ workspaceId: "workspace_1" })
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: created.data.id,
          workspaceId: "workspace_1",
          attachmentCount: 1,
          databaseSizeBytes: created.data.databaseSizeBytes
        }
      ]
    });

    const verifyConnection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    try {
      expect(
        new ActivityLogRepository(verifyConnection).listForTarget(
          "backup",
          created.data.id
        )
      ).toMatchObject([{ action: "backup_created" }]);
    } finally {
      verifyConnection.close();
    }
  });

  it("updates automatic backup settings, creates a due backup, and prunes retention", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-auto-backup-ipc-"));
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);
    await new DatabaseBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });
    const handlers = createBackupIpcHandlers(
      {
        getCurrentWorkspace: () => ({
          id: "workspace_1",
          name: "Personal",
          rootPath: tempRoot!,
          openedAt: "2026-05-01T00:00:00.000Z",
          schemaVersion: 1
        })
      },
      () => new Date("2026-05-13T00:00:00.000Z")
    );

    await expect(
      handlers.handleUpdateAutomaticBackupSettings({
        workspaceId: "workspace_1",
        enabled: true,
        intervalHours: 24,
        retention: {
          maxCount: 1,
          maxAgeDays: 30,
          maxSizeBytes: 1024 * 1024
        }
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        settings: {
          enabled: true,
          retention: {
            maxCount: 1
          }
        }
      }
    });

    const first = await handlers.handleRunAutomaticBackupCheck({
      workspaceId: "workspace_1",
      trigger: "manual_check"
    });

    expect(first).toMatchObject({
      ok: true,
      data: {
        due: true,
        createdBackup: {
          kind: "automatic",
          manifest: {
            database: {
              checksum: expect.any(String)
            }
          }
        }
      }
    });

    if (!first.ok || first.data.createdBackup === null) {
      throw new Error("Expected automatic backup.");
    }

    const secondHandlers = createBackupIpcHandlers(
      {
        getCurrentWorkspace: () => ({
          id: "workspace_1",
          name: "Personal",
          rootPath: tempRoot!,
          openedAt: "2026-05-01T00:00:00.000Z",
          schemaVersion: 1
        })
      },
      () => new Date("2026-05-14T00:00:00.000Z")
    );
    const second = await secondHandlers.handleRunAutomaticBackupCheck({
      workspaceId: "workspace_1",
      trigger: "manual_check"
    });

    expect(second).toMatchObject({
      ok: true,
      data: {
        retentionDeletedBackups: [
          {
            relativePath: first.data.createdBackup.relativePath,
            reason: "count"
          }
        ],
        status: {
          lastRetentionDeletedCount: 1
        }
      }
    });
  });

  it("restores a manual backup into a separate workspace folder", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-restore-ipc-"));
    const sourceRoot = join(tempRoot, "source");
    const targetRoot = join(tempRoot, "restored");
    const databasePath = resolveWorkspaceDatabasePath(sourceRoot);
    await new DatabaseBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });
    await mkdir(join(sourceRoot, "attachments", "2026", "05", "attachment_1"), {
      recursive: true
    });
    await writeFile(
      join(sourceRoot, "attachments", "2026", "05", "attachment_1", "Brief.pdf"),
      "brief"
    );
    const connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    try {
      new ContainerRepository(connection).create({
        id: "container_project_1",
        workspaceId: "workspace_1",
        type: "project",
        name: "Launch Plan",
        slug: "launch-plan",
        timestamp: "2026-05-01T00:00:00.000Z"
      });
      const item = new ItemRepository(connection).create({
        id: "item_file_1",
        workspaceId: "workspace_1",
        containerId: "container_project_1",
        type: "file",
        title: "Brief.pdf",
        timestamp: "2026-05-01T00:00:00.000Z"
      });
      new AttachmentRepository(connection).create({
        id: "attachment_1",
        workspaceId: "workspace_1",
        itemId: item.id,
        originalName: "Brief.pdf",
        storedName: "Brief.pdf",
        sizeBytes: 5,
        checksum: "a".repeat(64),
        storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
        timestamp: "2026-05-01T00:00:00.000Z"
      });
    } finally {
      connection.close();
    }

    let openedPath: string | null = null;
    const handlers = createBackupIpcHandlers(
      {
        getCurrentWorkspace: () => ({
          id: "workspace_1",
          name: "Personal",
          rootPath: sourceRoot,
          openedAt: "2026-05-01T00:00:00.000Z",
          schemaVersion: 1
        }),
        openWorkspace: async ({ rootPath }) => {
          openedPath = rootPath;

          return {
            id: "workspace_1",
            name: "Personal",
            rootPath,
            openedAt: "2026-05-01T00:00:00.000Z",
            schemaVersion: 8
          };
        }
      },
      () => new Date("2026-05-01T00:00:00.000Z")
    );
    const created = await handlers.handleCreateManualBackup({
      workspaceId: "workspace_1"
    });

    if (!created.ok) {
      throw new Error(created.error.message);
    }

    const restored = await handlers.handleRestoreBackupToNewWorkspace({
      backupRelativePath: created.data.relativePath,
      targetRootPath: targetRoot
    });

    expect(restored).toMatchObject({
      ok: true,
      data: {
        targetWorkspaceRootPath: targetRoot,
        copiedAttachmentCount: 1,
        missingAttachmentCount: 0
      }
    });
    expect(openedPath).toBe(targetRoot);
    await expect(
      stat(join(targetRoot, "attachments", "2026", "05", "attachment_1", "Brief.pdf"))
    ).resolves.toMatchObject({ size: 5 });

    const restoredConnection = await createDatabaseConnection({
      databasePath: resolveWorkspaceDatabasePath(targetRoot),
      fileMustExist: true
    });

    try {
      expect(
        new ActivityLogRepository(restoredConnection).listForTarget(
          "backup",
          created.data.id
        )
      ).toMatchObject([{ action: "backup_restored" }]);
    } finally {
      restoredConnection.close();
    }
  });
});
