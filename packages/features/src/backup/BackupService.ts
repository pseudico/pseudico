import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType,
  type AttachmentRecord
} from "@local-work-os/core";
import {
  ActivityLogService,
  AttachmentRepository,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  createBackupManifest,
  type BackupManifest,
  type BackupManifestAttachment
} from "./BackupManifest";

// Owns backup orchestration application contracts.
// Does not own renderer filesystem access or migration implementation.
export type BackupServiceIdFactory = (prefix: string) => string;

export type ManualBackupSnapshot = {
  id: string;
  workspaceId: string;
  createdAt: string;
  relativePath: string;
  databaseRelativePath: string;
  manifestRelativePath: string;
  attachmentCount: number;
  totalAttachmentBytes: number;
  databaseSizeBytes: number;
  manifest: BackupManifest;
};

export type BackupSnapshotSummary = {
  id: string;
  workspaceId: string;
  createdAt: string;
  relativePath: string;
  databaseRelativePath: string | null;
  manifestRelativePath: string | null;
  attachmentCount: number;
  totalAttachmentBytes: number;
  databaseSizeBytes: number | null;
};

export type CreateManualBackupInput = {
  workspaceId: string;
  workspaceName: string;
  databaseRelativePath: string;
  backupRelativePath: string;
  backupDatabaseRelativePath: string;
  manifestRelativePath: string;
  actorType?: ActivityActorType;
};

export type BackupFileSystemAdapter = {
  copyDatabase: (input: {
    sourceRelativePath: string;
    destinationRelativePath: string;
  }) => Promise<{ sizeBytes: number }>;
  writeManifest: (input: {
    manifestRelativePath: string;
    manifest: BackupManifest;
  }) => Promise<void>;
};

export type ListBackupsInput = {
  workspaceId: string;
  backups: BackupSnapshotSummary[];
};

export class BackupService {
  readonly module = "backup";

  private readonly connection: DatabaseConnection;
  private readonly fileSystem: BackupFileSystemAdapter;
  private readonly idFactory: BackupServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    fileSystem: BackupFileSystemAdapter;
    idFactory?: BackupServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.fileSystem = input.fileSystem;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  async createManualBackup(
    input: CreateManualBackupInput
  ): Promise<ManualBackupSnapshot> {
    this.validateCreateManualBackupInput(input);

    const timestamp = createIsoTimestamp(this.now());
    const attachments = new AttachmentRepository(
      this.connection
    ).listByWorkspace({
      workspaceId: input.workspaceId
    });
    const copiedDatabase = await this.fileSystem.copyDatabase({
      sourceRelativePath: input.databaseRelativePath,
      destinationRelativePath: input.backupDatabaseRelativePath
    });
    const manifest = createBackupManifest({
      id: this.idFactory("backup"),
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
      createdAt: timestamp,
      database: {
        sourceRelativePath: input.databaseRelativePath,
        backupRelativePath: input.backupDatabaseRelativePath,
        sizeBytes: copiedDatabase.sizeBytes
      },
      attachments: attachments.map(toBackupManifestAttachment)
    });

    await this.fileSystem.writeManifest({
      manifestRelativePath: input.manifestRelativePath,
      manifest
    });

    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.backupCreated,
      targetType: "backup",
      targetId: manifest.id,
      summary: `Created manual backup ${input.backupRelativePath}.`,
      beforeJson: null,
      afterJson: JSON.stringify({
        backup: {
          id: manifest.id,
          relativePath: input.backupRelativePath,
          databaseRelativePath: input.backupDatabaseRelativePath,
          manifestRelativePath: input.manifestRelativePath,
          databaseSizeBytes: copiedDatabase.sizeBytes,
          attachmentCount: manifest.attachments.length,
          totalAttachmentBytes: manifest.totalAttachmentBytes
        }
      }),
      timestamp
    });

    return {
      id: manifest.id,
      workspaceId: input.workspaceId,
      createdAt: timestamp,
      relativePath: input.backupRelativePath,
      databaseRelativePath: input.backupDatabaseRelativePath,
      manifestRelativePath: input.manifestRelativePath,
      attachmentCount: manifest.attachments.length,
      totalAttachmentBytes: manifest.totalAttachmentBytes,
      databaseSizeBytes: copiedDatabase.sizeBytes,
      manifest
    };
  }

  listBackups(input: ListBackupsInput): BackupSnapshotSummary[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    return input.backups
      .filter((backup) => backup.workspaceId === input.workspaceId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  private validateCreateManualBackupInput(
    input: CreateManualBackupInput
  ): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.workspaceName, "workspaceName");
    validateRelativeWorkspacePath(input.databaseRelativePath, "databaseRelativePath");
    validateBackupRelativePath(input.backupRelativePath, "backupRelativePath");
    validateBackupRelativePath(
      input.backupDatabaseRelativePath,
      "backupDatabaseRelativePath"
    );
    validateBackupRelativePath(input.manifestRelativePath, "manifestRelativePath");
  }
}

export const backupModuleContract = {
  module: "backup",
  purpose: "Coordinate local backup snapshots, integrity checks, and backup-before-migration flows.",
  owns: ["backup orchestration", "backup integrity reports", "backup-before-migration coordination"],
  doesNotOwn: ["renderer filesystem access", "export formats", "database migrations"],
  integrationPoints: ["workspace", "files", "database services", "Electron main/preload IPC"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function toBackupManifestAttachment(
  attachment: AttachmentRecord
): BackupManifestAttachment {
  return {
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
  };
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function validateRelativeWorkspacePath(value: string, fieldName: string): void {
  validateNonEmptyString(value, fieldName);

  const normalized = value.replace(/\\/g, "/");

  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`${fieldName} must be workspace-relative.`);
  }
}

function validateBackupRelativePath(value: string, fieldName: string): void {
  validateRelativeWorkspacePath(value, fieldName);

  if (!value.replace(/\\/g, "/").startsWith("backups/")) {
    throw new Error(`${fieldName} must stay inside workspace backups.`);
  }
}
