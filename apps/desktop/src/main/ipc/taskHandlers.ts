import { TagService, TaskService } from "@local-work-os/features";
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
  type CreateTaskInput,
  type ItemTagSummary,
  type RescheduleTaskInput,
  type SnoozeTaskInput,
  type TaskStatus,
  type TaskSummary,
  type UpdateTaskInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type TaskIpcHandlers = {
  handleCreateTask: (input: unknown) => Promise<ApiResult<TaskSummary>>;
  handleUpdateTask: (input: unknown) => Promise<ApiResult<TaskSummary>>;
  handleCompleteTask: (input: unknown) => Promise<ApiResult<TaskSummary>>;
  handleReopenTask: (input: unknown) => Promise<ApiResult<TaskSummary>>;
  handleSnoozeTask: (input: unknown) => Promise<ApiResult<TaskSummary>>;
  handleRescheduleTask: (input: unknown) => Promise<ApiResult<TaskSummary>>;
  handleListTasksByContainer: (
    input: unknown
  ) => Promise<ApiResult<TaskSummary[]>>;
};

export function createTaskIpcHandlers(
  workspaceService: CurrentWorkspaceService
): TaskIpcHandlers {
  return {
    async handleCreateTask(input) {
      if (!isCreateTaskInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createTask requires containerId and title fields."
        );
      }

      return await withTaskService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.taskService.createTask({
          ...input,
          workspaceId
        });

        return apiOk(toTaskSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleUpdateTask(input) {
      if (!isUpdateTaskInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateTask requires an itemId and at least one task update field."
        );
      }

      return await withTaskService(workspaceService, async (context) => {
        const result = await context.taskService.updateTask(input);
        return apiOk(toTaskSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleCompleteTask(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "completeTask requires an itemId string."
        );
      }

      return await withTaskService(workspaceService, async (context) => {
        const result = await context.taskService.completeTask(input);
        return apiOk(toTaskSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleReopenTask(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "reopenTask requires an itemId string."
        );
      }

      return await withTaskService(workspaceService, async (context) => {
        const result = await context.taskService.reopenTask(input);
        return apiOk(toTaskSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleSnoozeTask(input) {
      if (!isSnoozeTaskInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "snoozeTask requires itemId and either preset or dueAt."
        );
      }

      return await withTaskService(workspaceService, async (context) => {
        const result = await context.taskService.snoozeTask(input);
        return apiOk(toTaskSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleRescheduleTask(input) {
      if (!isRescheduleTaskInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "rescheduleTask requires itemId and dueAt."
        );
      }

      return await withTaskService(workspaceService, async (context) => {
        const result = await context.taskService.rescheduleTask(input);
        return apiOk(toTaskSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleListTasksByContainer(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listTasksByContainer requires a containerId string."
        );
      }

      return await withTaskService(workspaceService, async (context) => {
        const tasks = context.taskService.listTasksByContainer(input);
        const tagsByItemId = context.tagService.hydrateItemTags({
          workspaceId: context.workspace.id,
          itemIds: tasks.map((task) => task.item.id)
        });

        return apiOk(
          tasks.map((task) => toTaskSummary(task, tagsByItemId[task.item.id] ?? []))
        );
      });
    }
  };
}

async function withTaskService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    tagService: TagService;
    taskService: TaskService;
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
      tagService: new TagService({ connection }),
      taskService: new TaskService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Task operation failed."
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
    throw new Error("Task workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function hydrateSingleItemTags(
  context: {
    tagService: TagService;
    workspace: WorkspaceSummary;
  },
  itemId: string
): TaggedTargetRecord[] {
  return context.tagService.hydrateItemTags({
    workspaceId: context.workspace.id,
    itemIds: [itemId]
  })[itemId] ?? [];
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

function isCreateTaskInput(input: unknown): input is CreateTaskInput {
  return (
    isRecord(input) &&
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

function isUpdateTaskInput(input: unknown): input is UpdateTaskInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    (input.title === undefined || isNonEmptyString(input.title)) &&
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
    (input.status === undefined || isTaskStatusValue(input.status)) &&
    hasTaskUpdateField(input)
  );
}

function hasTaskUpdateField(input: Record<string, unknown>): boolean {
  return [
    "allDay",
    "body",
    "categoryId",
    "containerTabId",
    "dueAt",
    "pinned",
    "priority",
    "sortOrder",
    "startAt",
    "status",
    "timezone",
    "title"
  ].some((field) => input[field] !== undefined);
}

function isSnoozeTaskInput(input: unknown): input is SnoozeTaskInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    (input.preset === undefined ||
      input.preset === "tomorrow" ||
      input.preset === "next_week") &&
    (input.dueAt === undefined || isNonEmptyString(input.dueAt)) &&
    isOptionalDateInput(input.date) &&
    isOptionalActorType(input.actorType) &&
    ((input.preset === undefined) !== (input.dueAt === undefined))
  );
}

function isRescheduleTaskInput(input: unknown): input is RescheduleTaskInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    (input.dueAt === null || isNonEmptyString(input.dueAt)) &&
    isOptionalNullableString(input.startAt) &&
    isOptionalBoolean(input.allDay) &&
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
  return value === undefined || isNonEmptyString(value);
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalDateInput(value: unknown): boolean {
  return value === undefined || typeof value === "string" || value instanceof Date;
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
