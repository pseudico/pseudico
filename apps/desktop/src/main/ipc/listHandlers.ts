import { ListService } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type ListItemRecord,
  type ListWithItemRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type AddListItemInput,
  type ApiResult,
  type BulkAddListItemsInput,
  type CreateListInput,
  type ListDisplayMode,
  type ListItemStatus,
  type ListItemSummary,
  type ListProgressMode,
  type ListSummary,
  type UpdateListItemInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type ListIpcHandlers = {
  handleCreateList: (input: unknown) => Promise<ApiResult<ListSummary>>;
  handleAddListItem: (input: unknown) => Promise<ApiResult<ListItemSummary>>;
  handleUpdateListItem: (input: unknown) => Promise<ApiResult<ListItemSummary>>;
  handleCompleteListItem: (input: unknown) => Promise<ApiResult<ListItemSummary>>;
  handleReopenListItem: (input: unknown) => Promise<ApiResult<ListItemSummary>>;
  handleBulkAddListItems: (
    input: unknown
  ) => Promise<ApiResult<ListItemSummary[]>>;
  handleListListsByContainer: (
    input: unknown
  ) => Promise<ApiResult<ListSummary[]>>;
};

export function createListIpcHandlers(
  workspaceService: CurrentWorkspaceService
): ListIpcHandlers {
  return {
    async handleCreateList(input) {
      if (!isCreateListInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createList requires containerId and title fields."
        );
      }

      return await withListService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.listService.createList({
          ...input,
          workspaceId
        });

        return apiOk(
          toListSummary(
            {
              item: result.item,
              list: result.list
            },
            []
          )
        );
      });
    },

    async handleAddListItem(input) {
      if (!isAddListItemInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "addListItem requires listId and title fields."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toListItemSummary((await context.listService.addListItem(input)).listItem)
        )
      );
    },

    async handleUpdateListItem(input) {
      if (!isUpdateListItemInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateListItem requires a listItemId and at least one update field."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toListItemSummary(
            (await context.listService.updateListItem(input)).listItem
          )
        )
      );
    },

    async handleCompleteListItem(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "completeListItem requires a list item id string."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toListItemSummary(
            (await context.listService.completeListItem(input)).listItem
          )
        )
      );
    },

    async handleReopenListItem(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "reopenListItem requires a list item id string."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toListItemSummary(
            (await context.listService.reopenListItem(input)).listItem
          )
        )
      );
    },

    async handleBulkAddListItems(input) {
      if (!isBulkAddListItemsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "bulkAddListItems requires listId and text fields."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          (
            await context.listService.bulkCreateListItems(input)
          ).map((result) => toListItemSummary(result.listItem))
        )
      );
    },

    async handleListListsByContainer(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listListsByContainer requires a containerId string."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          context.listService.listListsByContainer(input).map((list) =>
            toListSummary(list, context.listService.listItems(list.item.id))
          )
        )
      );
    }
  };
}

async function withListService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    listService: ListService;
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
      listService: new ListService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "List operation failed."
    );
  } finally {
    connection.close();
  }
}

function resolveWorkspaceId(
  requestedWorkspaceId: string | undefined,
  currentWorkspace: WorkspaceSummary
): string {
  if (
    requestedWorkspaceId !== undefined &&
    requestedWorkspaceId !== currentWorkspace.id
  ) {
    throw new Error("List workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toListSummary(
  listWithItem: ListWithItemRecord,
  listItems: readonly ListItemRecord[]
): ListSummary {
  const { item, list } = listWithItem;

  if (item.type !== "list") {
    throw new Error(`Expected list item but received ${item.type}.`);
  }

  return {
    id: item.id,
    workspaceId: item.workspaceId,
    containerId: item.containerId,
    containerTabId: item.containerTabId,
    type: "list",
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
    deletedAt: item.deletedAt,
    displayMode: list.displayMode,
    showCompleted: list.showCompleted,
    progressMode: list.progressMode,
    listCreatedAt: list.createdAt,
    listUpdatedAt: list.updatedAt,
    items: listItems.map(toListItemSummary)
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

function isCreateListInput(input: unknown): input is CreateListInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isNonEmptyString(input.containerId) &&
    isNonEmptyString(input.title) &&
    isOptionalNullableString(input.body) &&
    isOptionalNullableString(input.categoryId) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalNumber(input.sortOrder) &&
    isOptionalBoolean(input.pinned) &&
    isOptionalBoolean(input.showCompleted) &&
    isOptionalActorType(input.actorType) &&
    (input.displayMode === undefined || isListDisplayModeValue(input.displayMode)) &&
    (input.progressMode === undefined ||
      isListProgressModeValue(input.progressMode))
  );
}

function isAddListItemInput(input: unknown): input is AddListItemInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.listId) &&
    isNonEmptyString(input.title) &&
    isOptionalNullableString(input.body) &&
    isOptionalNullableString(input.listItemParentId) &&
    isOptionalNullableString(input.startAt) &&
    isOptionalNullableString(input.dueAt) &&
    isOptionalNumber(input.depth) &&
    isOptionalNumber(input.sortOrder) &&
    isOptionalActorType(input.actorType) &&
    (input.status === undefined || isListItemStatusValue(input.status))
  );
}

function isUpdateListItemInput(input: unknown): input is UpdateListItemInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.listItemId) &&
    (input.title === undefined || isNonEmptyString(input.title)) &&
    isOptionalNullableString(input.body) &&
    isOptionalNullableString(input.listItemParentId) &&
    isOptionalNullableString(input.startAt) &&
    isOptionalNullableString(input.dueAt) &&
    isOptionalNumber(input.depth) &&
    isOptionalNumber(input.sortOrder) &&
    isOptionalActorType(input.actorType) &&
    (input.status === undefined || isListItemStatusValue(input.status)) &&
    hasListItemUpdateField(input)
  );
}

function isBulkAddListItemsInput(input: unknown): input is BulkAddListItemsInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.listId) &&
    isNonEmptyString(input.text) &&
    isOptionalActorType(input.actorType) &&
    isOptionalNumber(input.startSortOrder)
  );
}

function hasListItemUpdateField(input: Record<string, unknown>): boolean {
  return [
    "body",
    "depth",
    "dueAt",
    "listItemParentId",
    "sortOrder",
    "startAt",
    "status",
    "title"
  ].some((field) => input[field] !== undefined);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || isNonEmptyString(value);
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === "number";
}

function isOptionalActorType(value: unknown): boolean {
  return (
    value === undefined ||
    value === "local_user" ||
    value === "system" ||
    value === "importer"
  );
}

function isListItemStatusValue(value: unknown): value is ListItemStatus {
  return (
    value === "open" ||
    value === "done" ||
    value === "waiting" ||
    value === "cancelled"
  );
}

function isListDisplayModeValue(value: unknown): value is ListDisplayMode {
  return value === "checklist" || value === "pipeline";
}

function isListProgressModeValue(value: unknown): value is ListProgressMode {
  return value === "count" || value === "manual" || value === "none";
}
