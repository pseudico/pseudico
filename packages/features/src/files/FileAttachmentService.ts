import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  ATTACHMENT_STORAGE_ROOT,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType,
  type AttachmentRecord
} from "@local-work-os/core";
import {
  ActivityLogService,
  AttachmentRepository,
  ItemRepository,
  SearchIndexRepository,
  SearchIndexService,
  SortOrderService,
  TransactionService,
  type DatabaseConnection,
  type ItemRecord,
  type SearchIndexRecord
} from "@local-work-os/db";

// Owns file item and attachment application operations.
// Does not own direct renderer filesystem access.
export type FileAttachmentServiceIdFactory = (prefix: string) => string;

export type CopiedAttachmentFileInput = {
  attachmentId?: string;
  originalName: string;
  storedName: string;
  storagePath: string;
  sizeBytes: number;
  checksum: string;
  mimeType?: string | null;
};

export type AttachFileToContainerInput = {
  workspaceId: string;
  containerId: string;
  copiedFile: CopiedAttachmentFileInput;
  actorType?: ActivityActorType;
  containerTabId?: string | null;
  description?: string | null;
  sortOrder?: number;
};

export type AttachFileToItemInput = {
  itemId: string;
  copiedFile: CopiedAttachmentFileInput;
  actorType?: ActivityActorType;
  description?: string | null;
};

export type FileAttachmentMutationResult = {
  item: ItemRecord;
  attachment: AttachmentRecord;
  itemSearchRecord: SearchIndexRecord;
  attachmentSearchRecord: SearchIndexRecord;
};

export class FileAttachmentService {
  readonly module = "files";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: FileAttachmentServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: FileAttachmentServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async attachFileToContainer(
    input: AttachFileToContainerInput
  ): Promise<FileAttachmentMutationResult> {
    this.validateAttachFileToContainerInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const itemRepository = new ItemRepository(this.connection);
      const sortOrderService = new SortOrderService({
        connection: this.connection
      });
      const item = itemRepository.create({
        id: this.idFactory("item"),
        workspaceId: input.workspaceId,
        containerId: input.containerId,
        containerTabId: input.containerTabId ?? null,
        type: "file",
        title: input.copiedFile.originalName.trim(),
        body: normalizeNullableString(input.description),
        sortOrder:
          input.sortOrder ??
          sortOrderService.getNextItemSortOrder({
            containerId: input.containerId,
            containerTabId: input.containerTabId ?? null
          }),
        timestamp
      });
      const attachment = this.createAttachment({
        item,
        copiedFile: input.copiedFile,
        description: input.description,
        timestamp
      });

      this.logFileAttached({
        item,
        attachment,
        actorType: input.actorType,
        timestamp
      });

      const itemSearchRecord = this.upsertItemSearchRecord({
        item,
        attachment,
        timestamp
      });
      const attachmentSearchRecord = this.upsertAttachmentSearchRecord({
        attachment,
        item,
        timestamp
      });

      return {
        item,
        attachment,
        itemSearchRecord,
        attachmentSearchRecord
      };
    });
  }

  async attachFileToItem(
    input: AttachFileToItemInput
  ): Promise<FileAttachmentMutationResult> {
    this.validateAttachFileToItemInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const item = new ItemRepository(this.connection).getById(input.itemId);

      if (item === null) {
        throw new Error(`Item was not found: ${input.itemId}.`);
      }

      const attachment = this.createAttachment({
        item,
        copiedFile: input.copiedFile,
        description: input.description,
        timestamp
      });

      this.logFileAttached({
        item,
        attachment,
        actorType: input.actorType,
        timestamp
      });

      const itemSearchRecord = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).upsertItem(item, { timestamp });
      const attachmentSearchRecord = this.upsertAttachmentSearchRecord({
        attachment,
        item,
        timestamp
      });

      return {
        item,
        attachment,
        itemSearchRecord,
        attachmentSearchRecord
      };
    });
  }

  listAttachmentsForItem(input: {
    workspaceId: string;
    itemId: string;
  }): AttachmentRecord[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.itemId, "itemId");

    return new AttachmentRepository(this.connection).listForItem(input);
  }

  private createAttachment(input: {
    item: ItemRecord;
    copiedFile: CopiedAttachmentFileInput;
    description: string | null | undefined;
    timestamp: string;
  }): AttachmentRecord {
    return new AttachmentRepository(this.connection).create({
      id: input.copiedFile.attachmentId ?? this.idFactory("attachment"),
      workspaceId: input.item.workspaceId,
      itemId: input.item.id,
      originalName: input.copiedFile.originalName.trim(),
      storedName: input.copiedFile.storedName.trim(),
      mimeType: normalizeNullableString(input.copiedFile.mimeType),
      sizeBytes: input.copiedFile.sizeBytes,
      checksum: input.copiedFile.checksum,
      storagePath: input.copiedFile.storagePath,
      description: normalizeNullableString(input.description),
      timestamp: input.timestamp
    });
  }

  private logFileAttached(input: {
    item: ItemRecord;
    attachment: AttachmentRecord;
    actorType: ActivityActorType | undefined;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.item.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.fileAttached,
      targetType: "attachment",
      targetId: input.attachment.id,
      summary: `Attached file "${input.attachment.originalName}".`,
      beforeJson: null,
      afterJson: JSON.stringify({
        item: input.item,
        attachment: input.attachment
      }),
      timestamp: input.timestamp
    });
  }

  private upsertItemSearchRecord(input: {
    item: ItemRecord;
    attachment: AttachmentRecord;
    timestamp: string;
  }): SearchIndexRecord {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertItem(input.item, {
      timestamp: input.timestamp,
      metadata: createAttachmentMetadata(input.attachment)
    });
  }

  private upsertAttachmentSearchRecord(input: {
    attachment: AttachmentRecord;
    item: ItemRecord;
    timestamp: string;
  }): SearchIndexRecord {
    return new SearchIndexRepository(this.connection).upsert({
      id: this.idFactory("search"),
      workspaceId: input.attachment.workspaceId,
      targetType: "attachment",
      targetId: input.attachment.id,
      title: input.attachment.originalName,
      body: [
        input.attachment.description ?? "",
        input.attachment.storedName,
        input.attachment.storagePath,
        input.attachment.checksum ?? ""
      ]
        .map((value) => value.trim())
        .filter(Boolean)
        .join("\n"),
      metadataJson: JSON.stringify({
        ...createAttachmentMetadata(input.attachment),
        itemId: input.item.id,
        containerId: input.item.containerId
      }),
      timestamp: input.timestamp
    });
  }

  private validateAttachFileToContainerInput(
    input: AttachFileToContainerInput
  ): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");
    this.validateCopiedFile(input.copiedFile);
  }

  private validateAttachFileToItemInput(input: AttachFileToItemInput): void {
    validateNonEmptyString(input.itemId, "itemId");
    this.validateCopiedFile(input.copiedFile);
  }

  private validateCopiedFile(input: CopiedAttachmentFileInput): void {
    validateNonEmptyString(input.originalName, "originalName");
    validateNonEmptyString(input.storedName, "storedName");
    validateNonEmptyString(input.storagePath, "storagePath");
    validateNonEmptyString(input.checksum, "checksum");
    validateAttachmentStoragePath(input.storagePath);

    if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 0) {
      throw new Error("sizeBytes must be a non-negative integer.");
    }
  }
}

export const filesModuleContract = {
  module: "files",
  purpose: "Manage local attachment item behavior and attachment metadata workflows.",
  owns: ["file item operations", "attachment metadata contracts", "missing-file behavior"],
  doesNotOwn: ["direct renderer filesystem access", "arbitrary path access", "backup implementation"],
  integrationPoints: ["Electron main/preload IPC", "workspace", "search", "backup", "export"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function createAttachmentMetadata(
  attachment: AttachmentRecord
): Record<string, unknown> {
  return {
    attachmentId: attachment.id,
    originalName: attachment.originalName,
    storedName: attachment.storedName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    checksum: attachment.checksum,
    storagePath: attachment.storagePath,
    deletedAt: attachment.deletedAt
  };
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
