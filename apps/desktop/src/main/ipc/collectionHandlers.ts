import { CollectionService, SmartListService, TagService } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type TaggedTargetRecord,
  type TaskWithItemRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type CollectionEvaluationSummary,
  type CollectionResultGroupSummary,
  type CollectionResultSummary,
  type CollectionSummary,
  type CreateKeywordCollectionInput,
  type CreateSmartListInput,
  type CreateTagCollectionInput,
  type CreateTaskInCollectionInput,
  type EvaluateCollectionInput,
  type ItemTagSummary,
  type PreviewSmartListInput,
  type SmartListCriteriaInput,
  type SmartListPreviewSummary,
  type SmartListSummary,
  type TaskStatus,
  type TaskSummary,
  type UpdateSmartListInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type FeatureSmartListCriteria = Parameters<
  SmartListService["previewSmartList"]
>[0]["criteria"];

type CollectionIpcHandlers = {
  handleListCollections: (
    input: unknown
  ) => Promise<ApiResult<CollectionSummary[]>>;
  handleCreateTagCollection: (
    input: unknown
  ) => Promise<ApiResult<CollectionSummary>>;
  handleCreateKeywordCollection: (
    input: unknown
  ) => Promise<ApiResult<CollectionSummary>>;
  handleEvaluateCollection: (
    input: unknown
  ) => Promise<ApiResult<CollectionEvaluationSummary>>;
  handleCreateTaskInCollection: (
    input: unknown
  ) => Promise<ApiResult<TaskSummary>>;
  handleListSmartLists: (
    input: unknown
  ) => Promise<ApiResult<SmartListSummary[]>>;
  handleCreateSmartList: (
    input: unknown
  ) => Promise<ApiResult<SmartListSummary>>;
  handleUpdateSmartList: (
    input: unknown
  ) => Promise<ApiResult<SmartListSummary>>;
  handlePreviewSmartList: (
    input: unknown
  ) => Promise<ApiResult<SmartListPreviewSummary>>;
};

export function createCollectionIpcHandlers(
  workspaceService: CurrentWorkspaceService
): CollectionIpcHandlers {
  return {
    async handleListCollections(input) {
      if (!isOptionalString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listCollections requires an optional workspaceId string."
        );
      }

      return await withCollectionService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(
          typeof input === "string" ? input : undefined,
          context.workspace
        );
        return apiOk(context.collectionService.listCollections(workspaceId));
      });
    },

    async handleCreateTagCollection(input) {
      if (!isCreateTagCollectionInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createTagCollection requires a tagSlug and optional name, description, and workspaceId fields."
        );
      }

      return await withCollectionService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const collection = await context.collectionService.createTagCollection({
          ...input,
          workspaceId
        });

        return apiOk(collection);
      });
    },

    async handleCreateKeywordCollection(input) {
      if (!isCreateKeywordCollectionInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createKeywordCollection requires a query and optional name, description, and workspaceId fields."
        );
      }

      return await withCollectionService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const collection = await context.collectionService.createKeywordCollection({
          ...input,
          workspaceId
        });

        return apiOk(collection);
      });
    },

    async handleEvaluateCollection(input) {
      if (!isEvaluateCollectionInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "evaluateCollection requires a collectionId string and optional limit/offset."
        );
      }

      return await withCollectionService(workspaceService, async (context) => {
        const result = context.collectionService.evaluateCollection(
          typeof input === "string" ? input : input
        );

        if (result.collection.workspaceId !== context.workspace.id) {
          throw new Error("Collection workspace must match the current workspace.");
        }

        return apiOk({
          collection: result.collection,
          total: result.total,
          results: result.results.map(toCollectionResultSummary),
          groups: result.groups.map(toCollectionResultGroupSummary),
          page: result.page
        });
      });
    },

    async handleCreateTaskInCollection(input) {
      if (!isCreateTaskInCollectionInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createTaskInCollection requires collectionId, containerId, and title fields."
        );
      }

      return await withCollectionService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.collectionService.createTaskInCollection({
          ...input,
          workspaceId
        });
        const tags = context.tagService.hydrateItemTags({
          workspaceId,
          itemIds: [result.item.id]
        })[result.item.id] ?? [];

        return apiOk(toTaskSummary(result, tags));
      });
    },

    async handleListSmartLists(input) {
      if (!isOptionalString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listSmartLists requires an optional workspaceId string."
        );
      }

      return await withCollectionService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(
          typeof input === "string" ? input : undefined,
          context.workspace
        );
        return apiOk(context.smartListService.listSmartLists(workspaceId));
      });
    },

    async handleCreateSmartList(input) {
      if (!isCreateSmartListInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createSmartList requires name and criteria fields."
        );
      }

      return await withCollectionService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.smartListService.createSmartList({
          workspaceId,
          name: input.name,
          criteria: toFeatureSmartListCriteria(input.criteria),
          ...(input.description === undefined
            ? {}
            : { description: input.description })
        });

        return apiOk(result.smartList);
      });
    },

    async handleUpdateSmartList(input) {
      if (!isUpdateSmartListInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateSmartList requires smartListId and at least one editable field."
        );
      }

      return await withCollectionService(workspaceService, async (context) => {
        const result = await context.smartListService.updateSmartList({
          smartListId: input.smartListId,
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
          ...(input.criteria === undefined
            ? {}
            : { criteria: toFeatureSmartListCriteria(input.criteria) }),
          ...(input.isFavorite === undefined ? {} : { isFavorite: input.isFavorite })
        });

        if (result.smartList.workspaceId !== context.workspace.id) {
          throw new Error("Smart list workspace must match the current workspace.");
        }

        return apiOk(result.smartList);
      });
    },

    async handlePreviewSmartList(input) {
      if (!isPreviewSmartListInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "previewSmartList requires criteria and optional limit/offset."
        );
      }

      return await withCollectionService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = context.smartListService.previewSmartList({
          workspaceId,
          criteria: toFeatureSmartListCriteria(input.criteria),
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset })
        });

        return apiOk({
          query: result.query,
          total: result.total,
          results: result.results.map(toCollectionResultSummary),
          groups: result.groups.map(toCollectionResultGroupSummary),
          page: result.page
        });
      });
    }
  };
}

function isEvaluateCollectionInput(
  input: unknown
): input is string | EvaluateCollectionInput {
  return (
    isNonEmptyString(input) ||
    (isRecord(input) &&
      isNonEmptyString(input.collectionId) &&
      isOptionalPositiveInteger(input.limit) &&
      isOptionalNonNegativeInteger(input.offset))
  );
}

async function withCollectionService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    collectionService: CollectionService;
    connection: DatabaseConnection;
    smartListService: SmartListService;
    tagService: TagService;
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
      collectionService: new CollectionService({ connection }),
      connection,
      smartListService: new SmartListService({ connection }),
      tagService: new TagService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Collection operation failed."
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
    throw new Error("Collection workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toCollectionResultSummary(
  result: CollectionResultSummary
): CollectionResultSummary {
  return {
    targetType: result.targetType,
    targetId: result.targetId,
    kind: result.kind,
    title: result.title,
    containerId: result.containerId,
    containerType: result.containerType,
    containerTitle: result.containerTitle,
    categoryId: result.categoryId,
    categoryName: result.categoryName,
    taskStatus: result.taskStatus,
    taskPriority: result.taskPriority ?? null,
    dueAt: result.dueAt,
    tags: result.tags,
    destinationPath: result.destinationPath
  };
}

function toCollectionResultGroupSummary(
  group: CollectionResultGroupSummary
): CollectionResultGroupSummary {
  return {
    key: group.key,
    label: group.label,
    results: group.results.map(toCollectionResultSummary)
  };
}

function toTaskSummary(
  taskWithItem: TaskWithItemRecord,
  tags: readonly TaggedTargetRecord[] = []
): TaskSummary {
  const { item, task } = taskWithItem;

  if (item.type !== "task") {
    throw new Error(`Expected task item but received ${item.type}.`);
  }

  return {
    id: item.id,
    workspaceId: item.workspaceId,
    containerId: item.containerId,
    containerTabId: item.containerTabId,
    type: "task",
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
    tags: tags.map(toItemTagSummary),
    taskStatus: task.taskStatus,
    priority: task.priority,
    startAt: task.startAt,
    dueAt: task.dueAt,
    allDay: task.allDay,
    timezone: task.timezone,
    taskCompletedAt: task.completedAt,
    taskCreatedAt: task.createdAt,
    taskUpdatedAt: task.updatedAt
  };
}

function toItemTagSummary(tag: TaggedTargetRecord): ItemTagSummary {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    source: tag.taggingSource
  };
}

function isCreateTagCollectionInput(
  input: unknown
): input is CreateTagCollectionInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.tagSlug) &&
    isOptionalString(input.workspaceId) &&
    isOptionalString(input.name) &&
    isOptionalNullableString(input.description)
  );
}

function isCreateKeywordCollectionInput(
  input: unknown
): input is CreateKeywordCollectionInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.query) &&
    isOptionalString(input.workspaceId) &&
    isOptionalString(input.name) &&
    isOptionalNullableString(input.description)
  );
}

function isCreateTaskInCollectionInput(
  input: unknown
): input is CreateTaskInCollectionInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.collectionId) &&
    isOptionalString(input.workspaceId) &&
    isNonEmptyString(input.containerId) &&
    isNonEmptyString(input.title) &&
    isOptionalNullableString(input.body) &&
    isOptionalNullableString(input.categoryId) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalNullableString(input.dueAt) &&
    isOptionalNullableString(input.startAt) &&
    isOptionalNullableString(input.timezone) &&
    isOptionalNumber(input.priority) &&
    isOptionalNumber(input.sortOrder) &&
    isOptionalBoolean(input.allDay) &&
    isOptionalBoolean(input.pinned) &&
    isOptionalActorType(input.actorType) &&
    (input.status === undefined || isTaskStatusValue(input.status))
  );
}

function isCreateSmartListInput(input: unknown): input is CreateSmartListInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isNonEmptyString(input.name) &&
    isOptionalNullableString(input.description) &&
    isSmartListCriteriaInput(input.criteria)
  );
}

function isUpdateSmartListInput(input: unknown): input is UpdateSmartListInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.smartListId) &&
    isOptionalString(input.name) &&
    isOptionalNullableString(input.description) &&
    (input.criteria === undefined || isSmartListCriteriaInput(input.criteria)) &&
    isOptionalBoolean(input.isFavorite) &&
    (input.name !== undefined ||
      input.description !== undefined ||
      input.criteria !== undefined ||
      input.isFavorite !== undefined)
  );
}

function isPreviewSmartListInput(input: unknown): input is PreviewSmartListInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isSmartListCriteriaInput(input.criteria) &&
    isOptionalPositiveInteger(input.limit) &&
    isOptionalNonNegativeInteger(input.offset)
  );
}

function toFeatureSmartListCriteria(
  input: SmartListCriteriaInput
): FeatureSmartListCriteria {
  return {
    ...(input.match === undefined ? {} : { match: input.match }),
    ...(input.includeItems === undefined ? {} : { includeItems: input.includeItems }),
    ...(input.includeContainers === undefined
      ? {}
      : { includeContainers: input.includeContainers }),
    itemTypes: (input.itemTypes ?? []).filter(isItemTypeValue),
    containerTypes: (input.containerTypes ?? []).filter(isContainerTypeValue),
    tagSlugs: input.tagSlugs ?? [],
    categoryIds: input.categoryIds ?? [],
    ...(input.categoryMode === undefined ? {} : { categoryMode: input.categoryMode }),
    taskStatuses: (input.taskStatuses ?? []).filter(isTaskStatusValue),
    taskPriorities: (input.taskPriorities ?? []).filter(isTaskPriorityValue),
    ...(input.dueFilter === undefined ? {} : { dueFilter: input.dueFilter }),
    ...(input.customDueFrom === undefined
      ? {}
      : { customDueFrom: input.customDueFrom }),
    ...(input.customDueTo === undefined ? {} : { customDueTo: input.customDueTo })
  };
}

function isSmartListCriteriaInput(input: unknown): boolean {
  return (
    isRecord(input) &&
    (input.match === undefined || input.match === "all" || input.match === "any") &&
    isOptionalBoolean(input.includeItems) &&
    isOptionalBoolean(input.includeContainers) &&
    isOptionalStringArray(input.itemTypes) &&
    isOptionalStringArray(input.containerTypes) &&
    isOptionalStringArray(input.tagSlugs) &&
    isOptionalStringArray(input.categoryIds) &&
    (input.categoryMode === undefined ||
      input.categoryMode === "any" ||
      input.categoryMode === "is" ||
      input.categoryMode === "isEmpty" ||
      input.categoryMode === "isNotEmpty") &&
    isOptionalStringArray(input.taskStatuses) &&
    isOptionalNumberArray(input.taskPriorities) &&
    (input.dueFilter === undefined ||
      input.dueFilter === "any" ||
      input.dueFilter === "overdue" ||
      input.dueFilter === "today" ||
      input.dueFilter === "tomorrow" ||
      input.dueFilter === "next7Days" ||
      input.dueFilter === "next30Days" ||
      input.dueFilter === "noDueDate" ||
      input.dueFilter === "hasDueDate" ||
      input.dueFilter === "customRange") &&
    isOptionalNullableString(input.customDueFrom) &&
    isOptionalNullableString(input.customDueTo)
  );
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
  return value === undefined || value === null || typeof value === "number";
}

function isOptionalStringArray(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
  );
}

function isOptionalNumberArray(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((entry) => typeof entry === "number"))
  );
}

function isOptionalPositiveInteger(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isInteger(value) && value > 0)
  );
}

function isOptionalNonNegativeInteger(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isInteger(value) && value >= 0)
  );
}

function isOptionalActorType(value: unknown): boolean {
  return (
    value === undefined ||
    value === "local_user" ||
    value === "system" ||
    value === "importer"
  );
}

function isTaskStatusValue(value: unknown): value is TaskStatus {
  return (
    value === "open" ||
    value === "done" ||
    value === "waiting" ||
    value === "cancelled"
  );
}

function isTaskPriorityValue(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 5;
}

function isItemTypeValue(
  value: string
): value is NonNullable<FeatureSmartListCriteria["itemTypes"]>[number] {
  return (
    value === "task" ||
    value === "list" ||
    value === "note" ||
    value === "file" ||
    value === "link" ||
    value === "heading" ||
    value === "location" ||
    value === "comment"
  );
}

function isContainerTypeValue(
  value: string
): value is NonNullable<FeatureSmartListCriteria["containerTypes"]>[number] {
  return value === "inbox" || value === "project" || value === "contact";
}
