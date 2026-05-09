import { MetadataBrowserService, TagService } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type CategoryWithTargetCountRecord,
  type DatabaseConnection,
  type MetadataTargetRecord,
  type TagWithTargetCountRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type AddTagToTargetInput,
  type ApiResult,
  type CategoryCountSummary,
  type ItemTagSummary,
  type ListTargetsByMetadataInput,
  type MetadataTargetSummary,
  type RemoveTagFromTargetInput,
  type TagCountSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type MetadataIpcHandlers = {
  handleListTagsWithCounts: (
    input: unknown
  ) => Promise<ApiResult<TagCountSummary[]>>;
  handleListCategoriesWithCounts: (
    input: unknown
  ) => Promise<ApiResult<CategoryCountSummary[]>>;
  handleListTargetsByMetadata: (
    input: unknown
  ) => Promise<ApiResult<MetadataTargetSummary[]>>;
  handleAddTagToTarget: (input: unknown) => Promise<ApiResult<ItemTagSummary>>;
  handleRemoveTagFromTarget: (
    input: unknown
  ) => Promise<ApiResult<ItemTagSummary | null>>;
};

export function createMetadataIpcHandlers(
  workspaceService: CurrentWorkspaceService
): MetadataIpcHandlers {
  return {
    async handleListTagsWithCounts(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listTagsWithCounts requires an optional workspaceId string."
        );
      }

      return await withMetadataBrowserService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(
          context.metadataBrowserService
            .listTagsWithCounts(workspaceId)
            .map(toTagCountSummary)
        );
      });
    },

    async handleListCategoriesWithCounts(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listCategoriesWithCounts requires an optional workspaceId string."
        );
      }

      return await withMetadataBrowserService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(
          context.metadataBrowserService
            .listCategoriesWithCounts(workspaceId)
            .map(toCategoryCountSummary)
        );
      });
    },

    async handleListTargetsByMetadata(input) {
      if (!isListTargetsByMetadataInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "listTargetsByMetadata requires optional tagSlugs, categoryId, categorySlug, includeArchived, and includeDeleted fields."
        );
      }

      return await withMetadataBrowserService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);

        return apiOk(
          context.metadataBrowserService
            .listTargetsByMetadata({ ...input, workspaceId })
            .map(toMetadataTargetSummary)
        );
      });
    },

    async handleAddTagToTarget(input) {
      if (!isAddTagToTargetInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "addTagToTarget requires targetType, targetId, and name strings."
        );
      }

      return await withMetadataBrowserService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.tagService.addTagToTarget({
          ...input,
          workspaceId
        });

        return apiOk(toItemTagSummaryFromTag(result.tag));
      });
    },

    async handleRemoveTagFromTarget(input) {
      if (!isRemoveTagFromTargetInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "removeTagFromTarget requires targetType, targetId, and a name or tagId."
        );
      }

      return await withMetadataBrowserService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.tagService.removeTagFromTarget({
          ...input,
          workspaceId
        });

        return apiOk(result === null ? null : toItemTagSummaryFromTag(result.tag));
      });
    }
  };
}

async function withMetadataBrowserService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    metadataBrowserService: MetadataBrowserService;
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
      connection,
      metadataBrowserService: new MetadataBrowserService({ connection }),
      tagService: new TagService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Metadata browser operation failed."
    );
  } finally {
    connection.close();
  }
}

function toItemTagSummaryFromTag(tag: {
  id: string;
  name: string;
  slug: string;
}): ItemTagSummary {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    source: "manual"
  };
}

function resolveWorkspaceId(
  requestedWorkspaceId: string | undefined,
  currentWorkspace: WorkspaceSummary
): string {
  if (
    requestedWorkspaceId !== undefined &&
    requestedWorkspaceId !== currentWorkspace.id
  ) {
    throw new Error("Metadata workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toTagCountSummary(tag: TagWithTargetCountRecord): TagCountSummary {
  return {
    id: tag.id,
    workspaceId: tag.workspaceId,
    name: tag.name,
    slug: tag.slug,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
    deletedAt: tag.deletedAt,
    targetCount: tag.targetCount
  };
}

function toCategoryCountSummary(
  category: CategoryWithTargetCountRecord
): CategoryCountSummary {
  return {
    id: category.id,
    workspaceId: category.workspaceId,
    name: category.name,
    slug: category.slug,
    color: category.color,
    description: category.description,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    deletedAt: category.deletedAt,
    targetCount: category.targetCount
  };
}

function toMetadataTargetSummary(
  target: MetadataTargetRecord
): MetadataTargetSummary {
  return {
    targetType: target.targetType,
    targetId: target.targetId,
    workspaceId: target.workspaceId,
    kind: target.kind,
    title: target.title,
    body: target.body,
    status: target.status,
    category: target.category,
    tags: target.tags.map(toItemTagSummary),
    createdAt: target.createdAt,
    updatedAt: target.updatedAt,
    archivedAt: target.archivedAt,
    deletedAt: target.deletedAt
  };
}

function toItemTagSummary(tag: MetadataTargetRecord["tags"][number]): ItemTagSummary {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    source: tag.taggingSource
  };
}

function isListTargetsByMetadataInput(
  input: unknown
): input is ListTargetsByMetadataInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isOptionalStringArray(input.tagSlugs) &&
    isOptionalNullableString(input.categoryId) &&
    isOptionalNullableString(input.categorySlug) &&
    isOptionalBoolean(input.includeArchived) &&
    isOptionalBoolean(input.includeDeleted)
  );
}

function isAddTagToTargetInput(input: unknown): input is AddTagToTargetInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isTaggingTargetType(input.targetType) &&
    isNonEmptyString(input.targetId) &&
    isNonEmptyString(input.name)
  );
}

function isRemoveTagFromTargetInput(
  input: unknown
): input is RemoveTagFromTargetInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isTaggingTargetType(input.targetType) &&
    isNonEmptyString(input.targetId) &&
    isOptionalString(input.name) &&
    isOptionalString(input.tagId) &&
    (isNonEmptyString(input.name) || isNonEmptyString(input.tagId))
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
  return value === undefined || value === null || isNonEmptyString(value);
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function isOptionalStringArray(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every(isNonEmptyString));
}

function isTaggingTargetType(
  value: unknown
): value is AddTagToTargetInput["targetType"] {
  return value === "container" || value === "item" || value === "list_item";
}
