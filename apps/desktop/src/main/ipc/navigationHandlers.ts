import {
  AppSettingsRepository,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  AppTabStore,
  NavigationHistoryService,
  PinnedFavoritesService,
  type AppTab,
  type AppTabSession,
  type CloseAppTabInput,
  type OpenAppTabInput,
  type PinnedFavoriteTarget,
  type RecordNavigationTargetInput,
  type ReorderAppTabsInput,
  type SetActiveAppTabInput,
  type NavigationRecentTarget
} from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type AppTabSessionSummary,
  type AppTabSummary,
  type NavigationRecentTargetSummary,
  type PinnedFavoriteTargetSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type NavigationIpcHandlers = {
  handleListRecentTargets: (
    input: unknown
  ) => Promise<ApiResult<NavigationRecentTargetSummary[]>>;
  handleRecordTarget: (
    input: unknown
  ) => Promise<ApiResult<NavigationRecentTargetSummary[]>>;
  handleListPinnedFavorites: (
    input: unknown
  ) => Promise<ApiResult<PinnedFavoriteTargetSummary[]>>;
  handleListAppTabs: (input: unknown) => Promise<ApiResult<AppTabSessionSummary>>;
  handleOpenAppTab: (input: unknown) => Promise<ApiResult<AppTabSessionSummary>>;
  handleCloseAppTab: (input: unknown) => Promise<ApiResult<AppTabSessionSummary>>;
  handleReorderAppTabs: (input: unknown) => Promise<ApiResult<AppTabSessionSummary>>;
  handleSetActiveAppTab: (input: unknown) => Promise<ApiResult<AppTabSessionSummary>>;
};

export function createNavigationIpcHandlers(
  workspaceService: CurrentWorkspaceService
): NavigationIpcHandlers {
  return {
    async handleListRecentTargets(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listRecentTargets requires an optional workspaceId string."
        );
      }

      return await withNavigationService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(
          context.navigationHistoryService
            .listRecentTargets(workspaceId)
            .map(toNavigationRecentTargetSummary)
        );
      });
    },

    async handleRecordTarget(input) {
      if (!isRecordNavigationTargetInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "recordTarget requires a target type, path, and label."
        );
      }

      return await withNavigationService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);

        return apiOk(
          context.navigationHistoryService
            .recordTarget({
              ...input,
              workspaceId
            })
            .map(toNavigationRecentTargetSummary)
        );
      });
    },

    async handleListPinnedFavorites(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listPinnedFavorites requires an optional workspaceId string."
        );
      }

      return await withNavigationService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(
          new PinnedFavoritesService({ connection: context.connection })
            .listPinnedFavorites({ workspaceId })
            .map(toPinnedFavoriteTargetSummary)
        );
      });
    },

    async handleListAppTabs(input) {
      if (input !== undefined && !isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listAppTabs requires an optional workspaceId string."
        );
      }

      return await withNavigationService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input, context.workspace);

        return apiOk(toAppTabSessionSummary(context.appTabStore.listTabs(workspaceId)));
      });
    },

    async handleOpenAppTab(input) {
      if (!isOpenAppTabInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "openAppTab requires a target type, path, and label."
        );
      }

      return await withNavigationService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const session = context.appTabStore.openTab({
          workspaceId,
          target: input.target
        });

        context.navigationHistoryService.recordTarget({
          workspaceId,
          target: input.target
        });

        return apiOk(toAppTabSessionSummary(session));
      });
    },

    async handleCloseAppTab(input) {
      if (!isCloseAppTabInput(input)) {
        return apiError("INVALID_INPUT", "closeAppTab requires a tabId.");
      }

      return await withNavigationService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);

        return apiOk(
          toAppTabSessionSummary(
            context.appTabStore.closeTab({ workspaceId, tabId: input.tabId })
          )
        );
      });
    },

    async handleReorderAppTabs(input) {
      if (!isReorderAppTabsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "reorderAppTabs requires a non-empty tabIds array."
        );
      }

      return await withNavigationService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);

        return apiOk(
          toAppTabSessionSummary(
            context.appTabStore.reorderTabs({
              workspaceId,
              tabIds: input.tabIds
            })
          )
        );
      });
    },

    async handleSetActiveAppTab(input) {
      if (!isSetActiveAppTabInput(input)) {
        return apiError("INVALID_INPUT", "setActiveAppTab requires a tabId.");
      }

      return await withNavigationService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);

        return apiOk(
          toAppTabSessionSummary(
            context.appTabStore.setActiveTab({ workspaceId, tabId: input.tabId })
          )
        );
      });
    }
  };
}

async function withNavigationService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    appTabStore: AppTabStore;
    connection: DatabaseConnection;
    navigationHistoryService: NavigationHistoryService;
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
  const appSettingsRepository = new AppSettingsRepository(connection);

  try {
    return await operation({
      appTabStore: new AppTabStore({ appSettingsRepository }),
      connection,
      navigationHistoryService: new NavigationHistoryService({
        appSettingsRepository
      }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Navigation operation failed."
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
    throw new Error("Navigation workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toNavigationRecentTargetSummary(
  target: NavigationRecentTarget
): NavigationRecentTargetSummary {
  return { ...target };
}

function toPinnedFavoriteTargetSummary(
  target: PinnedFavoriteTarget
): PinnedFavoriteTargetSummary {
  return { ...target };
}

function toAppTabSessionSummary(session: AppTabSession): AppTabSessionSummary {
  return {
    workspaceId: session.workspaceId,
    activeTabId: session.activeTabId,
    tabs: session.tabs.map(toAppTabSummary)
  };
}

function toAppTabSummary(tab: AppTab): AppTabSummary {
  return { ...tab };
}

function isRecordNavigationTargetInput(
  input: unknown
): input is RecordNavigationTargetInput {
  return (
    isRecord(input) &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
    isRecord(input.target) &&
    isNavigationTargetType(input.target.targetType) &&
    (input.target.targetId === undefined ||
      input.target.targetId === null ||
      isNonEmptyString(input.target.targetId)) &&
    isNonEmptyString(input.target.path) &&
    input.target.path.startsWith("/") &&
    isNonEmptyString(input.target.label) &&
    (input.target.subtitle === undefined ||
      input.target.subtitle === null ||
      typeof input.target.subtitle === "string")
  );
}

function isOpenAppTabInput(input: unknown): input is OpenAppTabInput {
  return isRecordNavigationTargetInput(input);
}

function isCloseAppTabInput(input: unknown): input is CloseAppTabInput {
  return (
    isRecord(input) &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
    isNonEmptyString(input.tabId)
  );
}

function isReorderAppTabsInput(input: unknown): input is ReorderAppTabsInput {
  return (
    isRecord(input) &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
    Array.isArray(input.tabIds) &&
    input.tabIds.length > 0 &&
    input.tabIds.every(isNonEmptyString)
  );
}

function isSetActiveAppTabInput(input: unknown): input is SetActiveAppTabInput {
  return isCloseAppTabInput(input);
}

function isNavigationTargetType(value: unknown): boolean {
  return (
    value === "view" ||
    value === "container" ||
    value === "item" ||
    value === "saved_view"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
