import { CategoryService } from "@local-work-os/features";
import {
  ContainerRepository,
  ItemRepository,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type CategoryRecord,
  type ContainerRecord,
  type DatabaseConnection,
  type ItemRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type AssignCategoryToItemInput,
  type AssignCategoryToProjectInput,
  type CategorySummary,
  type CreateCategoryInput,
  type ItemSummary,
  type ProjectSummary,
  type ProjectStatus,
  type UpdateCategoryInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type CategoryIpcHandlers = {
  handleCreateCategory: (input: unknown) => Promise<ApiResult<CategorySummary>>;
  handleUpdateCategory: (input: unknown) => Promise<ApiResult<CategorySummary>>;
  handleDeleteCategory: (input: unknown) => Promise<ApiResult<CategorySummary>>;
  handleListCategories: (
    input: unknown
  ) => Promise<ApiResult<CategorySummary[]>>;
  handleAssignCategoryToProject: (
    input: unknown
  ) => Promise<ApiResult<ProjectSummary>>;
  handleAssignCategoryToItem: (input: unknown) => Promise<ApiResult<ItemSummary>>;
};

export function createCategoryIpcHandlers(
  workspaceService: CurrentWorkspaceService
): CategoryIpcHandlers {
  return {
    async handleCreateCategory(input) {
      if (!isCreateCategoryInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createCategory requires name and color fields."
        );
      }

      return await withCategoryService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const category = await context.categoryService.createCategory({
          ...input,
          workspaceId
        });

        return apiOk(toCategorySummary(category));
      });
    },

    async handleUpdateCategory(input) {
      if (!isUpdateCategoryInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateCategory requires a categoryId and at least one update field."
        );
      }

      return await withCategoryService(workspaceService, async (context) =>
        apiOk(
          toCategorySummary(await context.categoryService.updateCategory(input))
        )
      );
    },

    async handleDeleteCategory(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "deleteCategory requires a categoryId string."
        );
      }

      return await withCategoryService(workspaceService, async (context) => {
        const result = await context.categoryService.deleteOrArchiveCategory(input);

        return apiOk(toCategorySummary(result.category));
      });
    },

    async handleListCategories(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listCategories requires an optional workspaceId string."
        );
      }

      return await withCategoryService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(
          context.categoryService
            .listCategories(workspaceId)
            .map(toCategorySummary)
        );
      });
    },

    async handleAssignCategoryToProject(input) {
      if (!isAssignCategoryToProjectInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "assignToProject requires projectId and optional categoryId."
        );
      }

      return await withCategoryService(workspaceService, async (context) => {
        const project = requireProject(context.connection, input.projectId);
        await context.categoryService.assignCategoryToContainer({
          workspaceId: project.workspaceId,
          containerId: input.projectId,
          categoryId: input.categoryId ?? null
        });

        return apiOk(toProjectSummary(requireProject(context.connection, input.projectId)));
      });
    },

    async handleAssignCategoryToItem(input) {
      if (!isAssignCategoryToItemInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "assignToItem requires itemId and optional categoryId."
        );
      }

      return await withCategoryService(workspaceService, async (context) => {
        const item = requireItem(context.connection, input.itemId);
        await context.categoryService.assignCategoryToItem({
          workspaceId: item.workspaceId,
          itemId: input.itemId,
          categoryId: input.categoryId ?? null
        });

        return apiOk(toItemSummary(requireItem(context.connection, input.itemId)));
      });
    }
  };
}

async function withCategoryService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    categoryService: CategoryService;
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
      categoryService: new CategoryService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Category operation failed."
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
    throw new Error("Category workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function requireProject(
  connection: DatabaseConnection,
  projectId: string
): ContainerRecord {
  const project = new ContainerRepository(connection).getById(projectId);

  if (project === null || project.type !== "project") {
    throw new Error(`Project was not found: ${projectId}.`);
  }

  return project;
}

function requireItem(connection: DatabaseConnection, itemId: string): ItemRecord {
  const item = new ItemRepository(connection).getById(itemId);

  if (item === null) {
    throw new Error(`Item was not found: ${itemId}.`);
  }

  return item;
}

function toCategorySummary(category: CategoryRecord): CategorySummary {
  return {
    id: category.id,
    workspaceId: category.workspaceId,
    name: category.name,
    slug: category.slug,
    color: category.color,
    description: category.description,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    deletedAt: category.deletedAt
  };
}

function toProjectSummary(project: ContainerRecord): ProjectSummary {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    type: "project",
    name: project.name,
    slug: project.slug,
    description: project.description,
    status: toProjectStatus(project.status),
    categoryId: project.categoryId,
    color: project.color,
    isFavorite: project.isFavorite,
    sortOrder: project.sortOrder,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    archivedAt: project.archivedAt,
    deletedAt: project.deletedAt
  };
}

function toProjectStatus(status: string): ProjectStatus {
  if (
    status === "active" ||
    status === "waiting" ||
    status === "completed" ||
    status === "archived"
  ) {
    return status;
  }

  throw new Error(`Unsupported project status: ${status}.`);
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

function isCreateCategoryInput(input: unknown): input is CreateCategoryInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.name) &&
    isNonEmptyString(input.color) &&
    isOptionalString(input.workspaceId) &&
    isOptionalNullableString(input.description)
  );
}

function isUpdateCategoryInput(input: unknown): input is UpdateCategoryInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.categoryId) &&
    isOptionalString(input.name) &&
    isOptionalString(input.color) &&
    isOptionalNullableString(input.description) &&
    ["name", "color", "description"].some((field) => input[field] !== undefined)
  );
}

function isAssignCategoryToProjectInput(
  input: unknown
): input is AssignCategoryToProjectInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.projectId) &&
    isOptionalNullableString(input.categoryId)
  );
}

function isAssignCategoryToItemInput(
  input: unknown
): input is AssignCategoryToItemInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    isOptionalNullableString(input.categoryId)
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
