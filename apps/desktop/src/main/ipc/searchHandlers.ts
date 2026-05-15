import { SearchService, type SearchInput, type SearchResult } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type RecentSearchSummary,
  type SearchFilterInput,
  type SearchResultKind,
  type SearchResultSummary,
  type SearchWorkspaceInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type SearchIpcHandlers = {
  handleSearchWorkspace: (
    input: unknown
  ) => Promise<ApiResult<SearchResultSummary[]>>;
  handleSaveSearch: (
    input: unknown
  ) => Promise<ApiResult<{ savedViewId: string; name: string }>>;
  handleListRecentSearches: (
    workspaceId: unknown
  ) => Promise<ApiResult<RecentSearchSummary[]>>;
};

export function createSearchIpcHandlers(
  workspaceService: CurrentWorkspaceService
): SearchIpcHandlers {
  return {
    async handleSearchWorkspace(input) {
      if (!isSearchWorkspaceInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "searchWorkspace requires a query string or search filters and optional kinds, limit, offset, includeArchived, and includeDeleted fields."
        );
      }

      return await withSearchService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const queryInput: SearchInput = {
          workspaceId,
          query: input.query,
          ...(input.kinds === undefined ? {} : { kinds: input.kinds }),
          ...(input.filters === undefined ? {} : { filters: input.filters }),
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset }),
          ...(input.includeArchived === undefined
            ? {}
            : { includeArchived: input.includeArchived }),
          ...(input.includeDeleted === undefined
            ? {}
            : { includeDeleted: input.includeDeleted })
        };

        const results = context.searchService.search(queryInput).map(toSearchResultSummary);
        context.searchService.recordRecentSearch({
          workspaceId,
          query: input.query,
          filters: {
            ...(input.filters ?? {}),
            ...(input.kinds === undefined ? {} : { kinds: input.kinds }),
            ...(input.includeArchived === undefined
              ? {}
              : { includeArchived: input.includeArchived }),
            ...(input.includeDeleted === undefined
              ? {}
              : { includeDeleted: input.includeDeleted })
          }
        });

        return apiOk(results);
      });
    },

    async handleSaveSearch(input) {
      if (!isSaveSearchInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "saveSearch requires a workspaceId, query, and optional name/description."
        );
      }

      return await withSearchService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.searchService.saveStructuredSearch({
          workspaceId,
          query: input.query,
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.description === undefined ? {} : { description: input.description })
        });

        return apiOk({ savedViewId: result.savedView.id, name: result.savedView.name });
      });
    },

    async handleListRecentSearches(workspaceId) {
      if (workspaceId !== undefined && !isNonEmptyString(workspaceId)) {
        return apiError(
          "INVALID_INPUT",
          "listRecentSearches requires an optional workspaceId."
        );
      }

      return await withSearchService(workspaceService, async (context) => {
        const resolvedWorkspaceId = resolveWorkspaceId(
          workspaceId,
          context.workspace
        );

        return apiOk(context.searchService.listRecentSearches(resolvedWorkspaceId));
      });
    }
  };
}

async function withSearchService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    searchService: SearchService;
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
      searchService: new SearchService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Search operation failed."
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
    throw new Error("Search workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toSearchResultSummary(result: SearchResult): SearchResultSummary {
  return {
    id: result.id,
    workspaceId: result.workspaceId,
    targetType: result.targetType,
    targetId: result.targetId,
    kind: result.kind,
    title: result.title,
    body: result.body,
    status: result.status,
    tags: result.tags,
    category: result.category,
    updatedAt: result.updatedAt,
    archivedAt: result.archivedAt,
    deletedAt: result.deletedAt,
    containerId: result.containerId,
    containerTitle: result.containerTitle,
    parentItemId: result.parentItemId,
    parentItemTitle: result.parentItemTitle,
    destinationPath: result.destinationPath,
    dueAt: result.dueAt,
    taskStatus: result.taskStatus,
    score: result.score,
    titleHighlights: result.titleHighlights,
    excerpt: result.excerpt
  };
}

function isSaveSearchInput(input: unknown): input is { workspaceId?: string; query: string; name?: string; description?: string | null } {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isNonEmptyString(input.query) &&
    isOptionalString(input.name) &&
    (input.description === undefined || input.description === null || typeof input.description === "string")
  );
}

function isSearchWorkspaceInput(input: unknown): input is SearchWorkspaceInput {
  return (
    isRecord(input) &&
    typeof input.query === "string" &&
    (input.query.trim().length > 0 || hasSearchFilters(input.filters)) &&
    isOptionalString(input.workspaceId) &&
    isOptionalSearchResultKindArray(input.kinds) &&
    isOptionalSearchFilters(input.filters) &&
    isOptionalPositiveInteger(input.limit) &&
    isOptionalNonNegativeInteger(input.offset) &&
    isOptionalBoolean(input.includeArchived) &&
    isOptionalBoolean(input.includeDeleted)
  );
}

function hasSearchFilters(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (Array.isArray(value.kinds) && value.kinds.length > 0) ||
    (Array.isArray(value.tags) && value.tags.length > 0) ||
    isNonEmptyString(value.category) ||
    isNonEmptyString(value.status) ||
    value.due !== undefined ||
    value.includeArchived === true ||
    value.includeDeleted === true
  );
}

function isOptionalSearchFilters(value: unknown): value is SearchFilterInput | undefined {
  if (value === undefined) {
    return true;
  }

  return (
    isRecord(value) &&
    isOptionalSearchResultKindArray(value.kinds) &&
    (value.tags === undefined ||
      (Array.isArray(value.tags) && value.tags.every((tag) => typeof tag === "string"))) &&
    isOptionalString(value.category) &&
    isOptionalString(value.status) &&
    isOptionalSearchDueFilter(value.due) &&
    isOptionalBoolean(value.includeArchived) &&
    isOptionalBoolean(value.includeDeleted)
  );
}

function isOptionalSearchDueFilter(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  if (!isRecord(value) || typeof value.operator !== "string") {
    return false;
  }

  if (value.operator === "between") {
    return typeof value.from === "string" && typeof value.to === "string";
  }

  return (
    (value.operator === "before" ||
      value.operator === "after" ||
      value.operator === "on") &&
    typeof value.value === "string"
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

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
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

function isOptionalSearchResultKindArray(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every(isSearchResultKind))
  );
}

function isSearchResultKind(value: unknown): value is SearchResultKind {
  return (
    value === "inbox" ||
    value === "project" ||
    value === "contact" ||
    value === "task" ||
    value === "list" ||
    value === "note" ||
    value === "file" ||
    value === "link" ||
    value === "heading" ||
    value === "location" ||
    value === "comment" ||
    value === "list_item" ||
    value === "unknown"
  );
}
