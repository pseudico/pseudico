import {
  ListService,
  ListTemplateService,
  type BulkUpdateListItemsResult
} from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type ListItemRecord,
  type ListWithItemRecord,
  type TemplateRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type AddListItemInput,
  type ApiResult,
  type BulkAddListItemsInput,
  type BulkUpdateListItemSummary,
  type BulkUpdateListItemsInput,
  type BulkUpdateListItemsOperation,
  type BulkUpdateListItemsSummary,
  type CreateListFromTemplateInput,
  type CreateListInput,
  type ListDisplayMode,
  type ListItemStatus,
  type ListItemSummary,
  type ListProgressMode,
  type ListSummary,
  type MoveListItemInput,
  type MoveListItemToListInput,
  type MovePipelineCardInput,
  type PipelineStageSummary,
  type PipelineViewModelSummary,
  type SaveListAsTemplateInput,
  type TemplateSummary,
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
  handleEnablePipelineMode: (input: unknown) => Promise<ApiResult<ListSummary>>;
  handleDisablePipelineMode: (input: unknown) => Promise<ApiResult<ListSummary>>;
  handleGetPipelineViewModel: (
    input: unknown
  ) => Promise<ApiResult<PipelineViewModelSummary>>;
  handleMovePipelineCard: (input: unknown) => Promise<ApiResult<ListItemSummary>>;
  handleIndentListItem: (input: unknown) => Promise<ApiResult<ListItemSummary>>;
  handleOutdentListItem: (input: unknown) => Promise<ApiResult<ListItemSummary>>;
  handleMoveListItem: (input: unknown) => Promise<ApiResult<ListItemSummary>>;
  handleMoveListItemToList: (
    input: unknown
  ) => Promise<ApiResult<ListItemSummary[]>>;
  handleBulkAddListItems: (
    input: unknown
  ) => Promise<ApiResult<ListItemSummary[]>>;
  handleBulkUpdateListItems: (
    input: unknown
  ) => Promise<ApiResult<BulkUpdateListItemsSummary>>;
  handleListListsByContainer: (
    input: unknown
  ) => Promise<ApiResult<ListSummary[]>>;
  handleSaveListAsTemplate: (
    input: unknown
  ) => Promise<ApiResult<TemplateSummary>>;
  handleCreateListFromTemplate: (
    input: unknown
  ) => Promise<ApiResult<ListSummary>>;
  handleListTemplates: (input: unknown) => Promise<ApiResult<TemplateSummary[]>>;
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
      const listItemId = coerceListItemId(input);
      if (listItemId === null) {
        return apiError(
          "INVALID_INPUT",
          "completeListItem requires a list item id string or returned list item summary."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toListItemSummary(
            (await context.listService.completeListItem(listItemId)).listItem
          )
        )
      );
    },

    async handleReopenListItem(input) {
      const listItemId = coerceListItemId(input);
      if (listItemId === null) {
        return apiError(
          "INVALID_INPUT",
          "reopenListItem requires a list item id string or returned list item summary."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toListItemSummary(
            (await context.listService.reopenListItem(listItemId)).listItem
          )
        )
      );
    },

    async handleEnablePipelineMode(input) {
      const listId = coerceListId(input);
      if (listId === null) {
        return apiError(
          "INVALID_INPUT",
          "enablePipelineMode requires a list id string or returned list summary."
        );
      }

      return await withListService(workspaceService, async (context) => {
        const result = await context.listService.enablePipelineMode(listId);
        const listItems = context.listService.listItems(result.item.id);

        return apiOk(
          toListSummary({ item: result.item, list: result.list }, listItems)
        );
      });
    },

    async handleDisablePipelineMode(input) {
      const listId = coerceListId(input);
      if (listId === null) {
        return apiError(
          "INVALID_INPUT",
          "disablePipelineMode requires a list id string or returned list summary."
        );
      }

      return await withListService(workspaceService, async (context) => {
        const result = await context.listService.disablePipelineMode(listId);
        const listItems = context.listService.listItems(result.item.id);

        return apiOk(
          toListSummary({ item: result.item, list: result.list }, listItems)
        );
      });
    },

    async handleGetPipelineViewModel(input) {
      const listId = coerceListId(input);
      if (listId === null) {
        return apiError(
          "INVALID_INPUT",
          "getPipelineViewModel requires a list id string or returned list summary."
        );
      }

      return await withListService(workspaceService, async (context) => {
        const viewModel = context.listService.getPipelineViewModel(listId);

        return apiOk({
          list: toListSummary(
            viewModel.list,
            context.listService.listItems(viewModel.list.item.id)
          ),
          stages: viewModel.stages.map(toPipelineStageSummary)
        });
      });
    },

    async handleMovePipelineCard(input) {
      const moveInput = normalizeMovePipelineCardInput(input);
      if (moveInput === null) {
        return apiError(
          "INVALID_INPUT",
          "movePipelineCard requires listId, cardId, and targetStageId fields or returned summaries in those fields."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toListItemSummary(
            (await context.listService.movePipelineCard(moveInput)).card
          )
        )
      );
    },

    async handleIndentListItem(input) {
      const listItemId = coerceListItemId(input);
      if (listItemId === null) {
        return apiError(
          "INVALID_INPUT",
          "indentListItem requires a list item id string or returned list item summary."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toListItemSummary(
            (await context.listService.indentListItem({ listItemId }))
              .listItem
          )
        )
      );
    },

    async handleOutdentListItem(input) {
      const listItemId = coerceListItemId(input);
      if (listItemId === null) {
        return apiError(
          "INVALID_INPUT",
          "outdentListItem requires a list item id string or returned list item summary."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toListItemSummary(
            (await context.listService.outdentListItem({ listItemId }))
              .listItem
          )
        )
      );
    },

    async handleMoveListItem(input) {
      const moveInput = normalizeMoveListItemInput(input);
      if (moveInput === null) {
        return apiError(
          "INVALID_INPUT",
          "moveListItem requires listItemId and direction fields."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toListItemSummary(
            (await context.listService.moveListItem(moveInput)).listItem
          )
        )
      );
    },

    async handleMoveListItemToList(input) {
      if (!isMoveListItemToListInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "moveListItemToList requires listItemId and targetListId fields."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          (await context.listService.moveListItemToList(input)).map((result) =>
            toListItemSummary(result.listItem)
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

    async handleBulkUpdateListItems(input) {
      if (!isBulkUpdateListItemsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "bulkUpdateListItems requires listId, listItemIds, and operation fields."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toBulkUpdateListItemsSummary(
            await context.listService.bulkUpdateListItems(input)
          )
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
    },

    async handleSaveListAsTemplate(input) {
      if (!isSaveListAsTemplateInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "saveListAsTemplate requires a listId field."
        );
      }

      return await withListService(workspaceService, async (context) =>
        apiOk(
          toTemplateSummary(
            await context.templateService.saveListAsTemplate(input)
          )
        )
      );
    },

    async handleCreateListFromTemplate(input) {
      if (!isCreateListFromTemplateInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createListFromTemplate requires templateId and containerId fields."
        );
      }

      return await withListService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.templateService.createListFromTemplate({
          ...input,
          workspaceId
        });

        return apiOk(
          toListSummary(
            {
              item: result.list.item,
              list: result.list.list
            },
            result.listItems
          )
        );
      });
    },

    async handleListTemplates(input) {
      if (!isOptionalString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listTemplates accepts an optional workspaceId string."
        );
      }

      return await withListService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(
          input as string | undefined,
          context.workspace
        );

        return apiOk(
          context.templateService
            .listTemplates({ workspaceId })
            .map(toTemplateSummary)
        );
      });
    }
  };
}

async function withListService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    listService: ListService;
    templateService: ListTemplateService;
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
      templateService: new ListTemplateService({ connection }),
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

function toBulkUpdateListItemsSummary(
  result: BulkUpdateListItemsResult
): BulkUpdateListItemsSummary {
  return {
    listId: result.listId,
    operation: result.operation,
    requestedCount: result.requestedCount,
    changedCount: result.changedCount,
    skippedCount: result.skippedCount,
    activityId: result.activityId,
    items: result.items.map(
      (item): BulkUpdateListItemSummary => ({
        listItemId: item.listItemId,
        ok: item.ok,
        ...(item.listItem === undefined
          ? {}
          : { listItem: toListItemSummary(item.listItem) }),
        ...(item.reason === undefined ? {} : { reason: item.reason })
      })
    )
  };
}

function toPipelineStageSummary(input: {
  stage: ListItemRecord;
  cards: ListItemRecord[];
}): PipelineStageSummary {
  return {
    stage: toListItemSummary(input.stage),
    cards: input.cards.map(toListItemSummary)
  };
}

function toTemplateSummary(template: TemplateRecord): TemplateSummary {
  return {
    id: template.id,
    workspaceId: template.workspaceId,
    kind: template.kind,
    name: template.name,
    description: template.description,
    sourceType: template.sourceType,
    sourceId: template.sourceId,
    templateJson: template.templateJson,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    deletedAt: template.deletedAt
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

function isBulkUpdateListItemsInput(
  input: unknown
): input is BulkUpdateListItemsInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.listId) &&
    Array.isArray(input.listItemIds) &&
    input.listItemIds.length > 0 &&
    input.listItemIds.every(isNonEmptyString) &&
    isBulkUpdateListItemsOperationValue(input.operation) &&
    isOptionalActorType(input.actorType)
  );
}

function coerceListId(input: unknown): string | null {
  if (isNonEmptyString(input)) {
    return input;
  }
  if (!isRecord(input)) {
    return null;
  }
  if (isNonEmptyString(input.id)) {
    return input.id;
  }
  if (isNonEmptyString(input.listId)) {
    return input.listId;
  }
  if (isRecord(input.listId) && isNonEmptyString(input.listId.id)) {
    return input.listId.id;
  }
  if (isRecord(input.list) && isNonEmptyString(input.list.id)) {
    return input.list.id;
  }
  if (isRecord(input.item) && isNonEmptyString(input.item.id)) {
    return input.item.id;
  }
  return null;
}

function coerceListItemId(input: unknown): string | null {
  if (isNonEmptyString(input)) {
    return input;
  }
  if (!isRecord(input)) {
    return null;
  }
  if (isNonEmptyString(input.id)) {
    return input.id;
  }
  if (isNonEmptyString(input.listItemId)) {
    return input.listItemId;
  }
  if (isRecord(input.listItemId) && isNonEmptyString(input.listItemId.id)) {
    return input.listItemId.id;
  }
  if (isRecord(input.listItem) && isNonEmptyString(input.listItem.id)) {
    return input.listItem.id;
  }
  if (isRecord(input.item) && isNonEmptyString(input.item.id)) {
    return input.item.id;
  }
  if (isRecord(input.card) && isNonEmptyString(input.card.id)) {
    return input.card.id;
  }
  if (isRecord(input.stage) && isNonEmptyString(input.stage.id)) {
    return input.stage.id;
  }
  return null;
}

function normalizeMovePipelineCardInput(
  input: unknown
): MovePipelineCardInput | null {
  if (!isRecord(input)) {
    return null;
  }
  const listId = coerceListId(input.listId);
  const cardId = coerceListItemId(input.cardId);
  const targetStageId = coerceListItemId(input.targetStageId);
  if (listId === null || cardId === null || targetStageId === null) {
    return null;
  }
  const normalized: MovePipelineCardInput = {
    listId,
    cardId,
    targetStageId
  };
  if (isActorTypeValue(input.actorType)) {
    normalized.actorType = input.actorType;
  }
  if (typeof input.sortOrder === "number") {
    normalized.sortOrder = input.sortOrder;
  }
  return normalized;
}

function normalizeMoveListItemInput(input: unknown): MoveListItemInput | null {
  if (!isRecord(input)) {
    return null;
  }
  const listItemId = coerceListItemId(input.listItemId);
  if (
    listItemId === null ||
    (input.direction !== "up" && input.direction !== "down")
  ) {
    return null;
  }
  const normalized: MoveListItemInput = {
    listItemId,
    direction: input.direction
  };
  if (isActorTypeValue(input.actorType)) {
    normalized.actorType = input.actorType;
  }
  return normalized;
}

function isBulkUpdateListItemsOperationValue(
  value: unknown
): value is BulkUpdateListItemsOperation {
  return (
    value === "complete" ||
    value === "delete" ||
    value === "move_up" ||
    value === "move_down" ||
    value === "indent" ||
    value === "outdent"
  );
}

function isMoveListItemToListInput(
  input: unknown
): input is MoveListItemToListInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.listItemId) &&
    isNonEmptyString(input.targetListId) &&
    isOptionalNullableString(input.beforeListItemId) &&
    isOptionalNullableString(input.targetListItemParentId) &&
    isOptionalActorType(input.actorType)
  );
}

function isSaveListAsTemplateInput(
  input: unknown
): input is SaveListAsTemplateInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.listId) &&
    isOptionalString(input.name) &&
    isOptionalNullableString(input.description) &&
    isOptionalDateInput(input.baseDate) &&
    isOptionalActorType(input.actorType)
  );
}

function isCreateListFromTemplateInput(
  input: unknown
): input is CreateListFromTemplateInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.templateId) &&
    isOptionalString(input.workspaceId) &&
    isNonEmptyString(input.containerId) &&
    isOptionalString(input.title) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalDateInput(input.baseDate) &&
    isOptionalActorType(input.actorType)
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

function isOptionalDateInput(value: unknown): boolean {
  return value === undefined || typeof value === "string" || value instanceof Date;
}

function isOptionalActorType(value: unknown): boolean {
  return (
    value === undefined ||
    value === "local_user" ||
    value === "system" ||
    value === "importer"
  );
}

function isActorTypeValue(
  value: unknown
): value is NonNullable<MoveListItemInput["actorType"]> {
  return value === "local_user" || value === "system" || value === "importer";
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
