import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type Clock
} from "@local-work-os/core";
import {
  ActivityLogService,
  AppSettingsRepository,
  TransactionService,
  type AppSettingRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import type {
  ManualBackupSnapshot,
  BackupSnapshotSummary
} from "./BackupService";
import type { BackupKind } from "./BackupManifest";

export const BACKUP_SCHEDULER_SETTINGS_KEY =
  "backup.scheduler.settings.v1";
export const BACKUP_SCHEDULER_STATUS_KEY = "backup.scheduler.status.v1";

export type ScheduledBackupTrigger =
  | "app_open"
  | "interval"
  | "app_close"
  | "pre_migration"
  | "manual_check";

export type BackupRetentionSettings = {
  maxCount: number;
  maxAgeDays: number;
  maxSizeBytes: number;
};

export type BackupSchedulerSettings = {
  workspaceId: string;
  enabled: boolean;
  intervalHours: number;
  runOnAppClose: boolean;
  runBeforeMigration: boolean;
  retention: BackupRetentionSettings;
  updatedAt: string | null;
};

export type UpdateBackupSchedulerSettingsInput = {
  workspaceId: string;
  enabled?: boolean;
  intervalHours?: number;
  runOnAppClose?: boolean;
  runBeforeMigration?: boolean;
  retention?: Partial<BackupRetentionSettings>;
};

export type BackupSchedulerStatus = {
  workspaceId: string;
  lastCheckedAt: string | null;
  lastRunAt: string | null;
  lastSuccessfulBackupAt: string | null;
  lastBackupId: string | null;
  lastError: string | null;
  nextRunAt: string | null;
  lastRetentionDeletedCount: number;
  updatedAt: string | null;
};

export type BackupRetentionDeletionSummary = {
  id: string;
  relativePath: string;
  createdAt: string;
  reason: "count" | "age" | "size";
};

export type AutomaticBackupRunSummary = {
  workspaceId: string;
  trigger: ScheduledBackupTrigger;
  due: boolean;
  skippedReason: string | null;
  createdBackup: ManualBackupSnapshot | null;
  retentionDeletedBackups: BackupRetentionDeletionSummary[];
  settings: BackupSchedulerSettings;
  status: BackupSchedulerStatus;
};

type BackupSchedulerPayload = Omit<BackupSchedulerSettings, "workspaceId" | "updatedAt"> & {
  version: 1;
};

type BackupSchedulerStatusPayload = Omit<BackupSchedulerStatus, "workspaceId" | "updatedAt"> & {
  version: 1;
};

type SettingsRepository = Pick<AppSettingsRepository, "findByKey" | "upsert">;

export const DEFAULT_BACKUP_RETENTION_SETTINGS: BackupRetentionSettings = {
  maxCount: 10,
  maxAgeDays: 30,
  maxSizeBytes: 5 * 1024 * 1024 * 1024
};

export const DEFAULT_BACKUP_SCHEDULER_SETTINGS: Omit<
  BackupSchedulerSettings,
  "workspaceId" | "updatedAt"
> = {
  enabled: false,
  intervalHours: 24,
  runOnAppClose: true,
  runBeforeMigration: true,
  retention: DEFAULT_BACKUP_RETENTION_SETTINGS
};

export class BackupSchedulerService {
  readonly module = "backup";

  private readonly connection: DatabaseConnection | null;
  private readonly repository: SettingsRepository;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: Clock;
  private readonly logActivity: boolean;

  constructor(options: {
    connection?: DatabaseConnection;
    appSettingsRepository?: SettingsRepository;
    idFactory?: (prefix: string) => string;
    now?: Clock;
    logActivity?: boolean;
  }) {
    if (
      options.connection === undefined &&
      options.appSettingsRepository === undefined
    ) {
      throw new Error(
        "BackupSchedulerService requires a database connection or app settings repository."
      );
    }

    this.connection = options.connection ?? null;
    this.repository =
      options.appSettingsRepository ?? new AppSettingsRepository(options.connection!);
    this.idFactory = options.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = options.now ?? (() => new Date());
    this.logActivity = options.logActivity ?? options.connection !== undefined;
  }

  getSettings(workspaceId: string): BackupSchedulerSettings {
    validateWorkspaceId(workspaceId);

    return toSettings({
      workspaceId,
      setting: this.repository.findByKey({
        workspaceId,
        settingKey: BACKUP_SCHEDULER_SETTINGS_KEY
      })
    });
  }

  getStatus(workspaceId: string): BackupSchedulerStatus {
    validateWorkspaceId(workspaceId);

    return toStatus({
      workspaceId,
      setting: this.repository.findByKey({
        workspaceId,
        settingKey: BACKUP_SCHEDULER_STATUS_KEY
      })
    });
  }

  async updateSettings(
    input: UpdateBackupSchedulerSettingsInput
  ): Promise<BackupSchedulerSettings> {
    validateWorkspaceId(input.workspaceId);

    const operation = (): BackupSchedulerSettings => {
      const before = this.getSettings(input.workspaceId);
      const timestamp = createIsoTimestamp(this.now());
      const next: BackupSchedulerSettings = {
        workspaceId: input.workspaceId,
        updatedAt: timestamp,
        enabled: input.enabled ?? before.enabled,
        intervalHours: normalizeIntervalHours(
          input.intervalHours ?? before.intervalHours
        ),
        runOnAppClose: input.runOnAppClose ?? before.runOnAppClose,
        runBeforeMigration: input.runBeforeMigration ?? before.runBeforeMigration,
        retention: normalizeRetention({
          ...before.retention,
          ...(input.retention ?? {})
        })
      };
      const saved = this.repository.upsert({
        id: this.idFactory("app_setting"),
        workspaceId: input.workspaceId,
        settingKey: BACKUP_SCHEDULER_SETTINGS_KEY,
        valueJson: stringifySettings(next),
        timestamp
      });
      const after = toSettings({ workspaceId: input.workspaceId, setting: saved });

      if (this.logActivity && this.connection !== null) {
        new ActivityLogService({
          connection: this.connection,
          idFactory: this.idFactory
        }).logEvent({
          workspaceId: input.workspaceId,
          actorType: "local_user",
          action: ActivityAction.workspacePreferencesUpdated,
          targetType: "workspace",
          targetId: input.workspaceId,
          summary: "Updated automatic backup preferences.",
          beforeJson: JSON.stringify(stripSettingsMetadata(before)),
          afterJson: JSON.stringify(stripSettingsMetadata(after)),
          timestamp
        });
      }

      return after;
    };

    if (this.connection === null) {
      return operation();
    }

    return await new TransactionService({ connection: this.connection }).runInTransaction(
      operation
    );
  }

  async runAutomaticBackup(input: {
    workspaceId: string;
    trigger: ScheduledBackupTrigger;
    backups: BackupSnapshotSummary[];
    createBackup: (kind: BackupKind) => Promise<ManualBackupSnapshot>;
    deleteBackup: (
      backup: BackupSnapshotSummary,
      reason: BackupRetentionDeletionSummary["reason"]
    ) => Promise<void>;
  }): Promise<AutomaticBackupRunSummary> {
    validateWorkspaceId(input.workspaceId);
    const settings = this.getSettings(input.workspaceId);
    const statusBefore = this.getStatus(input.workspaceId);
    const timestamp = createIsoTimestamp(this.now());
    const due = evaluateDue({
      settings,
      status: statusBefore,
      trigger: input.trigger,
      now: this.now()
    });
    let createdBackup: ManualBackupSnapshot | null = null;
    let skippedReason: string | null = due.due ? null : due.reason;
    let errorMessage: string | null = null;
    const backupsForRetention = [...input.backups];

    if (due.due) {
      try {
        createdBackup = await input.createBackup(
          input.trigger === "pre_migration" ? "pre_migration" : "automatic"
        );
        backupsForRetention.push(createdBackup);
      } catch (error) {
        errorMessage =
          error instanceof Error ? error.message : "Automatic backup failed.";
        skippedReason = errorMessage;
      }
    }

    const deletionCandidates =
      errorMessage === null
        ? selectRetentionDeletionCandidates({
            backups: backupsForRetention,
            settings,
            now: this.now()
          })
        : [];
    const retentionDeletedBackups: BackupRetentionDeletionSummary[] = [];

    for (const candidate of deletionCandidates) {
      await input.deleteBackup(candidate.backup, candidate.reason);
      retentionDeletedBackups.push({
        id: candidate.backup.id,
        relativePath: candidate.backup.relativePath,
        createdAt: candidate.backup.createdAt,
        reason: candidate.reason
      });
    }

    const status = this.saveStatus({
      workspaceId: input.workspaceId,
      status: {
        workspaceId: input.workspaceId,
        lastCheckedAt: timestamp,
        lastRunAt: due.due ? timestamp : statusBefore.lastRunAt,
        lastSuccessfulBackupAt:
          createdBackup === null
            ? statusBefore.lastSuccessfulBackupAt
            : createdBackup.createdAt,
        lastBackupId:
          createdBackup === null ? statusBefore.lastBackupId : createdBackup.id,
        lastError: errorMessage,
        nextRunAt: calculateNextRunAt(settings, this.now()),
        lastRetentionDeletedCount: retentionDeletedBackups.length,
        updatedAt: timestamp
      }
    });

    return {
      workspaceId: input.workspaceId,
      trigger: input.trigger,
      due: due.due && errorMessage === null,
      skippedReason,
      createdBackup,
      retentionDeletedBackups,
      settings,
      status
    };
  }

  private saveStatus(input: {
    workspaceId: string;
    status: BackupSchedulerStatus;
  }): BackupSchedulerStatus {
    const saved = this.repository.upsert({
      id: this.idFactory("app_setting"),
      workspaceId: input.workspaceId,
      settingKey: BACKUP_SCHEDULER_STATUS_KEY,
      valueJson: stringifyStatus(input.status),
      timestamp: input.status.updatedAt ?? createIsoTimestamp(this.now())
    });

    return toStatus({ workspaceId: input.workspaceId, setting: saved });
  }
}

function evaluateDue(input: {
  settings: BackupSchedulerSettings;
  status: BackupSchedulerStatus;
  trigger: ScheduledBackupTrigger;
  now: Date;
}): { due: boolean; reason: string | null } {
  if (input.trigger === "pre_migration") {
    return input.settings.runBeforeMigration
      ? { due: true, reason: null }
      : { due: false, reason: "Pre-migration backups are disabled." };
  }

  if (!input.settings.enabled) {
    return { due: false, reason: "Automatic backups are disabled." };
  }

  if (input.trigger === "app_close" && !input.settings.runOnAppClose) {
    return { due: false, reason: "App-close backups are disabled." };
  }

  const lastBackupAt = input.status.lastSuccessfulBackupAt;

  if (lastBackupAt === null) {
    return { due: true, reason: null };
  }

  const elapsedMs = input.now.getTime() - new Date(lastBackupAt).getTime();
  const intervalMs = input.settings.intervalHours * 60 * 60 * 1000;

  return elapsedMs >= intervalMs
    ? { due: true, reason: null }
    : { due: false, reason: "Automatic backup interval has not elapsed." };
}

export function selectRetentionDeletionCandidates(input: {
  backups: BackupSnapshotSummary[];
  settings: BackupSchedulerSettings;
  now: Date;
}): Array<{
  backup: BackupSnapshotSummary;
  reason: BackupRetentionDeletionSummary["reason"];
}> {
  const candidates = new Map<
    string,
    { backup: BackupSnapshotSummary; reason: BackupRetentionDeletionSummary["reason"] }
  >();
  const automaticBackups = input.backups
    .filter((backup) => backup.kind === "automatic" || backup.kind === "pre_migration")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  for (const backup of automaticBackups.slice(input.settings.retention.maxCount)) {
    candidates.set(backup.relativePath, { backup, reason: "count" });
  }

  const maxAgeMs = input.settings.retention.maxAgeDays * 24 * 60 * 60 * 1000;

  for (const backup of automaticBackups) {
    const ageMs = input.now.getTime() - new Date(backup.createdAt).getTime();

    if (ageMs > maxAgeMs && !candidates.has(backup.relativePath)) {
      candidates.set(backup.relativePath, { backup, reason: "age" });
    }
  }

  let retainedBytes = 0;

  for (const backup of automaticBackups) {
    if (candidates.has(backup.relativePath)) {
      continue;
    }

    retainedBytes +=
      (backup.databaseSizeBytes ?? 0) + backup.totalAttachmentBytes;

    if (retainedBytes > input.settings.retention.maxSizeBytes) {
      candidates.set(backup.relativePath, { backup, reason: "size" });
    }
  }

  return [...candidates.values()].sort((left, right) =>
    left.backup.createdAt.localeCompare(right.backup.createdAt)
  );
}

function toSettings(input: {
  workspaceId: string;
  setting: AppSettingRecord | null;
}): BackupSchedulerSettings {
  if (input.setting === null) {
    return {
      workspaceId: input.workspaceId,
      updatedAt: null,
      ...DEFAULT_BACKUP_SCHEDULER_SETTINGS,
      retention: { ...DEFAULT_BACKUP_RETENTION_SETTINGS }
    };
  }

  try {
    const parsed = JSON.parse(input.setting.valueJson) as unknown;
    const value = isRecord(parsed) && parsed.version === 1 ? parsed : {};

    return {
      workspaceId: input.workspaceId,
      updatedAt: input.setting.updatedAt,
      enabled:
        typeof value.enabled === "boolean"
          ? value.enabled
          : DEFAULT_BACKUP_SCHEDULER_SETTINGS.enabled,
      intervalHours: normalizeIntervalHours(value.intervalHours),
      runOnAppClose:
        typeof value.runOnAppClose === "boolean"
          ? value.runOnAppClose
          : DEFAULT_BACKUP_SCHEDULER_SETTINGS.runOnAppClose,
      runBeforeMigration:
        typeof value.runBeforeMigration === "boolean"
          ? value.runBeforeMigration
          : DEFAULT_BACKUP_SCHEDULER_SETTINGS.runBeforeMigration,
      retention: normalizeRetention(value.retention)
    };
  } catch {
    return {
      workspaceId: input.workspaceId,
      updatedAt: input.setting.updatedAt,
      ...DEFAULT_BACKUP_SCHEDULER_SETTINGS,
      retention: { ...DEFAULT_BACKUP_RETENTION_SETTINGS }
    };
  }
}

function toStatus(input: {
  workspaceId: string;
  setting: AppSettingRecord | null;
}): BackupSchedulerStatus {
  if (input.setting === null) {
    return defaultStatus(input.workspaceId, null);
  }

  try {
    const parsed = JSON.parse(input.setting.valueJson) as unknown;
    const value = isRecord(parsed) && parsed.version === 1 ? parsed : {};

    return {
      workspaceId: input.workspaceId,
      lastCheckedAt: nullableString(value.lastCheckedAt),
      lastRunAt: nullableString(value.lastRunAt),
      lastSuccessfulBackupAt: nullableString(value.lastSuccessfulBackupAt),
      lastBackupId: nullableString(value.lastBackupId),
      lastError: nullableString(value.lastError),
      nextRunAt: nullableString(value.nextRunAt),
      lastRetentionDeletedCount:
        typeof value.lastRetentionDeletedCount === "number"
          ? Math.max(0, Math.floor(value.lastRetentionDeletedCount))
          : 0,
      updatedAt: input.setting.updatedAt
    };
  } catch {
    return defaultStatus(input.workspaceId, input.setting.updatedAt);
  }
}

function defaultStatus(
  workspaceId: string,
  updatedAt: string | null
): BackupSchedulerStatus {
  return {
    workspaceId,
    lastCheckedAt: null,
    lastRunAt: null,
    lastSuccessfulBackupAt: null,
    lastBackupId: null,
    lastError: null,
    nextRunAt: null,
    lastRetentionDeletedCount: 0,
    updatedAt
  };
}

function stringifySettings(settings: BackupSchedulerSettings): string {
  const payload: BackupSchedulerPayload = {
    version: 1,
    ...stripSettingsMetadata(settings)
  };

  return JSON.stringify(payload);
}

function stringifyStatus(status: BackupSchedulerStatus): string {
  const payload: BackupSchedulerStatusPayload = {
    version: 1,
    lastCheckedAt: status.lastCheckedAt,
    lastRunAt: status.lastRunAt,
    lastSuccessfulBackupAt: status.lastSuccessfulBackupAt,
    lastBackupId: status.lastBackupId,
    lastError: status.lastError,
    nextRunAt: status.nextRunAt,
    lastRetentionDeletedCount: status.lastRetentionDeletedCount
  };

  return JSON.stringify(payload);
}

function stripSettingsMetadata(
  settings: BackupSchedulerSettings
): Omit<BackupSchedulerSettings, "workspaceId" | "updatedAt"> {
  return {
    enabled: settings.enabled,
    intervalHours: settings.intervalHours,
    runOnAppClose: settings.runOnAppClose,
    runBeforeMigration: settings.runBeforeMigration,
    retention: settings.retention
  };
}

function calculateNextRunAt(
  settings: BackupSchedulerSettings,
  now: Date
): string | null {
  if (!settings.enabled) {
    return null;
  }

  return createIsoTimestamp(
    new Date(now.getTime() + settings.intervalHours * 60 * 60 * 1000)
  );
}

function normalizeIntervalHours(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return DEFAULT_BACKUP_SCHEDULER_SETTINGS.intervalHours;
  }

  return Math.min(168, Math.max(1, Math.floor(numberValue)));
}

function normalizeRetention(value: unknown): BackupRetentionSettings {
  const record = isRecord(value) ? value : {};

  return {
    maxCount: normalizePositiveInteger(
      record.maxCount,
      DEFAULT_BACKUP_RETENTION_SETTINGS.maxCount
    ),
    maxAgeDays: normalizePositiveInteger(
      record.maxAgeDays,
      DEFAULT_BACKUP_RETENTION_SETTINGS.maxAgeDays
    ),
    maxSizeBytes: normalizePositiveInteger(
      record.maxSizeBytes,
      DEFAULT_BACKUP_RETENTION_SETTINGS.maxSizeBytes
    )
  };
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return fallback;
  }

  return Math.floor(numberValue);
}

function validateWorkspaceId(workspaceId: string): void {
  if (workspaceId.trim().length === 0) {
    throw new Error("workspaceId must be a non-empty string.");
  }
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
