import {
  ContactLabelBrowserService,
  MetadataBrowserService,
  ProjectTagBrowserService,
  TagService
} from "@local-work-os/features";
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
  type ContactLabelBrowserInput,
  type ContactLabelBrowserSummary,
  type ItemTagSummary,
  type ListTargetsByMetadataInput,
  type MetadataTargetSummary,
  type ProjectTagBrowserInput,
  type ProjectTagBrowserSummary,
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
  handleGetProjectTagBrowser: (
    input: unknown
  ) => Promise<ApiResult<ProjectTagBrowserSummary>>;
  handleGetContactLabelBrowser: (
    input: unknown
  ) => Promise<ApiResult<ContactLabelBrowserSummary>>;
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

    async handleGetProjectTagBrowser(input) {
      if (!isProjectTagBrowserInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "getProjectTagBrowser requires optional workspaceId, tagSlugs, categoryId, and status fields."
        );
      }

      return await withMetadataBrowserService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);

        return apiOk(toProjectTagBrowserSummary(
          context.projectTagBrowserService.getViewModel({ ...input, workspaceId })
        ));
      });
    },

    async handleGetContactLabelBrowser(input) {
      if (!isContactLabelBrowserInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "getContactLabelBrowser requires optional workspaceId, fieldFilters, company, role, location, emailDomain, tagSlugs, categoryId, status, groupBy, and fieldGroupLabel fields."
        );
      }

      return await withMetadataBrowserService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);

        return apiOk(toContactLabelBrowserSummary(
          context.contactLabelBrowserService.getViewModel({ ...input, workspaceId })
        ));
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
    projectTagBrowserService: ProjectTagBrowserService;
    contactLabelBrowserService: ContactLabelBrowserService;
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
      projectTagBrowserService: new ProjectTagBrowserService({ connection }),
      contactLabelBrowserService: new ContactLabelBrowserService({ connection }),
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
    targetCount: tag.targetCount,
    containerCount: tag.containerCount,
    itemCount: tag.itemCount,
    listItemCount: tag.listItemCount
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
    targetCount: category.targetCount,
    containerCount: category.containerCount,
    itemCount: category.itemCount,
    listItemCount: category.listItemCount
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


function toProjectTagBrowserSummary(
  viewModel: ReturnType<ProjectTagBrowserService["getViewModel"]>
): ProjectTagBrowserSummary {
  return {
    workspaceId: viewModel.workspaceId,
    generatedAt: viewModel.generatedAt,
    filters: viewModel.filters,
    selectedTags: viewModel.selectedTags.map((tag) => ({
      id: tag.id,
      workspaceId: tag.workspaceId,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      deletedAt: tag.deletedAt
    })),
    tagFacets: viewModel.tagFacets.map((tag) => ({
      id: tag.id,
      workspaceId: tag.workspaceId,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      deletedAt: tag.deletedAt,
      projectCount: tag.projectCount
    })),
    categoryFacets: viewModel.categoryFacets.map((category) => ({
      id: category.id,
      workspaceId: category.workspaceId,
      name: category.name,
      slug: category.slug,
      color: category.color,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt,
      projectCount: category.projectCount
    })),
    statusFacets: viewModel.statusFacets,
    projects: viewModel.projects.map((project) => ({
      id: project.id,
      workspaceId: project.workspaceId,
      type: "project",
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: project.status as ProjectTagBrowserSummary["projects"][number]["status"],
      categoryId: project.categoryId,
      color: project.color,
      isFavorite: project.isFavorite,
      sortOrder: project.sortOrder,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      archivedAt: project.archivedAt,
      deletedAt: project.deletedAt,
      category: project.category,
      tags: project.tags.map(toItemTagSummary)
    })),
    totalProjectCount: viewModel.totalProjectCount
  };
}

function toContactLabelBrowserSummary(
  viewModel: ReturnType<ContactLabelBrowserService["getViewModel"]>
): ContactLabelBrowserSummary {
  return {
    workspaceId: viewModel.workspaceId,
    generatedAt: viewModel.generatedAt,
    filters: viewModel.filters,
    selectedTags: viewModel.selectedTags.map((tag) => ({
      id: tag.id,
      workspaceId: tag.workspaceId,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      deletedAt: tag.deletedAt
    })),
    fieldFacets: viewModel.fieldFacets,
    companyFacets: viewModel.companyFacets,
    roleFacets: viewModel.roleFacets,
    locationFacets: viewModel.locationFacets,
    emailDomainFacets: viewModel.emailDomainFacets,
    tagFacets: viewModel.tagFacets.map((tag) => ({
      id: tag.id,
      workspaceId: tag.workspaceId,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      deletedAt: tag.deletedAt,
      contactCount: tag.contactCount
    })),
    categoryFacets: viewModel.categoryFacets.map((category) => ({
      id: category.id,
      workspaceId: category.workspaceId,
      name: category.name,
      slug: category.slug,
      color: category.color,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt,
      contactCount: category.contactCount
    })),
    statusFacets: viewModel.statusFacets,
    contacts: viewModel.contacts.map(toContactLabelBrowserContactSummary),
    groups: viewModel.groups.map((group) => ({
      key: group.key,
      label: group.label,
      contactCount: group.contactCount,
      contacts: group.contacts.map(toContactLabelBrowserContactSummary)
    })),
    totalContactCount: viewModel.totalContactCount
  };
}

function toContactLabelBrowserContactSummary(
  contact: ReturnType<ContactLabelBrowserService["getViewModel"]>["contacts"][number]
): ContactLabelBrowserSummary["contacts"][number] {
  return {
    id: contact.id,
    workspaceId: contact.workspaceId,
    type: "contact",
    name: contact.name,
    slug: contact.slug,
    description: contact.description,
    status: contact.status as ContactLabelBrowserSummary["contacts"][number]["status"],
    categoryId: contact.categoryId,
    color: contact.color,
    isFavorite: contact.isFavorite,
    sortOrder: contact.sortOrder,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    archivedAt: contact.archivedAt,
    deletedAt: contact.deletedAt,
    category: contact.category,
    fields: contact.fields.map((field) => ({
      id: field.id,
      workspaceId: field.workspaceId,
      containerId: field.containerId,
      label: field.label,
      labelKey: field.labelKey,
      value: field.value,
      valueKey: field.valueKey,
      type: field.type,
      sortOrder: field.sortOrder,
      createdAt: field.createdAt,
      updatedAt: field.updatedAt,
      deletedAt: field.deletedAt
    })),
    tags: contact.tags.map(toItemTagSummary)
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


function isProjectTagBrowserInput(input: unknown): input is ProjectTagBrowserInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isOptionalStringArray(input.tagSlugs) &&
    isOptionalNullableString(input.categoryId) &&
    (input.status === undefined ||
      input.status === null ||
      input.status === "active" ||
      input.status === "waiting" ||
      input.status === "completed" ||
      input.status === "archived")
  );
}

function isContactLabelBrowserInput(
  input: unknown
): input is ContactLabelBrowserInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    (input.fieldFilters === undefined ||
      (Array.isArray(input.fieldFilters) &&
        input.fieldFilters.every(
          (filter) =>
            isRecord(filter) &&
            isNonEmptyString(filter.label) &&
            isNonEmptyString(filter.value)
        ))) &&
    isOptionalNullableString(input.company) &&
    isOptionalNullableString(input.role) &&
    isOptionalNullableString(input.location) &&
    isOptionalNullableString(input.emailDomain) &&
    isOptionalStringArray(input.tagSlugs) &&
    isOptionalNullableString(input.categoryId) &&
    (input.status === undefined ||
      input.status === null ||
      input.status === "active" ||
      input.status === "waiting" ||
      input.status === "completed" ||
      input.status === "archived") &&
    (input.groupBy === undefined ||
      input.groupBy === null ||
      input.groupBy === "company" ||
      input.groupBy === "role" ||
      input.groupBy === "location" ||
      input.groupBy === "emailDomain" ||
      input.groupBy === "category" ||
      input.groupBy === "tag" ||
      input.groupBy === "status" ||
      input.groupBy === "field") &&
    isOptionalNullableString(input.fieldGroupLabel)
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
