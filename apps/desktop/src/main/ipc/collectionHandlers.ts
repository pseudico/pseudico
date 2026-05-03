import { CollectionService, TagService } from "@local-work-os/features";
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
  type CreateTagCollectionInput,
  type CreateTaskInCollectionInput,
  type ItemTagSummary,
  type TaskStatus,
  type TaskSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

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
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "evaluateCollection requires a collectionId string."
        );
      }

      return await withCollectionService(workspaceService, async (context) => {
        const result = context.collectionService.evaluateCollection(input);

        if (result.collection.workspaceId !== context.workspace.id) {
          throw new Error("Collection workspace must match the current workspace.");
        }

        return apiOk({
          collection: result.collection,
          total: result.total,
          results: result.results.map(toCollectionResultSummary),
          groups: result.groups.map(toCollectionResultGroupSummary)
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
    }
  };
}

async function withCollectionService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    collectionService: CollectionService;
    connection: DatabaseConnection;
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
