import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BackupService, type BackupManifest } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;
const manifests = new Map<string, BackupManifest>();
const copiedDatabases: { source: string; destination: string }[] = [];

describe("BackupService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: "2026-05-01T00:00:00.000Z"
    });
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
      mimeType: "application/pdf",
      sizeBytes: 42,
      checksum: "a".repeat(64),
      storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
      description: "Launch brief",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
    manifests.clear();
    copiedDatabases.splice(0);
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("creates a manifest, copies the database, and logs backup_created", async () => {
    const result = await createService().createManualBackup({
      workspaceId: "workspace_1",
      workspaceName: "Personal Work",
      databaseRelativePath: "data/local-work-os.sqlite",
      backupRelativePath: "backups/2026-05-01T00-00-00-000Z",
      backupDatabaseRelativePath:
        "backups/2026-05-01T00-00-00-000Z/local-work-os.sqlite",
      manifestRelativePath:
        "backups/2026-05-01T00-00-00-000Z/attachment-manifest.json"
    });

    expect(result).toMatchObject({
      id: "backup_1",
      workspaceId: "workspace_1",
      attachmentCount: 1,
      totalAttachmentBytes: 42,
      databaseSizeBytes: 2048,
      kind: "manual"
    });
    expect(copiedDatabases).toEqual([
      {
        source: "data/local-work-os.sqlite",
        destination: "backups/2026-05-01T00-00-00-000Z/local-work-os.sqlite"
      }
    ]);
    expect(
      manifests.get("backups/2026-05-01T00-00-00-000Z/attachment-manifest.json")
    ).toMatchObject({
      id: "backup_1",
      kind: "manual",
      workspaceId: "workspace_1",
      database: {
        checksum: "b".repeat(64)
      },
      attachmentCount: 1,
      attachments: [
        {
          id: "attachment_1",
          storagePath: "attachments/2026/05/attachment_1/Brief.pdf"
        }
      ]
    });
    expect(
      new ActivityLogRepository(connection).listForTarget("backup", "backup_1")
    ).toMatchObject([
      {
        action: "backup_created",
        summary:
          "Created manual backup backups/2026-05-01T00-00-00-000Z."
      }
    ]);
  });

  it("lists only backups for the requested workspace in newest-first order", () => {
    expect(
      createService().listBackups({
        workspaceId: "workspace_1",
        backups: [
          {
            id: "backup_old",
            workspaceId: "workspace_1",
            createdAt: "2026-05-01T00:00:00.000Z",
            relativePath: "backups/old",
            databaseRelativePath: "backups/old/local-work-os.sqlite",
            manifestRelativePath: "backups/old/attachment-manifest.json",
            attachmentCount: 0,
            totalAttachmentBytes: 0,
            databaseSizeBytes: 10,
            kind: "manual"
          },
          {
            id: "backup_other",
            workspaceId: "workspace_2",
            createdAt: "2026-05-03T00:00:00.000Z",
            relativePath: "backups/other",
            databaseRelativePath: "backups/other/local-work-os.sqlite",
            manifestRelativePath: "backups/other/attachment-manifest.json",
            attachmentCount: 0,
            totalAttachmentBytes: 0,
            databaseSizeBytes: 10,
            kind: "manual"
          },
          {
            id: "backup_new",
            workspaceId: "workspace_1",
            createdAt: "2026-05-02T00:00:00.000Z",
            relativePath: "backups/new",
            databaseRelativePath: "backups/new/local-work-os.sqlite",
            manifestRelativePath: "backups/new/attachment-manifest.json",
            attachmentCount: 1,
            totalAttachmentBytes: 42,
            databaseSizeBytes: 20,
            kind: "automatic"
          }
        ]
      })
    ).toMatchObject([{ id: "backup_new" }, { id: "backup_old" }]);
  });
});

function createService(): BackupService {
  return new BackupService({
    connection,
    idFactory: createId,
    now: () => new Date("2026-05-01T00:00:00.000Z"),
    fileSystem: {
      async copyDatabase(input) {
        copiedDatabases.push({
          source: input.sourceRelativePath,
          destination: input.destinationRelativePath
        });

        return { sizeBytes: 2048, checksum: "b".repeat(64) };
      },
      async writeManifest(input) {
        manifests.set(input.manifestRelativePath, input.manifest);
      }
    }
  });
}

function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
