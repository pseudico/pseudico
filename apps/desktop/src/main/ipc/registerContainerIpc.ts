import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  ContainerGroupingService,
  ContainerPreferencesService,
  type ContainerGroupingPreferences,
  type ContainerGroupingViewModel,
  type ContainerPreferences
} from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type ContainerGroupingPreferencesSummary,
  type ContainerGroupingViewModelSummary,
  type ContainerPreferencesSummary,
  type GetContainerGroupingInput,
  type UpdateContainerGroupingPreferencesInput,
  type UpdateContainerPreferencesInput,
  type WorkspaceSummary
} from "../../preload/api";
import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import { handleGetModuleStatus } from "./moduleStatusHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<WorkspaceFileSystemService, "getCurrentWorkspace">;

export function registerContainerIpc(
  workspaceService?: CurrentWorkspaceService
): void {
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.containers.getStatus,
    () => handleGetModuleStatus("containers")
  );

  if (workspaceService === undefined) {
    return;
  }

  const handlers = createContainerIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.containers.getPreferences,
    handlers.handleGetPreferences
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.containers.updatePreferences,
    handlers.handleUpdatePreferences
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.containers.getGrouping,
    handlers.handleGetGrouping
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.containers.getGroupingPreferences,
    handlers.handleGetGroupingPreferences
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.containers.updateGroupingPreferences,
    handlers.handleUpdateGroupingPreferences
  );
}

type ContainerIpcHandlers = {
  handleGetPreferences: (input: unknown) => Promise<ApiResult<ContainerPreferencesSummary>>;
  handleUpdatePreferences: (input: unknown) => Promise<ApiResult<ContainerPreferencesSummary>>;
  handleGetGrouping: (input: unknown) => Promise<ApiResult<ContainerGroupingViewModelSummary>>;
  handleGetGroupingPreferences: (
    input: unknown
  ) => Promise<ApiResult<ContainerGroupingPreferencesSummary>>;
  handleUpdateGroupingPreferences: (
    input: unknown
  ) => Promise<ApiResult<ContainerGroupingPreferencesSummary>>;
};

export function createContainerIpcHandlers(
  workspaceService: CurrentWorkspaceService
): ContainerIpcHandlers {
  return {
    async handleGetPreferences(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "getContainerPreferences requires a containerId string."
        );
      }

      return await withContainerPreferencesService(workspaceService, async (context) =>
        apiOk(toContainerPreferencesSummary(context.service.getPreferences(input)))
      );
    },

    async handleUpdatePreferences(input) {
      if (!isUpdateContainerPreferencesInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateContainerPreferences requires a containerId and at least one valid preference value."
        );
      }

      return await withContainerPreferencesService(workspaceService, async (context) =>
        apiOk(
          toContainerPreferencesSummary(
            await context.service.updatePreferences({
              containerId: input.containerId,
              ...(input.defaultView === undefined ? {} : { defaultView: input.defaultView }),
              ...(input.defaultTabId === undefined
                ? {}
                : { defaultTabId: input.defaultTabId }),
              ...(input.showCompleted === undefined
                ? {}
                : { showCompleted: input.showCompleted }),
              ...(input.grouping === undefined ? {} : { grouping: input.grouping }),
              ...(input.defaultQuickAddType === undefined
                ? {}
                : { defaultQuickAddType: input.defaultQuickAddType }),
              ...(input.summaryFirst === undefined
                ? {}
                : { summaryFirst: input.summaryFirst }),
              ...(input.compactMode === undefined ? {} : { compactMode: input.compactMode })
            })
          )
        )
      );
    },

    async handleGetGrouping(input) {
      if (!isGetContainerGroupingInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "getContainerGrouping requires workspaceId and containerType."
        );
      }

      return await withContainerGroupingService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);

        return apiOk(
          toContainerGroupingViewModelSummary(
            context.service.getViewModel({
              ...input,
              workspaceId
            })
          )
        );
      });
    },

    async handleGetGroupingPreferences(input) {
      if (!isContainerGroupingPreferenceTarget(input)) {
        return apiError(
          "INVALID_INPUT",
          "getContainerGroupingPreferences requires workspaceId and containerType."
        );
      }

      return await withContainerGroupingService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);

        return apiOk(
          toContainerGroupingPreferencesSummary(
            context.service.getPreferences({
              workspaceId,
              containerType: input.containerType
            })
          )
        );
      });
    },

    async handleUpdateGroupingPreferences(input) {
      if (!isUpdateContainerGroupingPreferencesInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateContainerGroupingPreferences requires containerType plus a mode or collapsed group keys."
        );
      }

      return await withContainerGroupingService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);

        return apiOk(
          toContainerGroupingPreferencesSummary(
            await context.service.updatePreferences({
              ...input,
              workspaceId
            })
          )
        );
      });
    }
  };
}

async function withContainerPreferencesService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    service: ContainerPreferencesService;
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
      service: new ContainerPreferencesService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Container preference operation failed."
    );
  } finally {
    connection.close();
  }
}

async function withContainerGroupingService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    service: ContainerGroupingService;
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
      service: new ContainerGroupingService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Container grouping operation failed."
    );
  } finally {
    connection.close();
  }
}

function toContainerPreferencesSummary(
  preferences: ContainerPreferences
): ContainerPreferencesSummary {
  return { ...preferences };
}

function toContainerGroupingPreferencesSummary(
  preferences: ContainerGroupingPreferences
): ContainerGroupingPreferencesSummary {
  return { ...preferences };
}

function toContainerGroupingViewModelSummary(
  viewModel: ContainerGroupingViewModel
): ContainerGroupingViewModelSummary {
  return { ...viewModel };
}

function isUpdateContainerPreferencesInput(
  input: unknown
): input is UpdateContainerPreferencesInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.containerId) &&
    (input.defaultView === undefined ||
      input.defaultView === "feed" ||
      input.defaultView === "tab" ||
      input.defaultView === "summary") &&
    (input.defaultTabId === undefined ||
      input.defaultTabId === null ||
      isNonEmptyString(input.defaultTabId)) &&
    (input.showCompleted === undefined || typeof input.showCompleted === "boolean") &&
    (input.grouping === undefined ||
      input.grouping === "none" ||
      input.grouping === "type" ||
      input.grouping === "tab" ||
      input.grouping === "status") &&
    (input.defaultQuickAddType === undefined ||
      input.defaultQuickAddType === "task" ||
      input.defaultQuickAddType === "note" ||
      input.defaultQuickAddType === "list" ||
      input.defaultQuickAddType === "link" ||
      input.defaultQuickAddType === "file") &&
    (input.summaryFirst === undefined || typeof input.summaryFirst === "boolean") &&
    (input.compactMode === undefined || typeof input.compactMode === "boolean") &&
    (input.defaultView !== undefined ||
      input.defaultTabId !== undefined ||
      input.showCompleted !== undefined ||
      input.grouping !== undefined ||
      input.defaultQuickAddType !== undefined ||
      input.summaryFirst !== undefined ||
      input.compactMode !== undefined)
  );
}

function isGetContainerGroupingInput(input: unknown): input is GetContainerGroupingInput {
  return (
    isRecord(input) &&
    isOptionalNonEmptyString(input.workspaceId) &&
    isContainerGroupingType(input.containerType) &&
    (input.mode === undefined ||
      isContainerGroupingModeForType(input.containerType, input.mode)) &&
    (input.includeArchived === undefined || typeof input.includeArchived === "boolean") &&
    (input.staleAfterDays === undefined ||
      (typeof input.staleAfterDays === "number" &&
        Number.isInteger(input.staleAfterDays) &&
        input.staleAfterDays >= 1 &&
        input.staleAfterDays <= 3660))
  );
}

function isContainerGroupingPreferenceTarget(
  input: unknown
): input is Pick<UpdateContainerGroupingPreferencesInput, "workspaceId" | "containerType"> {
  return (
    isRecord(input) &&
    isOptionalNonEmptyString(input.workspaceId) &&
    isContainerGroupingType(input.containerType)
  );
}

function isUpdateContainerGroupingPreferencesInput(
  input: unknown
): input is UpdateContainerGroupingPreferencesInput {
  return (
    isRecord(input) &&
    isOptionalNonEmptyString(input.workspaceId) &&
    isContainerGroupingType(input.containerType) &&
    (input.mode === undefined ||
      isContainerGroupingModeForType(input.containerType, input.mode)) &&
    (input.collapsedGroupKeys === undefined ||
      (Array.isArray(input.collapsedGroupKeys) &&
        input.collapsedGroupKeys.every((key) => typeof key === "string"))) &&
    (input.mode !== undefined || input.collapsedGroupKeys !== undefined)
  );
}

function isContainerGroupingType(value: unknown): value is "project" | "contact" {
  return value === "project" || value === "contact";
}

function isContainerGroupingModeForType(
  containerType: "project" | "contact",
  value: unknown
): boolean {
  return containerType === "project"
    ? value === "none" ||
        value === "category" ||
        value === "tag" ||
        value === "status" ||
        value === "favorite" ||
        value === "stale"
    : value === "none" ||
        value === "company" ||
        value === "label" ||
        value === "tag" ||
        value === "category";
}

function isOptionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || isNonEmptyString(value);
}

function resolveWorkspaceId(
  workspaceId: string | undefined,
  workspace: WorkspaceSummary
): string {
  return workspaceId ?? workspace.id;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
