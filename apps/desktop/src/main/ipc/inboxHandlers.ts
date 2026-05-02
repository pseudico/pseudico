import { InboxService } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type ContainerRecord,
  type DatabaseConnection,
  type ItemRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type InboxSummary,
  type ItemSummary,
  type MoveInboxItemToProjectInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type InboxIpcHandlers = {
  handleGetInbox: (input: unknown) => Promise<ApiResult<InboxSummary>>;
  handleListInboxItems: (input: unknown) => Promise<ApiResult<ItemSummary[]>>;
  handleMoveInboxItemToProject: (
    input: unknown
  ) => Promise<ApiResult<ItemSummary>>;
};

export function createInboxIpcHandlers(
  workspaceService: CurrentWorkspaceService
): InboxIpcHandlers {
  return {
    async handleGetInbox(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "getInbox requires an optional workspaceId string."
        );
      }

      return await withInboxService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(toInboxSummary(context.inboxService.getInbox(workspaceId)));
      });
    },

    async handleListInboxItems(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listInboxItems requires an optional workspaceId string."
        );
      }

      return await withInboxService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(
          context.inboxService.listInboxItems(workspaceId).map(toItemSummary)
        );
      });
    },

    async handleMoveInboxItemToProject(input) {
      if (!isMoveInboxItemToProjectInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "moveInboxItemToProject requires itemId and projectId strings."
        );
      }

      return await withInboxService(workspaceService, async (context) => {
        const result = await context.inboxService.moveInboxItemToProject(input);

        return apiOk(toItemSummary(result.item));
      });
    }
  };
}

async function withInboxService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    inboxService: InboxService;
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
      inboxService: new InboxService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Inbox operation failed."
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
    throw new Error("Inbox workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toInboxSummary(inbox: ContainerRecord): InboxSummary {
  if (inbox.type !== "inbox") {
    throw new Error(`Expected Inbox container but received ${inbox.type}.`);
  }

  return {
    id: inbox.id,
    workspaceId: inbox.workspaceId,
    type: "inbox",
    name: inbox.name,
    slug: inbox.slug,
    description: inbox.description,
    status: inbox.status as InboxSummary["status"],
    categoryId: inbox.categoryId,
    color: inbox.color,
    isFavorite: inbox.isFavorite,
    sortOrder: inbox.sortOrder,
    createdAt: inbox.createdAt,
    updatedAt: inbox.updatedAt,
    archivedAt: inbox.archivedAt,
    deletedAt: inbox.deletedAt
  };
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

function isMoveInboxItemToProjectInput(
  input: unknown
): input is MoveInboxItemToProjectInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    isNonEmptyString(input.projectId)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
