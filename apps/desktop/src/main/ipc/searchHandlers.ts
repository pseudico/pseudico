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
};

export function createSearchIpcHandlers(
  workspaceService: CurrentWorkspaceService
): SearchIpcHandlers {
  return {
    async handleSearchWorkspace(input) {
      if (!isSearchWorkspaceInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "searchWorkspace requires a query string and optional kinds, limit, includeArchived, and includeDeleted fields."
        );
      }

      return await withSearchService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const queryInput: SearchInput = {
          workspaceId,
          query: input.query,
          ...(input.kinds === undefined ? {} : { kinds: input.kinds }),
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.includeArchived === undefined
            ? {}
            : { includeArchived: input.includeArchived }),
          ...(input.includeDeleted === undefined
            ? {}
            : { includeDeleted: input.includeDeleted })
        };

        return apiOk(context.searchService.search(queryInput).map(toSearchResultSummary));
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
    destinationPath: result.destinationPath
  };
}

function isSearchWorkspaceInput(input: unknown): input is SearchWorkspaceInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.query) &&
    isOptionalString(input.workspaceId) &&
    isOptionalSearchResultKindArray(input.kinds) &&
    isOptionalPositiveInteger(input.limit) &&
    isOptionalBoolean(input.includeArchived) &&
    isOptionalBoolean(input.includeDeleted)
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
