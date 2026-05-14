import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  SearchIndexRepository,
  SearchIndexService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MaintenanceService } from "../src";

const TEST_TIMESTAMP = "2026-05-14T01:02:03.000Z";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;
let vacuumRuns = 0;
let backupRuns = 0;
const auditReports = new Map<string, unknown>();
const movedFiles: Array<{ source: string; destination: string }> = [];

describe("MaintenanceService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    new MigrationService({ connection }).runPendingMigrations();
    seedWorkspace();
    idCounter = 0;
    vacuumRuns = 0;
    backupRuns = 0;
    auditReports.clear();
    movedFiles.splice(0);
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("runs backup, integrity, reindex, vacuum, and orphan scan with job logs", async () => {
    seedAttachment();
    new SearchIndexRepository(connection).remove({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_file_1"
    });
    idCounter = 0;

    const job = await createService({
      files: [
        "attachments/2026/05/attachment_1/Brief.pdf",
        "attachments/orphan.bin"
      ]
    }).runMaintenanceJob({
      workspaceId: "workspace_1",
      requireBackup: true,
      operations: [
        "sqlite_integrity_check",
        "attachment_manifest_audit",
        "orphan_attachment_scan",
        "rebuild_search_index",
        "vacuum"
      ]
    });

    expect(job).toMatchObject({
      id: "maintenance_job_1",
      workspaceId: "workspace_1",
      status: "completed",
      backup: {
        id: "backup_2",
        relativePath: "backups/pre-maintenance"
      },
      sqliteIntegrity: { ok: true, messages: ["ok"] },
      attachmentManifestAudit: {
        status: "needs_attention",
        manifestRelativePath:
          "logs/maintenance/maintenance_job_1/attachment-manifest-audit.json",
        scannedFileCount: 2,
        referencedFileCount: 1,
        missingReferencedPaths: [],
        orphanedRelativePaths: ["attachments/orphan.bin"],
        sizeMismatches: [],
        checksumMismatches: []
      },
      orphanAttachmentScan: {
        scannedFileCount: 2,
        referencedFileCount: 1,
        orphanedRelativePaths: ["attachments/orphan.bin"]
      },
      searchReindex: {
        indexedItemCount: 1,
        indexedAttachmentCount: 1
      },
      vacuum: { completed: true },
      error: null
    });
    expect(vacuumRuns).toBe(1);
    expect(backupRuns).toBe(1);
    expect(
      auditReports.has(
        "logs/maintenance/maintenance_job_1/attachment-manifest-audit.json"
      )
    ).toBe(true);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: "item_file_1"
      })
    ).not.toBeNull();
    expect(new MaintenanceService({ connection }).listJobLogs("workspace_1")[0]).toMatchObject({
      id: "maintenance_job_1",
      status: "completed"
    });
    expect(
      new ActivityLogRepository(connection).listForTarget("workspace", "workspace_1")
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "database_maintenance_run" })
      ])
    );
    expect(
      new ActivityLogRepository(connection).listForTarget("search_index", "workspace_1")
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "search_index_rebuilt" })
      ])
    );
  });

  it("quarantines orphan attachment files instead of deleting them", async () => {
    seedAttachment();
    idCounter = 0;

    const job = await createService({
      files: [
        "attachments/2026/05/attachment_1/Brief.pdf",
        "attachments/orphan.bin",
        "attachments/nested/orphan.txt"
      ]
    }).runMaintenanceJob({
      workspaceId: "workspace_1",
      operations: [
        "attachment_manifest_audit",
        "orphan_attachment_scan",
        "orphan_attachment_cleanup"
      ]
    });

    expect(job).toMatchObject({
      status: "completed",
      attachmentManifestAudit: {
        status: "needs_attention",
        orphanedRelativePaths: [
          "attachments/nested/orphan.txt",
          "attachments/orphan.bin"
        ]
      },
      orphanAttachmentCleanup: {
        quarantinedFileCount: 2,
        quarantineRootRelativePath:
          "logs/maintenance/maintenance_job_1/orphan-attachments"
      }
    });
    expect(movedFiles).toEqual([
      {
        source: "attachments/nested/orphan.txt",
        destination:
          "logs/maintenance/maintenance_job_1/orphan-attachments/nested/orphan.txt"
      },
      {
        source: "attachments/orphan.bin",
        destination:
          "logs/maintenance/maintenance_job_1/orphan-attachments/orphan.bin"
      }
    ]);
  });

  it("reports missing referenced files and metadata mismatches in the manifest audit", async () => {
    seedAttachment();
    idCounter = 0;

    const job = await createService({
      files: ["attachments/2026/05/attachment_1/Brief.pdf"],
      sizes: new Map([["attachments/2026/05/attachment_1/Brief.pdf", 99]]),
      checksums: new Map([["attachments/2026/05/attachment_1/Brief.pdf", "b".repeat(64)]])
    }).runMaintenanceJob({
      workspaceId: "workspace_1",
      operations: ["attachment_manifest_audit"]
    });

    expect(job.attachmentManifestAudit).toMatchObject({
      status: "needs_attention",
      sizeMismatches: [
        {
          storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
          expectedSizeBytes: 42,
          actualSizeBytes: 99
        }
      ],
      checksumMismatches: [
        {
          storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
          expectedChecksum: "a".repeat(64),
          actualChecksum: "b".repeat(64)
        }
      ]
    });

    const missingJob = await createService({ files: [] }).runMaintenanceJob({
      workspaceId: "workspace_1",
      operations: ["attachment_manifest_audit"]
    });

    expect(missingJob.attachmentManifestAudit).toMatchObject({
      missingReferencedPaths: ["attachments/2026/05/attachment_1/Brief.pdf"]
    });
  });

  it("records failed jobs when backup preflight is required but unavailable", async () => {
    const job = await new MaintenanceService({
      connection,
      idFactory,
      now,
      database: {
        runIntegrityCheck: () => ["ok"],
        vacuum: () => {
          vacuumRuns += 1;
        }
      }
    }).runMaintenanceJob({
      workspaceId: "workspace_1",
      requireBackup: true,
      operations: ["vacuum"]
    });

    expect(job.status).toBe("failed");
    expect(job.error).toContain("backup preflight");
    expect(vacuumRuns).toBe(0);
    expect(new MaintenanceService({ connection }).listJobLogs("workspace_1")).toHaveLength(1);
  });
});

function seedWorkspace(): void {
  new WorkspaceRepository(connection).create({
    id: "workspace_1",
    name: "Personal Work",
    schemaVersion: 1,
    timestamp: TEST_TIMESTAMP
  });
  new ContainerRepository(connection).create({
    id: "container_project_1",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    timestamp: TEST_TIMESTAMP
  });
}

function seedAttachment(): void {
  const item = new ItemRepository(connection).create({
    id: "item_file_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    type: "file",
    title: "Brief.pdf",
    timestamp: TEST_TIMESTAMP
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
    timestamp: TEST_TIMESTAMP
  });
  new SearchIndexService({ connection, idFactory, now }).rebuildWorkspaceIndex("workspace_1");
}

function createService(input: {
  files?: string[];
  sizes?: Map<string, number>;
  checksums?: Map<string, string>;
} = {}): MaintenanceService {
  return new MaintenanceService({
    connection,
    idFactory,
    now,
    database: {
      runIntegrityCheck: () => ["ok"],
      vacuum: () => {
        vacuumRuns += 1;
      }
    },
    fileSystem: {
      listWorkspaceFilesUnder: async () => input.files ?? [],
      workspacePathExists: async (workspaceRelativePath) =>
        (input.files ?? []).includes(workspaceRelativePath),
      workspaceFileSize: async (workspaceRelativePath) =>
        input.sizes?.get(workspaceRelativePath) ?? 42,
      workspaceFileChecksum: async (workspaceRelativePath) =>
        input.checksums?.get(workspaceRelativePath) ?? "a".repeat(64),
      writeWorkspaceJson: async (workspaceRelativePath, value) => {
        auditReports.set(workspaceRelativePath, value);
      },
      moveWorkspaceFile: async (sourceRelativePath, destinationRelativePath) => {
        movedFiles.push({
          source: sourceRelativePath,
          destination: destinationRelativePath
        });
      }
    },
    createBackup: async () => {
      backupRuns += 1;
      return { id: idFactory("backup"), relativePath: "backups/pre-maintenance" };
    }
  });
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function now(): Date {
  return new Date(TEST_TIMESTAMP);
}
