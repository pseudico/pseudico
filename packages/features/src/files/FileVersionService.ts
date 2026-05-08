import type {
  ActivityActorType,
  AttachmentRecord,
  AttachmentVersionRecord
} from "@local-work-os/core";
import {
  ActivityAction,
  ATTACHMENT_STORAGE_ROOT,
  createIsoTimestamp,
  createLocalId
} from "@local-work-os/core";
import {
  ActivityLogService,
  AttachmentRepository,
  AttachmentVersionRepository,
  SearchIndexService,
  TransactionService,
  type DatabaseConnection,
  type SearchIndexRecord
} from "@local-work-os/db";

export type FileVersionServiceIdFactory = (prefix: string) => string;

export type CopiedAttachmentVersionFileInput = {
  originalName: string;
  storedName: string;
  storagePath: string;
  sizeBytes: number;
  checksum: string;
};

export type CreateFileSnapshotInput = {
  attachmentId: string;
  versionFile: CopiedAttachmentVersionFileInput;
  note?: string | null;
  actorType?: ActivityActorType;
};

export type RestoreFileVersionInput = {
  versionId: string;
  restoredFile: {
    sizeBytes: number;
    checksum: string;
  };
  actorType?: ActivityActorType;
};

export type FileVersionMutationResult = {
  attachment: AttachmentRecord;
  version: AttachmentVersionRecord;
  attachmentSearchRecord: SearchIndexRecord;
};

export class FileVersionService {
  readonly module = "files";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: FileVersionServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: FileVersionServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  getNextVersionNumber(attachmentId: string): number {
    validateNonEmptyString(attachmentId, "attachmentId");
    this.assertAttachmentExists(attachmentId);

    return (
      new AttachmentVersionRepository(this.connection).getLatestVersionNumber(
        attachmentId
      ) + 1
    );
  }

  listFileVersions(attachmentId: string): AttachmentVersionRecord[] {
    validateNonEmptyString(attachmentId, "attachmentId");
    this.assertAttachmentExists(attachmentId);

    return new AttachmentVersionRepository(this.connection).listForAttachment(
      attachmentId
    );
  }

  getFileVersion(versionId: string): AttachmentVersionRecord | null {
    validateNonEmptyString(versionId, "versionId");

    return new AttachmentVersionRepository(this.connection).getById(versionId);
  }

  async createFileSnapshot(
    input: CreateFileSnapshotInput
  ): Promise<FileVersionMutationResult> {
    this.validateCreateFileSnapshotInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const attachmentRepository = new AttachmentRepository(this.connection);
      const attachment = attachmentRepository.getById(input.attachmentId);

      if (attachment === null) {
        throw new Error(`Attachment was not found: ${input.attachmentId}.`);
      }

      const versionRepository = new AttachmentVersionRepository(this.connection);
      const versionNumber =
        versionRepository.getLatestVersionNumber(attachment.id) + 1;
      const version = versionRepository.create({
        id: this.idFactory("attachment_version"),
        workspaceId: attachment.workspaceId,
        attachmentId: attachment.id,
        versionNumber,
        originalName: input.versionFile.originalName.trim(),
        storedName: input.versionFile.storedName.trim(),
        sizeBytes: input.versionFile.sizeBytes,
        checksum: input.versionFile.checksum,
        storagePath: input.versionFile.storagePath,
        note: normalizeNullableString(input.note),
        timestamp
      });

      this.logFileVersionCreated({
        attachment,
        version,
        actorType: input.actorType,
        timestamp
      });

      return {
        attachment,
        version,
        attachmentSearchRecord: this.upsertAttachmentSearchRecord({
          attachment,
          timestamp
        })
      };
    });
  }

  async restoreFileVersion(
    input: RestoreFileVersionInput
  ): Promise<FileVersionMutationResult> {
    this.validateRestoreFileVersionInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const versionRepository = new AttachmentVersionRepository(this.connection);
      const version = versionRepository.getById(input.versionId);

      if (version === null) {
        throw new Error(`Attachment version was not found: ${input.versionId}.`);
      }

      const attachmentRepository = new AttachmentRepository(this.connection);
      const beforeAttachment = attachmentRepository.getById(version.attachmentId);

      if (beforeAttachment === null) {
        throw new Error(`Attachment was not found: ${version.attachmentId}.`);
      }

      const attachment = attachmentRepository.updateStorageMetadata(
        beforeAttachment.id,
        {
          checksum: input.restoredFile.checksum,
          sizeBytes: input.restoredFile.sizeBytes,
          timestamp
        }
      );

      this.logFileVersionRestored({
        beforeAttachment,
        attachment,
        version,
        actorType: input.actorType,
        timestamp
      });

      return {
        attachment,
        version,
        attachmentSearchRecord: this.upsertAttachmentSearchRecord({
          attachment,
          timestamp
        })
      };
    });
  }

  private assertAttachmentExists(attachmentId: string): AttachmentRecord {
    const attachment = new AttachmentRepository(this.connection).getById(
      attachmentId
    );

    if (attachment === null) {
      throw new Error(`Attachment was not found: ${attachmentId}.`);
    }

    return attachment;
  }

  private logFileVersionCreated(input: {
    attachment: AttachmentRecord;
    version: AttachmentVersionRecord;
    actorType: ActivityActorType | undefined;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.attachment.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.fileVersionCreated,
      targetType: "attachment",
      targetId: input.attachment.id,
      summary: `Created version ${input.version.versionNumber} of "${input.attachment.originalName}".`,
      beforeJson: JSON.stringify(input.attachment),
      afterJson: JSON.stringify(input.version),
      timestamp: input.timestamp
    });
  }

  private logFileVersionRestored(input: {
    beforeAttachment: AttachmentRecord;
    attachment: AttachmentRecord;
    version: AttachmentVersionRecord;
    actorType: ActivityActorType | undefined;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.attachment.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.fileVersionRestored,
      targetType: "attachment",
      targetId: input.attachment.id,
      summary: `Restored version ${input.version.versionNumber} of "${input.attachment.originalName}".`,
      beforeJson: JSON.stringify({
        attachment: input.beforeAttachment,
        restoredFromVersion: input.version
      }),
      afterJson: JSON.stringify({
        attachment: input.attachment,
        restoredFromVersion: input.version
      }),
      timestamp: input.timestamp
    });
  }

  private upsertAttachmentSearchRecord(input: {
    attachment: AttachmentRecord;
    timestamp: string;
  }): SearchIndexRecord {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertAttachment(input.attachment, { timestamp: input.timestamp });
  }

  private validateCreateFileSnapshotInput(
    input: CreateFileSnapshotInput
  ): void {
    validateNonEmptyString(input.attachmentId, "attachmentId");
    validateVersionFile(input.versionFile);
  }

  private validateRestoreFileVersionInput(
    input: RestoreFileVersionInput
  ): void {
    validateNonEmptyString(input.versionId, "versionId");
    validateChecksum(input.restoredFile.checksum);

    if (
      !Number.isInteger(input.restoredFile.sizeBytes) ||
      input.restoredFile.sizeBytes < 0
    ) {
      throw new Error("sizeBytes must be a non-negative integer.");
    }
  }
}

function validateVersionFile(input: CopiedAttachmentVersionFileInput): void {
  validateNonEmptyString(input.originalName, "originalName");
  validateNonEmptyString(input.storedName, "storedName");
  validateNonEmptyString(input.storagePath, "storagePath");
  validateChecksum(input.checksum);
  validateAttachmentStoragePath(input.storagePath);

  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 0) {
    throw new Error("sizeBytes must be a non-negative integer.");
  }

  if (!input.storagePath.replace(/\\/g, "/").includes("/versions/")) {
    throw new Error("storagePath must point to an attachment version path.");
  }
}

function validateChecksum(value: string): void {
  validateNonEmptyString(value, "checksum");
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function validateAttachmentStoragePath(storagePath: string): void {
  const trimmed = storagePath.trim();

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("\\") ||
    /^[a-zA-Z]:/.test(trimmed)
  ) {
    throw new Error("storagePath must be workspace-relative.");
  }

  const segments = trimmed.replace(/\\/g, "/").split("/");

  if (
    segments[0] !== ATTACHMENT_STORAGE_ROOT ||
    segments.some(
      (segment) =>
        segment.length === 0 || segment === "." || segment === ".."
    )
  ) {
    throw new Error("storagePath must stay inside workspace attachments.");
  }
}

function normalizeNullableString(
  value: string | null | undefined
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
