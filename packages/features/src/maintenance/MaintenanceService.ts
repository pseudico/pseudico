import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId
} from "@local-work-os/core";
import {
  ActivityLogService,
  AppSettingsRepository,
  AttachmentRepository,
  SearchIndexService,
  type DatabaseConnection,
  type RebuildWorkspaceIndexResult
} from "@local-work-os/db";

export const MAINTENANCE_JOB_LOG_SETTING_KEY = "maintenance.jobs.v1";
export const DEFAULT_MAINTENANCE_JOB_LIMIT = 10;

export type MaintenanceOperation =
  | "sqlite_integrity_check"
  | "attachment_manifest_audit"
  | "rebuild_search_index"
  | "vacuum"
  | "orphan_attachment_scan"
  | "orphan_attachment_cleanup";

export type MaintenanceJobStatus = "completed" | "failed";
export type MaintenanceJobStepStatus = "completed" | "failed";

export type MaintenanceJobLogEntry = {
  step: string;
  status: MaintenanceJobStepStatus;
  message: string;
  startedAt: string;
  completedAt: string;
  details?: Record<string, unknown>;
};

export type MaintenanceBackupSummary = {
  id: string;
  relativePath: string;
};

export type SqliteIntegrityCheckSummary = {
  ok: boolean;
  messages: string[];
};

export type OrphanAttachmentScanSummary = {
  scannedFileCount: number;
  referencedFileCount: number;
  orphanedRelativePaths: string[];
};

export type AttachmentManifestSizeMismatch = {
  storagePath: string;
  expectedSizeBytes: number;
  actualSizeBytes: number;
};

export type AttachmentManifestChecksumMismatch = {
  storagePath: string;
  expectedChecksum: string;
  actualChecksum: string;
};

export type AttachmentManifestAuditSummary = {
  status: "healthy" | "needs_attention";
  manifestRelativePath: string | null;
  scannedFileCount: number;
  referencedFileCount: number;
  missingReferencedPaths: string[];
  orphanedRelativePaths: string[];
  unsafeReferencedPaths: string[];
  sizeMismatches: AttachmentManifestSizeMismatch[];
  checksumMismatches: AttachmentManifestChecksumMismatch[];
};

export type OrphanAttachmentCleanupSummary = {
  quarantinedFileCount: number;
  quarantineRootRelativePath: string;
  quarantinedFiles: Array<{
    sourceRelativePath: string;
    quarantineRelativePath: string;
  }>;
};

export type MaintenanceJobSummary = {
  id: string;
  workspaceId: string;
  status: MaintenanceJobStatus;
  operations: MaintenanceOperation[];
  startedAt: string;
  completedAt: string;
  backup: MaintenanceBackupSummary | null;
  sqliteIntegrity: SqliteIntegrityCheckSummary | null;
  attachmentManifestAudit: AttachmentManifestAuditSummary | null;
  searchReindex: RebuildWorkspaceIndexResult | null;
  vacuum: { completed: boolean } | null;
  orphanAttachmentScan: OrphanAttachmentScanSummary | null;
  orphanAttachmentCleanup: OrphanAttachmentCleanupSummary | null;
  entries: MaintenanceJobLogEntry[];
  error: string | null;
};

export type RunMaintenanceJobInput = {
  workspaceId: string;
  operations?: MaintenanceOperation[];
  requireBackup?: boolean;
};

export type MaintenanceDatabaseAdapter = {
  runIntegrityCheck: () => string[];
  vacuum: () => void;
};

export type MaintenanceFileSystemAdapter = {
  listWorkspaceFilesUnder: (workspaceRelativePath: string) => Promise<string[]>;
  workspacePathExists?: (workspaceRelativePath: string) => Promise<boolean>;
  workspaceFileSize?: (workspaceRelativePath: string) => Promise<number>;
  workspaceFileChecksum?: (workspaceRelativePath: string) => Promise<string>;
  writeWorkspaceJson?: (workspaceRelativePath: string, value: unknown) => Promise<void>;
  moveWorkspaceFile?: (sourceRelativePath: string, destinationRelativePath: string) => Promise<void>;
};

export type MaintenanceServiceIdFactory = (prefix: string) => string;

export class MaintenanceService {
  readonly module = "maintenance";

  private readonly connection: DatabaseConnection;
  private readonly database: MaintenanceDatabaseAdapter;
  private readonly fileSystem: MaintenanceFileSystemAdapter | undefined;
  private readonly createBackup: (() => Promise<MaintenanceBackupSummary>) | undefined;
  private readonly idFactory: MaintenanceServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    database?: MaintenanceDatabaseAdapter;
    fileSystem?: MaintenanceFileSystemAdapter;
    createBackup?: () => Promise<MaintenanceBackupSummary>;
    idFactory?: MaintenanceServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.database = input.database ?? createSqliteMaintenanceAdapter(input.connection);
    this.fileSystem = input.fileSystem;
    this.createBackup = input.createBackup;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  listJobLogs(workspaceId: string, limit = DEFAULT_MAINTENANCE_JOB_LIMIT): MaintenanceJobSummary[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    const setting = new AppSettingsRepository(this.connection).findByKey({
      workspaceId,
      settingKey: MAINTENANCE_JOB_LOG_SETTING_KEY
    });

    if (setting === null) {
      return [];
    }

    try {
      const parsed = JSON.parse(setting.valueJson) as unknown;

      if (!isMaintenanceJobLogValue(parsed)) {
        return [];
      }

      return parsed.jobs.slice(0, normalizeLimit(limit));
    } catch {
      return [];
    }
  }

  async runMaintenanceJob(input: RunMaintenanceJobInput): Promise<MaintenanceJobSummary> {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    const operations = normalizeOperations(input.operations);
    const job: MaintenanceJobSummary = {
      id: this.idFactory("maintenance_job"),
      workspaceId: input.workspaceId,
      status: "completed",
      operations,
      startedAt: createIsoTimestamp(this.now()),
      completedAt: "",
      backup: null,
      sqliteIntegrity: null,
      attachmentManifestAudit: null,
      searchReindex: null,
      vacuum: null,
      orphanAttachmentScan: null,
      orphanAttachmentCleanup: null,
      entries: [],
      error: null
    };

    try {
      if (input.requireBackup === true) {
        if (this.createBackup === undefined) {
          throw new Error("Maintenance backup preflight is not configured.");
        }

        job.backup = await this.runStep(job, "backup", async () => {
          const backup = await this.createBackup!();

          return {
            message: `Created backup ${backup.relativePath} before maintenance.`,
            details: { backupId: backup.id, relativePath: backup.relativePath },
            value: backup
          };
        });
      }

      if (operations.includes("sqlite_integrity_check")) {
        job.sqliteIntegrity = await this.runStep(job, "sqlite_integrity_check", async () => {
          const messages = this.database.runIntegrityCheck();
          const ok = messages.length === 1 && messages[0]?.toLowerCase() === "ok";

          return {
            message: ok ? "SQLite integrity_check passed." : "SQLite integrity_check reported issues.",
            details: { messages },
            value: { ok, messages }
          };
        });
      }

      if (operations.includes("orphan_attachment_scan")) {
        job.orphanAttachmentScan = await this.runStep(job, "orphan_attachment_scan", async () => {
          const scan = await this.scanOrphanAttachmentFiles(input.workspaceId);

          return {
            message:
              scan.orphanedRelativePaths.length === 0
                ? "No orphan attachment files found."
                : `Found ${scan.orphanedRelativePaths.length} orphan attachment file(s).`,
            details: scan,
            value: scan
          };
        });
      }

      if (operations.includes("attachment_manifest_audit")) {
        job.attachmentManifestAudit = await this.runStep(job, "attachment_manifest_audit", async () => {
          const audit = await this.auditAttachmentManifest(input.workspaceId, job.id);
          const issueCount = getAttachmentManifestIssueCount(audit);

          return {
            message:
              issueCount === 0
                ? "Attachment manifest matches the local filesystem."
                : `Attachment manifest audit found ${issueCount} mismatch(es).`,
            details: audit,
            value: audit
          };
        });
      }

      if (operations.includes("orphan_attachment_cleanup")) {
        job.orphanAttachmentCleanup = await this.runStep(job, "orphan_attachment_cleanup", async () => {
          const cleanup = await this.cleanupOrphanAttachmentFiles(input.workspaceId, job.id);

          return {
            message:
              cleanup.quarantinedFileCount === 0
                ? "No orphan attachment files needed cleanup."
                : `Quarantined ${cleanup.quarantinedFileCount} orphan attachment file(s).`,
            details: cleanup,
            value: cleanup
          };
        });
      }

      if (operations.includes("rebuild_search_index")) {
        job.searchReindex = await this.runStep(job, "rebuild_search_index", async () => {
          const result = new SearchIndexService({
            connection: this.connection,
            idFactory: this.idFactory,
            now: this.now
          }).rebuildWorkspaceIndex(input.workspaceId);

          new ActivityLogService({
            connection: this.connection,
            idFactory: this.idFactory
          }).logEvent({
            workspaceId: input.workspaceId,
            actorType: "local_user",
            action: ActivityAction.searchIndexRebuilt,
            targetType: "search_index",
            targetId: input.workspaceId,
            summary: "Rebuilt the local search index from source records.",
            beforeJson: null,
            afterJson: JSON.stringify(result),
            timestamp: createIsoTimestamp(this.now())
          });

          return {
            message: "Search index rebuilt.",
            details: result,
            value: result
          };
        });
      }

      if (operations.includes("vacuum")) {
        job.vacuum = await this.runStep(job, "vacuum", async () => {
          this.database.vacuum();

          return {
            message: "SQLite VACUUM completed.",
            details: { completed: true },
            value: { completed: true }
          };
        });
      }
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : "Maintenance job failed.";
    } finally {
      job.completedAt = createIsoTimestamp(this.now());
      this.recordMaintenanceActivity(job);
      this.saveJobLog(job);
    }

    return job;
  }

  private async runStep<T>(
    job: MaintenanceJobSummary,
    step: string,
    operation: () => Promise<{ message: string; details?: Record<string, unknown>; value: T }>
  ): Promise<T> {
    const startedAt = createIsoTimestamp(this.now());

    try {
      const result = await operation();
      job.entries.push({
        step,
        status: "completed",
        message: result.message,
        startedAt,
        completedAt: createIsoTimestamp(this.now()),
        ...(result.details === undefined ? {} : { details: result.details })
      });

      return result.value;
    } catch (error) {
      const message = error instanceof Error ? error.message : `${step} failed.`;
      job.entries.push({
        step,
        status: "failed",
        message,
        startedAt,
        completedAt: createIsoTimestamp(this.now())
      });
      throw error;
    }
  }

  private async scanOrphanAttachmentFiles(workspaceId: string): Promise<OrphanAttachmentScanSummary> {
    const referenced = new Set(
      new AttachmentRepository(this.connection)
        .listByWorkspace({ workspaceId, includeDeleted: true })
        .map((attachment) => normalizeRelativePath(attachment.storagePath))
    );

    if (this.fileSystem === undefined) {
      return {
        scannedFileCount: 0,
        referencedFileCount: referenced.size,
        orphanedRelativePaths: []
      };
    }

    const files = (await this.fileSystem.listWorkspaceFilesUnder("attachments"))
      .map(normalizeRelativePath)
      .filter((path) => path.startsWith("attachments/"));

    return {
      scannedFileCount: files.length,
      referencedFileCount: referenced.size,
      orphanedRelativePaths: files.filter((path) => !referenced.has(path)).sort()
    };
  }

  private recordMaintenanceActivity(job: MaintenanceJobSummary): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: job.workspaceId,
      actorType: "local_user",
      action: ActivityAction.databaseMaintenanceRun,
      targetType: "workspace",
      targetId: job.workspaceId,
      summary:
        job.status === "completed"
          ? `Completed local maintenance job ${job.id}.`
          : `Local maintenance job ${job.id} failed: ${job.error ?? "unknown error"}.`,
      beforeJson: null,
      afterJson: JSON.stringify({
        id: job.id,
        status: job.status,
        operations: job.operations,
        backup: job.backup,
        attachmentManifestAudit: job.attachmentManifestAudit,
        orphanAttachmentCleanup: job.orphanAttachmentCleanup,
        error: job.error
      }),
      timestamp: job.completedAt || createIsoTimestamp(this.now())
    });
  }

  private saveJobLog(job: MaintenanceJobSummary): void {
    const repository = new AppSettingsRepository(this.connection);
    const jobs = [
      job,
      ...this.listJobLogs(job.workspaceId, DEFAULT_MAINTENANCE_JOB_LIMIT).filter(
        (candidate) => candidate.id !== job.id
      )
    ].slice(0, DEFAULT_MAINTENANCE_JOB_LIMIT);
    const timestamp = job.completedAt || createIsoTimestamp(this.now());

    repository.upsert({
      id: this.idFactory("setting"),
      workspaceId: job.workspaceId,
      settingKey: MAINTENANCE_JOB_LOG_SETTING_KEY,
      valueJson: JSON.stringify({ version: 1, jobs }),
      timestamp
    });
  }

  private async auditAttachmentManifest(
    workspaceId: string,
    jobId: string
  ): Promise<AttachmentManifestAuditSummary> {
    const attachments = new AttachmentRepository(this.connection).listByWorkspace({
      workspaceId
    });
    const referencedPaths = attachments.map((attachment) =>
      normalizeRelativePath(attachment.storagePath)
    );
    const referenced = new Set(referencedPaths);
    const unsafeReferencedPaths = referencedPaths.filter(
      (path) => !isSafeAttachmentRelativePath(path)
    );
    const missingReferencedPaths: string[] = [];
    const sizeMismatches: AttachmentManifestSizeMismatch[] = [];
    const checksumMismatches: AttachmentManifestChecksumMismatch[] = [];
    const files =
      this.fileSystem === undefined
        ? []
        : (await this.fileSystem.listWorkspaceFilesUnder("attachments"))
            .map(normalizeRelativePath)
            .filter((path) => path.startsWith("attachments/"));

    if (this.fileSystem !== undefined) {
      for (const attachment of attachments) {
        const storagePath = normalizeRelativePath(attachment.storagePath);

        if (!isSafeAttachmentRelativePath(storagePath)) {
          continue;
        }

        const exists = await this.workspacePathExists(storagePath);

        if (!exists) {
          missingReferencedPaths.push(storagePath);
          continue;
        }

        if (this.fileSystem.workspaceFileSize !== undefined) {
          const actualSizeBytes = await this.fileSystem.workspaceFileSize(storagePath);

          if (actualSizeBytes !== attachment.sizeBytes) {
            sizeMismatches.push({
              storagePath,
              expectedSizeBytes: attachment.sizeBytes,
              actualSizeBytes
            });
          }
        }

        if (
          this.fileSystem.workspaceFileChecksum !== undefined &&
          attachment.checksum !== null &&
          attachment.checksum.trim().length > 0
        ) {
          const actualChecksum = await this.fileSystem.workspaceFileChecksum(storagePath);

          if (actualChecksum.toLowerCase() !== attachment.checksum.toLowerCase()) {
            checksumMismatches.push({
              storagePath,
              expectedChecksum: attachment.checksum,
              actualChecksum
            });
          }
        }
      }
    }

    const orphanedRelativePaths = files
      .filter((path) => !referenced.has(path))
      .sort();
    const manifestRelativePath =
      this.fileSystem?.writeWorkspaceJson === undefined
        ? null
        : `logs/maintenance/${jobId}/attachment-manifest-audit.json`;
    const audit: AttachmentManifestAuditSummary = {
      status: "healthy",
      manifestRelativePath,
      scannedFileCount: files.length,
      referencedFileCount: referenced.size,
      missingReferencedPaths: [...new Set(missingReferencedPaths)].sort(),
      orphanedRelativePaths,
      unsafeReferencedPaths: [...new Set(unsafeReferencedPaths)].sort(),
      sizeMismatches: sizeMismatches.sort((left, right) =>
        left.storagePath.localeCompare(right.storagePath)
      ),
      checksumMismatches: checksumMismatches.sort((left, right) =>
        left.storagePath.localeCompare(right.storagePath)
      )
    };

    audit.status = getAttachmentManifestIssueCount(audit) === 0
      ? "healthy"
      : "needs_attention";

    if (manifestRelativePath !== null) {
      await this.fileSystem!.writeWorkspaceJson!(manifestRelativePath, {
        version: 1,
        workspaceId,
        generatedAt: createIsoTimestamp(this.now()),
        audit,
        attachments: attachments.map((attachment) => ({
          id: attachment.id,
          itemId: attachment.itemId,
          originalName: attachment.originalName,
          storedName: attachment.storedName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          checksum: attachment.checksum,
          storagePath: attachment.storagePath,
          description: attachment.description,
          createdAt: attachment.createdAt,
          updatedAt: attachment.updatedAt
        }))
      });
    }

    return audit;
  }

  private async workspacePathExists(workspaceRelativePath: string): Promise<boolean> {
    if (this.fileSystem?.workspacePathExists !== undefined) {
      return await this.fileSystem.workspacePathExists(workspaceRelativePath);
    }

    const files = await this.fileSystem!.listWorkspaceFilesUnder("attachments");
    const normalized = normalizeRelativePath(workspaceRelativePath);

    return files.map(normalizeRelativePath).includes(normalized);
  }

  private async cleanupOrphanAttachmentFiles(
    workspaceId: string,
    jobId: string
  ): Promise<OrphanAttachmentCleanupSummary> {
    if (this.fileSystem?.moveWorkspaceFile === undefined) {
      throw new Error("Orphan attachment cleanup is not configured.");
    }

    const scan = await this.scanOrphanAttachmentFiles(workspaceId);
    const quarantineRootRelativePath = `logs/maintenance/${jobId}/orphan-attachments`;
    const quarantinedFiles: OrphanAttachmentCleanupSummary["quarantinedFiles"] = [];

    for (const orphanedRelativePath of scan.orphanedRelativePaths) {
      if (!isSafeAttachmentRelativePath(orphanedRelativePath)) {
        continue;
      }

      const quarantineRelativePath = `${quarantineRootRelativePath}/${orphanedRelativePath.slice("attachments/".length)}`;
      await this.fileSystem.moveWorkspaceFile(
        orphanedRelativePath,
        quarantineRelativePath
      );
      quarantinedFiles.push({
        sourceRelativePath: orphanedRelativePath,
        quarantineRelativePath
      });
    }

    return {
      quarantinedFileCount: quarantinedFiles.length,
      quarantineRootRelativePath,
      quarantinedFiles
    };
  }
}

export const maintenanceModuleContract = {
  module: "maintenance",
  purpose: "Run local SQLite integrity, search reindex, vacuum, and attachment orphan maintenance jobs.",
  owns: [
    "database maintenance job orchestration",
    "maintenance job logs",
    "backup preflight coordination",
    "SQLite integrity/vacuum entry points",
    "attachment orphan scan summaries"
  ],
  doesNotOwn: [
    "renderer filesystem access",
    "cloud diagnostics",
    "destructive attachment repair without explicit user action"
  ],
  integrationPoints: ["database services", "search", "backup", "Electron main/preload IPC", "settings"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function createSqliteMaintenanceAdapter(connection: DatabaseConnection): MaintenanceDatabaseAdapter {
  return {
    runIntegrityCheck() {
      const rows = connection.sqlite.prepare("pragma integrity_check").all() as Array<Record<string, unknown>>;
      return rows
        .flatMap((row) => Object.values(row))
        .map((value) => String(value));
    },
    vacuum() {
      connection.sqlite.exec("vacuum");
    }
  };
}

function normalizeOperations(operations: MaintenanceOperation[] | undefined): MaintenanceOperation[] {
  const selected = operations ?? [
    "sqlite_integrity_check",
    "attachment_manifest_audit",
    "orphan_attachment_scan",
    "rebuild_search_index",
    "vacuum"
  ];
  const unique = [...new Set(selected)];

  if (unique.length === 0) {
    throw new Error("At least one maintenance operation is required.");
  }

  for (const operation of unique) {
    if (!isMaintenanceOperation(operation)) {
      throw new Error(`Unsupported maintenance operation: ${String(operation)}.`);
    }
  }

  return unique;
}

function isMaintenanceOperation(value: string): value is MaintenanceOperation {
  return [
    "sqlite_integrity_check",
    "attachment_manifest_audit",
    "rebuild_search_index",
    "vacuum",
    "orphan_attachment_scan",
    "orphan_attachment_cleanup"
  ].includes(value);
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isSafeAttachmentRelativePath(value: string): boolean {
  const normalized = normalizeRelativePath(value);

  return (
    normalized.startsWith("attachments/") &&
    !normalized.startsWith("/") &&
    !/^[a-zA-Z]:/.test(normalized) &&
    normalized.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
  );
}

function getAttachmentManifestIssueCount(audit: AttachmentManifestAuditSummary): number {
  return (
    audit.missingReferencedPaths.length +
    audit.orphanedRelativePaths.length +
    audit.unsafeReferencedPaths.length +
    audit.sizeMismatches.length +
    audit.checksumMismatches.length
  );
}

function normalizeLimit(limit: number): number {
  return Number.isFinite(limit) && limit > 0
    ? Math.min(Math.floor(limit), DEFAULT_MAINTENANCE_JOB_LIMIT)
    : DEFAULT_MAINTENANCE_JOB_LIMIT;
}

function isMaintenanceJobLogValue(value: unknown): value is { version: 1; jobs: MaintenanceJobSummary[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { version?: unknown }).version === 1 &&
    Array.isArray((value as { jobs?: unknown }).jobs)
  );
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
