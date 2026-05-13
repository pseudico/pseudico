import { describe, expect, it } from "vitest";
import {
  BackupSchedulerService,
  DEFAULT_BACKUP_RETENTION_SETTINGS,
  selectRetentionDeletionCandidates,
  type BackupSchedulerSettings,
  type BackupSnapshotSummary,
  type ManualBackupSnapshot
} from "../src";

describe("BackupSchedulerService", () => {
  it("persists scheduler settings and records automatic backup status", async () => {
    const repository = createSettingsRepository();
    const service = new BackupSchedulerService({
      appSettingsRepository: repository,
      idFactory: createIdFactory(),
      now: () => new Date("2026-05-13T00:00:00.000Z")
    });
    const settings = await service.updateSettings({
      workspaceId: "workspace_1",
      enabled: true,
      intervalHours: 24,
      retention: {
        maxCount: 2,
        maxAgeDays: 30,
        maxSizeBytes: 4096
      }
    });
    const deleted: string[] = [];
    const result = await service.runAutomaticBackup({
      workspaceId: "workspace_1",
      trigger: "manual_check",
      backups: [
        backupSummary({
          id: "backup_old",
          relativePath: "backups/old",
          createdAt: "2026-05-01T00:00:00.000Z"
        })
      ],
      createBackup: async (kind) => ({
        ...backupSummary({
          id: "backup_new",
          relativePath: "backups/new",
          createdAt: "2026-05-13T00:00:00.000Z"
        }),
        kind,
        workspaceId: "workspace_1",
        databaseRelativePath: "backups/new/local-work-os.sqlite",
        manifestRelativePath: "backups/new/attachment-manifest.json",
        databaseSizeBytes: 2048,
        manifest: {
          id: "backup_new",
          kind,
          workspaceId: "workspace_1",
          workspaceName: "Personal",
          createdAt: "2026-05-13T00:00:00.000Z",
          database: {
            sourceRelativePath: "data/local-work-os.sqlite",
            backupRelativePath: "backups/new/local-work-os.sqlite",
            sizeBytes: 2048,
            checksum: "a".repeat(64)
          },
          attachments: [],
          attachmentCount: 0,
          totalAttachmentBytes: 0
        }
      }),
      deleteBackup: async (backup) => {
        deleted.push(backup.relativePath);
      }
    });

    expect(settings.enabled).toBe(true);
    expect(result).toMatchObject({
      due: true,
      skippedReason: null,
      createdBackup: {
        id: "backup_new",
        kind: "automatic"
      },
      status: {
        lastSuccessfulBackupAt: "2026-05-13T00:00:00.000Z",
        lastBackupId: "backup_new",
        lastError: null,
        nextRunAt: "2026-05-14T00:00:00.000Z"
      }
    });
    expect(deleted).toEqual([]);
    expect(service.getStatus("workspace_1")).toMatchObject({
      lastBackupId: "backup_new"
    });
  });

  it("skips interval checks until the fake timer reaches the next due window", async () => {
    const repository = createSettingsRepository();
    let now = new Date("2026-05-13T00:00:00.000Z");
    const service = new BackupSchedulerService({
      appSettingsRepository: repository,
      idFactory: createIdFactory(),
      now: () => now
    });

    await service.updateSettings({
      workspaceId: "workspace_1",
      enabled: true,
      intervalHours: 12
    });
    await service.runAutomaticBackup({
      workspaceId: "workspace_1",
      trigger: "interval",
      backups: [],
      createBackup: async () => automaticSnapshot("backup_first", now),
      deleteBackup: async () => undefined
    });

    now = new Date("2026-05-13T06:00:00.000Z");
    const skipped = await service.runAutomaticBackup({
      workspaceId: "workspace_1",
      trigger: "interval",
      backups: [],
      createBackup: async () => automaticSnapshot("backup_unexpected", now),
      deleteBackup: async () => undefined
    });

    expect(skipped).toMatchObject({
      due: false,
      skippedReason: "Automatic backup interval has not elapsed."
    });

    now = new Date("2026-05-13T12:00:00.000Z");
    const due = await service.runAutomaticBackup({
      workspaceId: "workspace_1",
      trigger: "interval",
      backups: [],
      createBackup: async () => automaticSnapshot("backup_second", now),
      deleteBackup: async () => undefined
    });

    expect(due.createdBackup?.id).toBe("backup_second");
  });

  it("selects only automatic backups for retention by count, age, and size", () => {
    const settings: BackupSchedulerSettings = {
      workspaceId: "workspace_1",
      enabled: true,
      intervalHours: 24,
      runOnAppClose: true,
      runBeforeMigration: true,
      retention: {
        ...DEFAULT_BACKUP_RETENTION_SETTINGS,
        maxCount: 2,
        maxAgeDays: 7,
        maxSizeBytes: 250
      },
      updatedAt: null
    };
    const candidates = selectRetentionDeletionCandidates({
      settings,
      now: new Date("2026-05-13T00:00:00.000Z"),
      backups: [
        backupSummary({
          id: "manual_old",
          kind: "manual",
          relativePath: "backups/manual-old",
          createdAt: "2026-04-01T00:00:00.000Z"
        }),
        backupSummary({
          id: "auto_1",
          relativePath: "backups/auto-1",
          createdAt: "2026-05-13T00:00:00.000Z",
          databaseSizeBytes: 200
        }),
        backupSummary({
          id: "auto_2",
          relativePath: "backups/auto-2",
          createdAt: "2026-05-12T00:00:00.000Z",
          databaseSizeBytes: 200
        }),
        backupSummary({
          id: "auto_3",
          relativePath: "backups/auto-3",
          createdAt: "2026-05-01T00:00:00.000Z"
        })
      ]
    });

    expect(candidates.map((candidate) => candidate.backup.id)).toEqual([
      "auto_3",
      "auto_2"
    ]);
    expect(candidates.map((candidate) => candidate.reason)).toEqual([
      "count",
      "size"
    ]);
  });
});

function createSettingsRepository(): {
  findByKey: (input: {
    workspaceId: string;
    settingKey: string;
  }) => {
    id: string;
    workspaceId: string;
    settingKey: string;
    valueJson: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  upsert: (input: {
    id: string;
    workspaceId: string;
    settingKey: string;
    valueJson: string;
    timestamp: string;
  }) => {
    id: string;
    workspaceId: string;
    settingKey: string;
    valueJson: string;
    createdAt: string;
    updatedAt: string;
  };
} {
  const rows = new Map<
    string,
    {
      id: string;
      workspaceId: string;
      settingKey: string;
      valueJson: string;
      createdAt: string;
      updatedAt: string;
    }
  >();

  return {
    findByKey({ workspaceId, settingKey }) {
      return rows.get(`${workspaceId}:${settingKey}`) ?? null;
    },
    upsert(input) {
      const key = `${input.workspaceId}:${input.settingKey}`;
      const existing = rows.get(key);
      const row = {
        id: existing?.id ?? input.id,
        workspaceId: input.workspaceId,
        settingKey: input.settingKey,
        valueJson: input.valueJson,
        createdAt: existing?.createdAt ?? input.timestamp,
        updatedAt: input.timestamp
      };

      rows.set(key, row);
      return row;
    }
  };
}

function backupSummary(
  input: Partial<BackupSnapshotSummary> & { id: string; relativePath: string }
): BackupSnapshotSummary {
  return {
    workspaceId: "workspace_1",
    createdAt: "2026-05-13T00:00:00.000Z",
    databaseRelativePath: `${input.relativePath}/local-work-os.sqlite`,
    manifestRelativePath: `${input.relativePath}/attachment-manifest.json`,
    attachmentCount: 0,
    totalAttachmentBytes: 0,
    databaseSizeBytes: 100,
    kind: "automatic",
    ...input
  };
}

function automaticSnapshot(id: string, date: Date): ManualBackupSnapshot {
  const createdAt = date.toISOString();
  const relativePath = `backups/${id}`;

  return {
    ...backupSummary({
      id,
      relativePath,
      createdAt
    }),
    workspaceId: "workspace_1",
    databaseRelativePath: `${relativePath}/local-work-os.sqlite`,
    manifestRelativePath: `${relativePath}/attachment-manifest.json`,
    databaseSizeBytes: 100,
    kind: "automatic",
    manifest: {
      id,
      kind: "automatic",
      workspaceId: "workspace_1",
      workspaceName: "Personal",
      createdAt,
      database: {
        sourceRelativePath: "data/local-work-os.sqlite",
        backupRelativePath: `${relativePath}/local-work-os.sqlite`,
        sizeBytes: 100,
        checksum: "a".repeat(64)
      },
      attachments: [],
      attachmentCount: 0,
      totalAttachmentBytes: 0
    }
  };
}

function createIdFactory(): (prefix: string) => string {
  let counter = 0;

  return (prefix) => {
    counter += 1;
    return `${prefix}_${counter}`;
  };
}
