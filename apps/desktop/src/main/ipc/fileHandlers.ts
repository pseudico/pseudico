import { createLocalId, type AttachmentRecord } from "@local-work-os/core";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type ItemRecord
} from "@local-work-os/db";
import { FileAttachmentService } from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type AttachFileToContainerInput,
  type AttachFileToItemInput,
  type ChooseAndAttachFileInput,
  type FileAttachmentResultSummary,
  type FileItemSummary,
  type FileAttachmentSummary,
  type ItemSummary,
  type OpenAttachmentSummary,
  type UpdateFileMetadataInput,
  type VerifyAttachmentSummary,
  type WorkspaceSummary
} from "../../preload/api";
import {
  copyFileIntoWorkspace,
  localPathExists,
  resolveInsideWorkspace,
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

      return await withFileAttachmentService(
        workspaceService,
        async (context) => {
          const entries = context.fileAttachmentService.listFileItemsByContainer({
            containerId: input
          });
          const files = await Promise.all(
            entries.map(async ({ item, attachment }) => ({
              ...toItemSummary(item),
              type: "file" as const,
              attachment: toFileAttachmentSummary(attachment),
              missing: !(await attachmentExists(context.workspace, attachment))
            }))
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

function toFileAttachmentResultSummary(input: {
  item: ItemRecord;
  attachment: AttachmentRecord;
}): FileAttachmentResultSummary {
  return {
    item: toItemSummary(input.item),
    attachment: toFileAttachmentSummary(input.attachment)
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
    isNonEmptyString(input.sourcePath) &&
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
    isNonEmptyString(input.sourcePath) &&
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
