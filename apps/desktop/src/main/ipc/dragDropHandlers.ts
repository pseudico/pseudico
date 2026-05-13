import {
  areSafeLocalFilePaths,
  createLocalId,
  type AttachmentRecord
} from "@local-work-os/core";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type ContainerTabRecord,
  type DatabaseConnection,
  type ItemRecord,
  type ListItemRecord
} from "@local-work-os/db";
import { DragDropService } from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type AttachDroppedFilesToContainerInput,
  type AttachDroppedFilesToItemInput,
  type ContainerTabSummary,
  type FileAttachmentResultSummary,
  type FileAttachmentSummary,
  type ItemSummary,
  type ListItemSummary,
  type MoveItemInput,
  type ReorderContainerItemsInput,
  type ReorderContainerTabsInput,
  type ReorderListItemsByIdInput,
  type WorkspaceSummary
} from "../../preload/api";
import {
  copyFileIntoWorkspace,
  type CopiedWorkspaceFile
} from "../services/safeFileSystem";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type DragDropIpcHandlers = {
  handleReorderItems: (input: unknown) => Promise<ApiResult<ItemSummary[]>>;
  handleMoveItem: (input: unknown) => Promise<ApiResult<ItemSummary>>;
  handleReorderListItems: (
    input: unknown
  ) => Promise<ApiResult<ListItemSummary[]>>;
  handleReorderTabs: (
    input: unknown
  ) => Promise<ApiResult<ContainerTabSummary[]>>;
  handleAttachFilesToContainer: (
    input: unknown
  ) => Promise<ApiResult<FileAttachmentResultSummary[]>>;
  handleAttachFilesToItem: (
    input: unknown
  ) => Promise<ApiResult<FileAttachmentResultSummary[]>>;
};

export function createDragDropIpcHandlers(
  workspaceService: CurrentWorkspaceService
): DragDropIpcHandlers {
  return {
    async handleReorderItems(input) {
      if (!isReorderContainerItemsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "reorderItems requires containerId and itemIds fields."
        );
      }

      return await withDragDropService(workspaceService, async (context) =>
        apiOk(
          (await context.dragDropService.reorderContainerItems(input)).map(
            (result) => toItemSummary(result.item)
          )
        )
      );
    },

    async handleMoveItem(input) {
      if (!isMoveItemInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "moveItem requires itemId and targetContainerId strings."
        );
      }

      return await withDragDropService(workspaceService, async (context) =>
        apiOk(toItemSummary((await context.dragDropService.moveItem(input)).item))
      );
    },

    async handleReorderListItems(input) {
      if (!isReorderListItemsByIdInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "reorderListItems requires listId and listItemIds fields."
        );
      }

      return await withDragDropService(workspaceService, async (context) =>
        apiOk(
          (await context.dragDropService.reorderListItems(input)).map((result) =>
            toListItemSummary(result.listItem)
          )
        )
      );
    },

    async handleReorderTabs(input) {
      if (!isReorderContainerTabsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "reorderTabs requires containerId and tabIds fields."
        );
      }

      return await withDragDropService(workspaceService, async (context) =>
        apiOk(
          (await context.dragDropService.reorderTabs(input)).map(
            toContainerTabSummary
          )
        )
      );
    },

    async handleAttachFilesToContainer(input) {
      if (!isAttachDroppedFilesToContainerInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "attachFilesToContainer requires containerId and sourcePaths fields."
        );
      }

      return await withDragDropService(workspaceService, async (context) => {
        const workspaceId = input.workspaceId ?? context.workspace.id;

        if (workspaceId !== context.workspace.id) {
          return apiError(
            "WORKSPACE_ERROR",
            "Dropped file workspaceId must match the current workspace."
          );
        }

        const copiedFiles = await copyDroppedFiles(
          context.workspace,
          input.sourcePaths
        );
        const results =
          await context.dragDropService.attachCopiedFilesToContainer({
            workspaceId,
            containerId: input.containerId,
            copiedFiles,
            ...(input.containerTabId === undefined
              ? {}
              : { containerTabId: input.containerTabId }),
            ...(input.description === undefined
              ? {}
              : { description: input.description }),
            ...(input.startSortOrder === undefined
              ? {}
              : { startSortOrder: input.startSortOrder })
          });

        return apiOk(results.map(toFileAttachmentResultSummary));
      });
    },

    async handleAttachFilesToItem(input) {
      if (!isAttachDroppedFilesToItemInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "attachFilesToItem requires itemId and sourcePaths fields."
        );
      }

      return await withDragDropService(workspaceService, async (context) => {
        const copiedFiles = await copyDroppedFiles(
          context.workspace,
          input.sourcePaths
        );
        const results = await context.dragDropService.attachCopiedFilesToItem({
          itemId: input.itemId,
          copiedFiles,
          ...(input.description === undefined
            ? {}
            : { description: input.description })
        });

        return apiOk(results.map(toFileAttachmentResultSummary));
      });
    }
  };
}

async function withDragDropService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    dragDropService: DragDropService;
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
      dragDropService: new DragDropService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Drag/drop operation failed."
    );
  } finally {
    connection.close();
  }
}

async function copyDroppedFiles(
  workspace: WorkspaceSummary,
  sourcePaths: readonly string[]
): Promise<CopiedWorkspaceFile[]> {
  const copiedFiles: CopiedWorkspaceFile[] = [];

  for (const sourcePath of sourcePaths) {
    copiedFiles.push(
      await copyFileIntoWorkspace({
        workspaceRootPath: workspace.rootPath,
        sourcePath,
        attachmentId: createLocalId("attachment")
      })
    );
  }

  return copiedFiles;
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

function toListItemSummary(listItem: ListItemRecord): ListItemSummary {
  return {
    id: listItem.id,
    workspaceId: listItem.workspaceId,
    listItemParentId: listItem.listItemParentId,
    listId: listItem.listId,
    title: listItem.title,
    body: listItem.body,
    status: listItem.status,
    depth: listItem.depth,
    sortOrder: listItem.sortOrder,
    startAt: listItem.startAt,
    dueAt: listItem.dueAt,
    completedAt: listItem.completedAt,
    createdAt: listItem.createdAt,
    updatedAt: listItem.updatedAt,
    archivedAt: listItem.archivedAt,
    deletedAt: listItem.deletedAt
  };
}

function toContainerTabSummary(tab: ContainerTabRecord): ContainerTabSummary {
  return {
    id: tab.id,
    workspaceId: tab.workspaceId,
    containerId: tab.containerId,
    name: tab.name,
    description: tab.description,
    sortOrder: tab.sortOrder,
    isDefault: tab.isDefault,
    createdAt: tab.createdAt,
    updatedAt: tab.updatedAt,
    hiddenAt: tab.hiddenAt,
    archivedAt: tab.archivedAt,
    deletedAt: tab.deletedAt
  };
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

function isReorderContainerItemsInput(
  input: unknown
): input is ReorderContainerItemsInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.containerId) &&
    isOptionalNullableString(input.containerTabId) &&
    Array.isArray(input.itemIds) &&
    input.itemIds.length > 0 &&
    input.itemIds.every(isNonEmptyString)
  );
}

function isMoveItemInput(input: unknown): input is MoveItemInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    isNonEmptyString(input.targetContainerId) &&
    isOptionalNullableString(input.targetContainerTabId) &&
    isOptionalNumber(input.sortOrder)
  );
}

function isReorderListItemsByIdInput(
  input: unknown
): input is ReorderListItemsByIdInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.listId) &&
    Array.isArray(input.listItemIds) &&
    input.listItemIds.length > 0 &&
    input.listItemIds.every(isNonEmptyString)
  );
}

function isReorderContainerTabsInput(
  input: unknown
): input is ReorderContainerTabsInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.containerId) &&
    Array.isArray(input.tabIds) &&
    input.tabIds.length > 0 &&
    input.tabIds.every(isNonEmptyString)
  );
}

function isAttachDroppedFilesToContainerInput(
  input: unknown
): input is AttachDroppedFilesToContainerInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.containerId) &&
    isOptionalString(input.workspaceId) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalNullableString(input.description) &&
    isOptionalNumber(input.startSortOrder) &&
    areSafeLocalFilePaths(input.sourcePaths)
  );
}

function isAttachDroppedFilesToItemInput(
  input: unknown
): input is AttachDroppedFilesToItemInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    isOptionalNullableString(input.description) &&
    areSafeLocalFilePaths(input.sourcePaths)
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

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === "number";
}
