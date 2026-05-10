import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  ATTACHMENT_STORAGE_ROOT,
  createIsoTimestamp,
  createLocalId,
  isContainerMediaRole,
  type ActivityActorType,
  type AttachmentRecord,
  type ContainerMediaRecord,
  type ContainerMediaRole
} from "@local-work-os/core";
import {
  ActivityLogService,
  AttachmentRepository,
  ContainerMediaRepository,
  ContainerRepository,
  ItemRepository,
  SearchIndexService,
  TransactionService,
  type ContainerRecord,
  type DatabaseConnection,
  type ItemRecord
} from "@local-work-os/db";
import type { CopiedAttachmentFileInput } from "../files";

export type ContainerMediaServiceIdFactory = (prefix: string) => string;

export type SetContainerMediaInput = {
  workspaceId: string;
  containerId: string;
  role: ContainerMediaRole;
  copiedFile: CopiedAttachmentFileInput;
  thumbnailStoragePath?: string | null;
  altText?: string | null;
  actorType?: ActivityActorType;
};

export type RemoveContainerMediaInput = {
  containerId: string;
  role: ContainerMediaRole;
  actorType?: ActivityActorType;
};

export type ContainerMediaMutationResult = {
  container: ContainerRecord;
  media: ContainerMediaRecord | null;
  attachment: AttachmentRecord | null;
  item: ItemRecord | null;
  previousMedia: ContainerMediaRecord | null;
};

export class ContainerMediaService {
  readonly module = "containerMedia";
  private readonly transactionService: TransactionService;
  private readonly idFactory: ContainerMediaServiceIdFactory;
  private readonly now: () => Date;

  constructor(private readonly input: { connection: DatabaseConnection; idFactory?: ContainerMediaServiceIdFactory; now?: () => Date }) {
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({ connection: input.connection });
  }

  async setContainerMedia(input: SetContainerMediaInput): Promise<ContainerMediaMutationResult> {
    this.validateSetInput(input);
    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const connection = this.input.connection;
      const container = this.requireContainer(input.containerId, input.workspaceId, input.role);
      const itemRepository = new ItemRepository(connection);
      const attachmentRepository = new AttachmentRepository(connection);
      const mediaRepository = new ContainerMediaRepository(connection);
      const previousMedia = mediaRepository.softDeleteActive(container.id, input.role, timestamp);
      const item = itemRepository.create({
        id: this.idFactory("item"),
        workspaceId: container.workspaceId,
        containerId: container.id,
        type: "file",
        title: input.copiedFile.originalName.trim(),
        body: mediaDescription(input.role),
        timestamp
      });
      const attachment = attachmentRepository.create({
        id: input.copiedFile.attachmentId ?? this.idFactory("attachment"),
        workspaceId: container.workspaceId,
        itemId: item.id,
        originalName: input.copiedFile.originalName.trim(),
        storedName: input.copiedFile.storedName.trim(),
        mimeType: normalizeNullableString(input.copiedFile.mimeType),
        sizeBytes: input.copiedFile.sizeBytes,
        checksum: input.copiedFile.checksum,
        storagePath: input.copiedFile.storagePath,
        description: mediaDescription(input.role),
        timestamp
      });
      const media = mediaRepository.create({
        id: this.idFactory("container_media"),
        workspaceId: container.workspaceId,
        containerId: container.id,
        attachmentId: attachment.id,
        role: input.role,
        thumbnailStoragePath: normalizeNullableString(input.thumbnailStoragePath),
        altText: normalizeNullableString(input.altText),
        timestamp
      });
      new ActivityLogService({ connection, idFactory: this.idFactory }).logEvent({
        workspaceId: container.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerMediaSet,
        targetType: "container",
        targetId: container.id,
        summary: `Set ${mediaLabel(input.role)} for "${container.name}".`,
        beforeJson: previousMedia === null ? null : JSON.stringify(previousMedia),
        afterJson: JSON.stringify({ media, attachment, item }),
        timestamp
      });
      new SearchIndexService({ connection, idFactory: this.idFactory, now: this.now }).upsertAttachment(attachment, { timestamp }, item);
      return { container, media, attachment, item, previousMedia };
    });
  }

  async removeContainerMedia(input: RemoveContainerMediaInput): Promise<ContainerMediaMutationResult> {
    this.validateRole(input.role);
    validateNonEmptyString(input.containerId, "containerId");
    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const connection = this.input.connection;
      const container = this.requireContainer(input.containerId, undefined, input.role);
      const previousMedia = new ContainerMediaRepository(connection).softDeleteActive(container.id, input.role, timestamp);
      new ActivityLogService({ connection, idFactory: this.idFactory }).logEvent({
        workspaceId: container.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.containerMediaRemoved,
        targetType: "container",
        targetId: container.id,
        summary: `Removed ${mediaLabel(input.role)} for "${container.name}".`,
        beforeJson: previousMedia === null ? null : JSON.stringify(previousMedia),
        afterJson: null,
        timestamp
      });
      return { container, media: null, attachment: null, item: null, previousMedia };
    });
  }

  getActiveMedia(containerId: string, role: ContainerMediaRole): ContainerMediaRecord | null {
    validateNonEmptyString(containerId, "containerId");
    this.validateRole(role);
    return new ContainerMediaRepository(this.input.connection).getActiveForContainer(containerId, role);
  }

  getAttachmentForMedia(media: ContainerMediaRecord): AttachmentRecord | null {
    return new AttachmentRepository(this.input.connection).getById(media.attachmentId);
  }

  private requireContainer(containerId: string, workspaceId: string | undefined, role: ContainerMediaRole): ContainerRecord {
    const container = new ContainerRepository(this.input.connection).getById(containerId);
    if (container === null) throw new Error(`Container was not found: ${containerId}.`);
    if (workspaceId !== undefined && container.workspaceId !== workspaceId) throw new Error("Container workspace does not match input workspaceId.");
    if (role === "project_banner" && container.type !== "project") throw new Error("Project banner media can only be assigned to project containers.");
    if (role === "contact_avatar" && container.type !== "contact") throw new Error("Contact avatar media can only be assigned to contact containers.");
    return container;
  }

  private validateSetInput(input: SetContainerMediaInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");
    this.validateRole(input.role);
    validateCopiedFile(input.copiedFile);
    if (input.thumbnailStoragePath !== undefined && input.thumbnailStoragePath !== null) validateAttachmentStoragePath(input.thumbnailStoragePath);
  }

  private validateRole(role: string): asserts role is ContainerMediaRole {
    if (!isContainerMediaRole(role)) throw new Error("role must be project_banner or contact_avatar.");
  }
}

export const containerMediaModuleContract = {
  module: "containerMedia",
  purpose: "Assign local attachment-backed visual media to project and contact containers.",
  owns: ["project banner assignment", "contact avatar assignment", "container media metadata"],
  doesNotOwn: ["renderer filesystem access", "cloud media hosting", "proprietary visual assets"],
  integrationPoints: ["files", "activity log", "Electron main/preload IPC", "projects", "contacts"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function validateCopiedFile(input: CopiedAttachmentFileInput): void {
  validateNonEmptyString(input.originalName, "originalName");
  validateNonEmptyString(input.storedName, "storedName");
  validateNonEmptyString(input.storagePath, "storagePath");
  validateNonEmptyString(input.checksum, "checksum");
  validateAttachmentStoragePath(input.storagePath);
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 0) throw new Error("sizeBytes must be a non-negative integer.");
}
function validateAttachmentStoragePath(storagePath: string): void {
  const trimmed = storagePath.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("\\") || /^[a-zA-Z]:/.test(trimmed)) throw new Error("storagePath must be workspace-relative.");
  const segments = trimmed.replace(/\\/g, "/").split("/");
  if (segments[0] !== ATTACHMENT_STORAGE_ROOT || segments.some((s) => s.length === 0 || s === "." || s === "..")) throw new Error("storagePath must stay inside workspace attachments.");
}
function validateNonEmptyString(value: string, fieldName: string): void { if (value.trim().length === 0) throw new Error(`${fieldName} must be a non-empty string.`); }
function normalizeNullableString(value: string | null | undefined): string | null { if (value === undefined || value === null) return null; const t = value.trim(); return t.length === 0 ? null : t; }
function mediaLabel(role: ContainerMediaRole): string { return role === "project_banner" ? "project banner" : "contact avatar"; }
function mediaDescription(role: ContainerMediaRole): string { return role === "project_banner" ? "Project banner image" : "Contact avatar photo"; }
