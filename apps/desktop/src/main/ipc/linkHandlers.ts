import {
  LinkMetadataService,
  LinkService,
  PrivacySettingsService,
  TagService,
  type LinkMetadataFetcher
} from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type LinkWithItemRecord,
  type TaggedTargetRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type CreateLinkInput,
  type FetchLinkMetadataInput,
  type ItemTagSummary,
  type LinkSummary,
  type OpenExternalUrlSummary,
  type OpenLinkSummary,
  type UpdateLinkInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type LinkIpcHandlers = {
  handleCreateLink: (input: unknown) => Promise<ApiResult<LinkSummary>>;
  handleUpdateLink: (input: unknown) => Promise<ApiResult<LinkSummary>>;
  handleListLinksByContainer: (
    input: unknown
  ) => Promise<ApiResult<LinkSummary[]>>;
  handleFetchLinkMetadata: (input: unknown) => Promise<ApiResult<LinkSummary>>;
  handleOpenLinkExternally: (
    input: unknown
  ) => Promise<ApiResult<OpenLinkSummary>>;
  handleOpenUrlExternally: (
    input: unknown
  ) => Promise<ApiResult<OpenExternalUrlSummary>>;
};

export type LinkIpcPlatform = {
  fetch?: LinkMetadataFetcher;
  openExternal: (url: string) => Promise<void>;
};

export function createLinkIpcHandlers(
  workspaceService: CurrentWorkspaceService,
  platform: LinkIpcPlatform = {
    fetch: async (url, init) => {
      if (globalThis.fetch === undefined) {
        throw new Error("Link metadata fetch is unavailable.");
      }

      return await globalThis.fetch(url, init);
    },
    openExternal: async () => undefined
  }
): LinkIpcHandlers {
  return {
    async handleCreateLink(input) {
      if (!isCreateLinkInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createLink requires containerId and url fields."
        );
      }

      return await withLinkService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.linkService.createLink({
          ...input,
          workspaceId
        });

        return apiOk(toLinkSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleUpdateLink(input) {
      if (!isUpdateLinkInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateLink requires an itemId and at least one link update field."
        );
      }

      return await withLinkService(workspaceService, async (context) => {
        const result = await context.linkService.updateLink(input);
        return apiOk(toLinkSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleListLinksByContainer(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listLinksByContainer requires a containerId string."
        );
      }

      return await withLinkService(workspaceService, async (context) => {
        const links = context.linkService.listLinksByContainer(input);
        const tagsByItemId = context.tagService.hydrateItemTags({
          workspaceId: context.workspace.id,
          itemIds: links.map((link) => link.item.id)
        });

        return apiOk(
          links.map((link) => toLinkSummary(link, tagsByItemId[link.item.id] ?? []))
        );
      });
    },

    async handleFetchLinkMetadata(input) {
      if (!isFetchLinkMetadataInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "fetchLinkMetadata requires an itemId string."
        );
      }

      return await withLinkService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await new LinkMetadataService({
          fetcher: platform.fetch ?? defaultLinkMetadataFetch,
          linkService: context.linkService,
          networkFeatureGuard: new PrivacySettingsService({
            connection: context.connection
          })
        }).fetchAndApply({
          itemId: input.itemId,
          workspaceId
        });

        return apiOk(
          toLinkSummary(
            result.link,
            hydrateSingleItemTags(context, result.link.item.id)
          )
        );
      });
    },

    async handleOpenLinkExternally(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "openLinkExternally requires an itemId string."
        );
      }

      return await withLinkService(workspaceService, async (context) => {
        const link = context.linkService.getLinkByItemId(input);

        if (link === null) {
          return apiError("WORKSPACE_ERROR", "Link was not found.");
        }

        const normalizedUrl = context.linkService.normaliseUrl(
          link.link.normalizedUrl
        );

        await platform.openExternal(normalizedUrl);

        return apiOk({
          itemId: link.item.id,
          url: link.link.url,
          normalizedUrl
        });
      });
    },

    async handleOpenUrlExternally(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "openUrlExternally requires a URL string."
        );
      }

      return await withLinkService(workspaceService, async (context) => {
        const normalizedUrl = context.linkService.normaliseUrl(input);

        await platform.openExternal(normalizedUrl);

        return apiOk({
          url: input.trim(),
          normalizedUrl
        });
      });
    }
  };
}

async function defaultLinkMetadataFetch(
  url: string,
  init: Parameters<LinkMetadataFetcher>[1]
): ReturnType<LinkMetadataFetcher> {
  if (globalThis.fetch === undefined) {
    throw new Error("Link metadata fetch is unavailable.");
  }

  return await globalThis.fetch(url, init);
}

async function withLinkService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    linkService: LinkService;
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
      linkService: new LinkService({ connection }),
      tagService: new TagService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Link operation failed."
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
    throw new Error("Link workspaceId must match the current workspace.");
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

function toLinkSummary(
  linkWithItem: LinkWithItemRecord,
  tags: readonly TaggedTargetRecord[] = []
): LinkSummary {
  const { item, link } = linkWithItem;

  if (item.type !== "link") {
    throw new Error(`Expected link item but received ${item.type}.`);
  }

  return {
    id: item.id,
    workspaceId: item.workspaceId,
    containerId: item.containerId,
    containerTabId: item.containerTabId,
    type: "link",
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
    url: link.url,
    normalizedUrl: link.normalizedUrl,
    linkTitle: link.title,
    description: link.description,
    domain: link.domain,
    faviconPath: link.faviconPath,
    previewImagePath: link.previewImagePath,
    linkCreatedAt: link.createdAt,
    linkUpdatedAt: link.updatedAt
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

function isCreateLinkInput(input: unknown): input is CreateLinkInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isNonEmptyString(input.containerId) &&
    isNonEmptyString(input.url) &&
    isOptionalNullableNonEmptyString(input.title) &&
    isOptionalNullableString(input.description) &&
    isOptionalNullableString(input.categoryId) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalNumber(input.sortOrder) &&
    isOptionalBoolean(input.pinned) &&
    isOptionalActorType(input.actorType)
  );
}

function isUpdateLinkInput(input: unknown): input is UpdateLinkInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    (input.url === undefined || isNonEmptyString(input.url)) &&
    isOptionalNullableNonEmptyString(input.title) &&
    isOptionalNullableString(input.description) &&
    isOptionalNullableString(input.categoryId) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalNullableString(input.faviconPath) &&
    isOptionalNullableString(input.previewImagePath) &&
    isOptionalNumber(input.sortOrder) &&
    isOptionalBoolean(input.pinned) &&
    isOptionalActorType(input.actorType) &&
    hasLinkUpdateField(input)
  );
}

function hasLinkUpdateField(input: Record<string, unknown>): boolean {
  return [
    "categoryId",
    "containerTabId",
    "description",
    "faviconPath",
    "pinned",
    "previewImagePath",
    "sortOrder",
    "title",
    "url"
  ].some((field) => input[field] !== undefined);
}

function isFetchLinkMetadataInput(
  input: unknown
): input is FetchLinkMetadataInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    isOptionalString(input.workspaceId)
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

function isOptionalNullableNonEmptyString(value: unknown): boolean {
  return value === undefined || value === null || isNonEmptyString(value);
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
