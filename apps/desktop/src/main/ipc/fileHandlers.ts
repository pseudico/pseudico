import {
  createLocalId,
  isSafeLocalFilePath,
  type AttachmentRecord,
  type AttachmentVersionRecord
} from "@local-work-os/core";
import { nativeImage } from "electron";
import { readFile } from "node:fs/promises";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type ItemRecord
} from "@local-work-os/db";
import {
  AttachmentPreviewService,
  FileAttachmentService,
  FileVersionService
} from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type AttachFileToContainerInput,
  type AttachmentPreviewSummary,
  type AttachFileToItemInput,
  type ChooseAndAttachFileInput,
  type FileAttachmentResultSummary,
  type FileItemSummary,
  type FileAttachmentSummary,
  type AttachmentVersionSummary,
  type CreateFileSnapshotInput,
  type FileVersionMutationSummary,
  type ItemSummary,
  type OpenFileVersionSummary,
  type OpenAttachmentSummary,
  type RestoreFileVersionInput,
  type UpdateFileMetadataInput,
  type VerifyAttachmentSummary,
  type WorkspaceSummary
} from "../../preload/api";
import {
  createAttachmentVersionSnapshot,
  createAttachmentPreviewCacheRelativePath,
  copyFileIntoWorkspace,
  restoreAttachmentFileFromVersion,
  localPathExists,
  resolveInsideWorkspace,
  writeBinaryFileInsideWorkspace,
  type CopiedWorkspaceFile
} from "../services/safeFileSystem";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type FileIpcHandlers = {
  handleAttachFileToContainer: (
    input: unknown
  ) => Promise<ApiResult<FileAttachmentResultSummary>>;
  handleAttachFileToItem: (
    input: unknown
  ) => Promise<ApiResult<FileAttachmentResultSummary>>;
  handleChooseAndAttach: (
    input: unknown
  ) => Promise<ApiResult<FileAttachmentResultSummary | null>>;
  handleListFilesByContainer: (
    input: unknown
  ) => Promise<ApiResult<FileItemSummary[]>>;
  handleOpenAttachment: (
    input: unknown
  ) => Promise<ApiResult<OpenAttachmentSummary>>;
  handleRevealAttachment: (
    input: unknown
  ) => Promise<ApiResult<OpenAttachmentSummary>>;
  handleUpdateMetadata: (
    input: unknown
  ) => Promise<ApiResult<FileAttachmentResultSummary>>;
  handleVerifyAttachment: (
    input: unknown
  ) => Promise<ApiResult<VerifyAttachmentSummary>>;
  handleCreateFileSnapshot: (
    input: unknown
  ) => Promise<ApiResult<FileVersionMutationSummary>>;
  handleListFileVersions: (
    input: unknown
  ) => Promise<ApiResult<AttachmentVersionSummary[]>>;
  handleOpenFileVersion: (
    input: unknown
  ) => Promise<ApiResult<OpenFileVersionSummary>>;
  handleRestoreFileVersion: (
    input: unknown
  ) => Promise<ApiResult<FileVersionMutationSummary>>;
};

export type FileIpcPlatform = {
  chooseSourcePath: () => Promise<string | null>;
  openPath: (path: string) => Promise<string>;
  revealPath: (path: string) => void;
};

export function createFileIpcHandlers(
  workspaceService: CurrentWorkspaceService,
  platform: FileIpcPlatform = {
    chooseSourcePath: async () => null,
    openPath: async () => "",
    revealPath: () => undefined
  }
): FileIpcHandlers {
  return {
    async handleAttachFileToContainer(input) {
      if (!isAttachFileToContainerInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "attachFileToContainer requires containerId and sourcePath strings."
        );
      }

      const request = input;

      return await withFileAttachmentService(
        workspaceService,
        async (context) => {
          const workspaceId = request.workspaceId ?? context.workspace.id;

          if (workspaceId !== context.workspace.id) {
            return apiError(
              "WORKSPACE_ERROR",
              "Attachment workspaceId must match the current workspace."
            );
          }

          const copiedFile = await copySourceIntoWorkspace(context.workspace);
          const result = await context.fileAttachmentService.attachFileToContainer({
            workspaceId,
            containerId: request.containerId,
            copiedFile,
            ...(request.actorType === undefined ? {} : { actorType: request.actorType }),
            ...(request.containerTabId === undefined
              ? {}
              : { containerTabId: request.containerTabId }),
            ...(request.description === undefined
              ? {}
              : { description: request.description }),
            ...(request.sortOrder === undefined ? {} : { sortOrder: request.sortOrder })
          });

          return apiOk(toFileAttachmentResultSummary(result));

          async function copySourceIntoWorkspace(
            workspace: WorkspaceSummary
          ): Promise<CopiedWorkspaceFile> {
            return await copyFileIntoWorkspace({
              workspaceRootPath: workspace.rootPath,
              sourcePath: request.sourcePath,
              attachmentId: createLocalId("attachment")
            });
          }
        }
      );
    },

    async handleAttachFileToItem(input) {
      if (!isAttachFileToItemInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "attachFileToItem requires itemId and sourcePath strings."
        );
      }

      return await withFileAttachmentService(
        workspaceService,
        async (context) => {
          const copiedFile = await copyFileIntoWorkspace({
            workspaceRootPath: context.workspace.rootPath,
            sourcePath: input.sourcePath,
            attachmentId: createLocalId("attachment")
          });
          const result = await context.fileAttachmentService.attachFileToItem({
            itemId: input.itemId,
            copiedFile,
            ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
            ...(input.description === undefined
              ? {}
              : { description: input.description })
          });

          return apiOk(toFileAttachmentResultSummary(result));
        }
      );
    },

    async handleChooseAndAttach(input) {
      if (!isChooseAndAttachFileInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "chooseAndAttach requires a containerId string."
        );
      }

      const sourcePath = await platform.chooseSourcePath();

      if (sourcePath === null) {
        return apiOk(null);
      }

      return await this.handleAttachFileToContainer({
        ...input,
        sourcePath
      });
    },

    async handleListFilesByContainer(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listByContainer requires a containerId string."
        );
      }

      return await withFileServices(
        workspaceService,
        async (context) => {
          const entries = context.fileAttachmentService.listFileItemsByContainer({
            containerId: input
          });
          const files = await Promise.all(
            entries.map(async ({ item, attachment }) => {
              const missing = !(await attachmentExists(
                context.workspace,
                attachment
              ));
              const versions =
                context.fileVersionService.listFileVersions(attachment.id);

              return {
                ...toItemSummary(item),
                type: "file" as const,
                attachment: toFileAttachmentSummary(attachment),
                missing,
                preview: await createAttachmentPreviewSummary({
                  workspace: context.workspace,
                  attachment,
                  missing,
                  versionCount: versions.length,
                  latestVersionNumber:
                    versions.length > 0 ? versions[0]?.versionNumber ?? null : null
                })
              };
            })
          );

          return apiOk(files);
        }
      );
    },

    async handleOpenAttachment(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "openAttachment requires an attachmentId string."
        );
      }

      return await withResolvedAttachment(
        workspaceService,
        input,
        async (context) => {
          if (!(await localPathExists(context.localPath))) {
            return apiError("WORKSPACE_ERROR", "Attachment file is missing.");
          }

          const error = await platform.openPath(context.localPath);

          if (error.trim().length > 0) {
            return apiError("WORKSPACE_ERROR", error);
          }

          return apiOk(toVerifyAttachmentSummary(context, true));
        }
      );
    },

    async handleRevealAttachment(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "revealAttachment requires an attachmentId string."
        );
      }

      return await withResolvedAttachment(
        workspaceService,
        input,
        async (context) => {
          if (!(await localPathExists(context.localPath))) {
            return apiError("WORKSPACE_ERROR", "Attachment file is missing.");
          }

          platform.revealPath(context.localPath);

          return apiOk(toVerifyAttachmentSummary(context, true));
        }
      );
    },

    async handleUpdateMetadata(input) {
      if (!isUpdateFileMetadataInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateMetadata requires attachmentId plus title or description."
        );
      }

      return await withFileAttachmentService(
        workspaceService,
        async (context) => {
          const result = await context.fileAttachmentService.updateMetadata(input);
          return apiOk(toFileAttachmentResultSummary(result));
        }
      );
    },

    async handleVerifyAttachment(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "verifyAttachment requires an attachmentId string."
        );
      }

      return await withResolvedAttachment(
        workspaceService,
        input,
        async (context) =>
          apiOk(
            toVerifyAttachmentSummary(
              context,
              await localPathExists(context.localPath)
            )
          )
      );
    },

    async handleCreateFileSnapshot(input) {
      if (!isCreateFileSnapshotInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createFileSnapshot requires an attachmentId string."
        );
      }

      return await withFileServices(workspaceService, async (context) => {
        const attachment = context.fileAttachmentService.getAttachmentById(
          input.attachmentId
        );

        if (attachment === null) {
          return apiError("WORKSPACE_ERROR", "Attachment was not found.");
        }

        const versionNumber =
          context.fileVersionService.getNextVersionNumber(attachment.id);
        const versionFile = await createAttachmentVersionSnapshot({
          workspaceRootPath: context.workspace.rootPath,
          attachmentStoragePath: attachment.storagePath,
          originalName: attachment.originalName,
          storedName: attachment.storedName,
          versionNumber
        });
        const result = await context.fileVersionService.createFileSnapshot({
          attachmentId: attachment.id,
          versionFile,
          ...(input.note === undefined ? {} : { note: input.note }),
          ...(input.actorType === undefined ? {} : { actorType: input.actorType })
        });

        return apiOk(toFileVersionMutationSummary(result));
      });
    },

    async handleListFileVersions(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listFileVersions requires an attachmentId string."
        );
      }

      return await withFileServices(workspaceService, async (context) =>
        apiOk(
          context.fileVersionService
            .listFileVersions(input)
            .map(toAttachmentVersionSummary)
        )
      );
    },

    async handleOpenFileVersion(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "openFileVersion requires a versionId string."
        );
      }

      return await withResolvedFileVersion(
        workspaceService,
        input,
        async (context) => {
          if (!(await localPathExists(context.localPath))) {
            return apiError("WORKSPACE_ERROR", "Attachment version file is missing.");
          }

          const error = await platform.openPath(context.localPath);

          if (error.trim().length > 0) {
            return apiError("WORKSPACE_ERROR", error);
          }

          return apiOk(toOpenFileVersionSummary(context.version, true));
        }
      );
    },

    async handleRestoreFileVersion(input) {
      if (!isRestoreFileVersionInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "restoreFileVersion requires a versionId string."
        );
      }

      return await withFileServices(workspaceService, async (context) => {
        const version = context.fileVersionService.getFileVersion(input.versionId);

        if (version === null) {
          return apiError("WORKSPACE_ERROR", "Attachment version was not found.");
        }

        const attachment = context.fileAttachmentService.getAttachmentById(
          version.attachmentId
        );

        if (attachment === null) {
          return apiError("WORKSPACE_ERROR", "Attachment was not found.");
        }

        const backupVersionNumber =
          context.fileVersionService.getNextVersionNumber(attachment.id);
        const backupVersionFile = await createAttachmentVersionSnapshot({
          workspaceRootPath: context.workspace.rootPath,
          attachmentStoragePath: attachment.storagePath,
          originalName: attachment.originalName,
          storedName: attachment.storedName,
          versionNumber: backupVersionNumber
        });
        await context.fileVersionService.createFileSnapshot({
          attachmentId: attachment.id,
          versionFile: backupVersionFile,
          note: `Automatic safety snapshot before restoring version ${version.versionNumber}.`,
          ...(input.actorType === undefined ? {} : { actorType: input.actorType })
        });
        const restoredFile = await restoreAttachmentFileFromVersion({
          workspaceRootPath: context.workspace.rootPath,
          attachmentStoragePath: attachment.storagePath,
          versionStoragePath: version.storagePath
        });
        const result = await context.fileVersionService.restoreFileVersion({
          versionId: version.id,
          restoredFile,
          ...(input.actorType === undefined ? {} : { actorType: input.actorType })
        });

        return apiOk(toFileVersionMutationSummary(result));
      });
    }
  };
}

async function withFileAttachmentService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    fileAttachmentService: FileAttachmentService;
    workspace: WorkspaceSummary;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiError("WORKSPACE_ERROR", "No workspace is open.");
  }

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
    fileMustExist: true
  });

  try {
    return await operation({
      connection,
      fileAttachmentService: new FileAttachmentService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "File attachment failed."
    );
  } finally {
    connection.close();
  }
}

async function withFileServices<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    fileAttachmentService: FileAttachmentService;
    fileVersionService: FileVersionService;
    workspace: WorkspaceSummary;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiError("WORKSPACE_ERROR", "No workspace is open.");
  }

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
    fileMustExist: true
  });

  try {
    return await operation({
      connection,
      fileAttachmentService: new FileAttachmentService({ connection }),
      fileVersionService: new FileVersionService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "File version operation failed."
    );
  } finally {
    connection.close();
  }
}

async function withResolvedAttachment<T>(
  workspaceService: CurrentWorkspaceService,
  attachmentId: string,
  operation: (context: {
    attachment: FileAttachmentSummary;
    localPath: string;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  return await withFileAttachmentService(workspaceService, async (context) => {
    const attachment =
      context.fileAttachmentService.getAttachmentById(attachmentId);

    if (attachment === null) {
      return apiError("WORKSPACE_ERROR", "Attachment was not found.");
    }

    return await operation({
      attachment: toFileAttachmentSummary(attachment),
      localPath: resolveInsideWorkspace(
        context.workspace.rootPath,
        attachment.storagePath
      )
    });
  });
}

async function withResolvedFileVersion<T>(
  workspaceService: CurrentWorkspaceService,
  versionId: string,
  operation: (context: {
    version: AttachmentVersionSummary;
    localPath: string;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  return await withFileServices(workspaceService, async (context) => {
    const version = context.fileVersionService.getFileVersion(versionId);

    if (version === null) {
      return apiError("WORKSPACE_ERROR", "Attachment version was not found.");
    }

    return await operation({
      version: toAttachmentVersionSummary(version),
      localPath: resolveInsideWorkspace(
        context.workspace.rootPath,
        version.storagePath
      )
    });
  });
}

function toFileAttachmentResultSummary(input: {
  item: ItemRecord;
  attachment: AttachmentRecord;
}): FileAttachmentResultSummary {
  return {
    item: toItemSummary(input.item),
    attachment: toFileAttachmentSummary(input.attachment)
  };
}

function toFileVersionMutationSummary(input: {
  attachment: AttachmentRecord;
  version: AttachmentVersionRecord;
}): FileVersionMutationSummary {
  return {
    attachment: toFileAttachmentSummary(input.attachment),
    version: toAttachmentVersionSummary(input.version)
  };
}

function toItemSummary(item: ItemRecord): ItemSummary {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    containerId: item.containerId,
    containerTabId: item.containerTabId,
    type: item.type,
    title: item.title,
    body: item.body,
    categoryId: item.categoryId,
    status: item.status,
    sortOrder: item.sortOrder,
    pinned: item.pinned,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt,
    archivedAt: item.archivedAt,
    deletedAt: item.deletedAt
  };
}

function toFileAttachmentSummary(
  attachment: AttachmentRecord
): FileAttachmentSummary {
  return {
    id: attachment.id,
    workspaceId: attachment.workspaceId,
    itemId: attachment.itemId,
    originalName: attachment.originalName,
    storedName: attachment.storedName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    checksum: attachment.checksum,
    storagePath: attachment.storagePath,
    description: attachment.description,
    createdAt: attachment.createdAt,
    updatedAt: attachment.updatedAt,
    deletedAt: attachment.deletedAt
  };
}

async function createAttachmentPreviewSummary(input: {
  workspace: WorkspaceSummary;
  attachment: AttachmentRecord;
  missing: boolean;
  versionCount: number;
  latestVersionNumber: number | null;
}): Promise<AttachmentPreviewSummary> {
  const thumbnail = await createAttachmentThumbnailPreview(input);

  return new AttachmentPreviewService().buildPreview({
    attachment: input.attachment,
    missing: input.missing,
    versionCount: input.versionCount,
    latestVersionNumber: input.latestVersionNumber,
    thumbnailStoragePath: thumbnail.storagePath,
    thumbnailExists: thumbnail.exists,
    previewDataUrl: thumbnail.dataUrl
  });
}

async function createAttachmentThumbnailPreview(input: {
  workspace: WorkspaceSummary;
  attachment: AttachmentRecord;
  missing: boolean;
}): Promise<{
  storagePath: string | null;
  exists: boolean;
  dataUrl: string | null;
}> {
  if (input.missing || !isImageAttachment(input.attachment)) {
    return { storagePath: null, exists: false, dataUrl: null };
  }

  const sourcePath = resolveInsideWorkspace(
    input.workspace.rootPath,
    input.attachment.storagePath
  );
  const image = nativeImage.createFromPath(sourcePath);

  if (image.isEmpty()) {
    return { storagePath: null, exists: false, dataUrl: null };
  }

  const storagePath = createAttachmentPreviewCacheRelativePath({
    attachmentId: input.attachment.id
  });
  const thumbnail = image.resize({ width: 256, height: 256 });
  const bytes = thumbnail.toPNG();

  await writeBinaryFileInsideWorkspace(
    input.workspace.rootPath,
    storagePath,
    bytes
  );

  return {
    storagePath,
    exists: true,
    dataUrl: await readImageDataUrl(
      resolveInsideWorkspace(input.workspace.rootPath, storagePath),
      "image/png"
    )
  };
}

async function readImageDataUrl(path: string, mimeType: string): Promise<string> {
  const data = await readFile(path);
  return `data:${mimeType};base64,${data.toString("base64")}`;
}

function isImageAttachment(attachment: AttachmentRecord): boolean {
  if (attachment.mimeType?.toLowerCase().startsWith("image/") === true) {
    return true;
  }

  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(attachment.originalName);
}

function toAttachmentVersionSummary(
  version: AttachmentVersionRecord
): AttachmentVersionSummary {
  return {
    id: version.id,
    workspaceId: version.workspaceId,
    attachmentId: version.attachmentId,
    versionNumber: version.versionNumber,
    originalName: version.originalName,
    storedName: version.storedName,
    sizeBytes: version.sizeBytes,
    checksum: version.checksum,
    storagePath: version.storagePath,
    note: version.note,
    createdAt: version.createdAt,
    deletedAt: version.deletedAt
  };
}

function toOpenFileVersionSummary(
  version: AttachmentVersionSummary,
  exists: boolean
): OpenFileVersionSummary {
  return {
    versionId: version.id,
    attachmentId: version.attachmentId,
    exists,
    storagePath: version.storagePath
  };
}

function toVerifyAttachmentSummary(
  context: {
    attachment: FileAttachmentSummary;
  },
  exists: boolean
): VerifyAttachmentSummary {
  return {
    attachmentId: context.attachment.id,
    itemId: context.attachment.itemId,
    exists,
    storagePath: context.attachment.storagePath
  };
}

async function attachmentExists(
  workspace: WorkspaceSummary,
  attachment: FileAttachmentSummary
): Promise<boolean> {
  return await localPathExists(
    resolveInsideWorkspace(workspace.rootPath, attachment.storagePath)
  );
}

function isAttachFileToContainerInput(
  input: unknown
): input is AttachFileToContainerInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.containerId) &&
    isSafeLocalFilePath(input.sourcePath) &&
    isOptionalString(input.workspaceId) &&
    isOptionalActorType(input.actorType) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalNullableString(input.description) &&
    (input.sortOrder === undefined || typeof input.sortOrder === "number")
  );
}

function isAttachFileToItemInput(input: unknown): input is AttachFileToItemInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    isSafeLocalFilePath(input.sourcePath) &&
    isOptionalActorType(input.actorType) &&
    isOptionalNullableString(input.description)
  );
}

function isChooseAndAttachFileInput(
  input: unknown
): input is ChooseAndAttachFileInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.containerId) &&
    isOptionalString(input.workspaceId) &&
    isOptionalActorType(input.actorType) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalNullableString(input.description) &&
    (input.sortOrder === undefined || typeof input.sortOrder === "number")
  );
}

function isUpdateFileMetadataInput(
  input: unknown
): input is UpdateFileMetadataInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.attachmentId) &&
    (input.title === undefined || isNonEmptyString(input.title)) &&
    isOptionalNullableString(input.description) &&
    isOptionalActorType(input.actorType) &&
    (input.title !== undefined || input.description !== undefined)
  );
}

function isCreateFileSnapshotInput(
  input: unknown
): input is CreateFileSnapshotInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.attachmentId) &&
    isOptionalNullableString(input.note) &&
    isOptionalActorType(input.actorType)
  );
}

function isRestoreFileVersionInput(
  input: unknown
): input is RestoreFileVersionInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.versionId) &&
    isOptionalActorType(input.actorType)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalActorType(value: unknown): boolean {
  return (
    value === undefined ||
    value === "local_user" ||
    value === "system" ||
    value === "importer"
  );
}
