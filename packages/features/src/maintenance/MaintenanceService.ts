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
  | "rebuild_search_index"
  | "vacuum"
  | "orphan_attachment_scan";

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

export type MaintenanceJobSummary = {
  id: string;
  workspaceId: string;
  status: MaintenanceJobStatus;
  operations: MaintenanceOperation[];
  startedAt: string;
  completedAt: string;
  backup: MaintenanceBackupSummary | null;
  sqliteIntegrity: SqliteIntegrityCheckSummary | null;
  searchReindex: RebuildWorkspaceIndexResult | null;
  vacuum: { completed: boolean } | null;
  orphanAttachmentScan: OrphanAttachmentScanSummary | null;
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
      searchReindex: null,
      vacuum: null,
      orphanAttachmentScan: null,
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
    "rebuild_search_index",
    "vacuum",
    "orphan_attachment_scan"
  ].includes(value);
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
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
