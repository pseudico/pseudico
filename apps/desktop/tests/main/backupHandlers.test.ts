import { mkdtemp, rm, stat } from "node:fs/promises";
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
});
