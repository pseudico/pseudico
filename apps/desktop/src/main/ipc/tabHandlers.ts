import { TabService } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type ContainerTabRecord,
  type DatabaseConnection,
  type TabSummaryRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type ContainerTabContentSummary,
  type ContainerTabSummary,
  type CreateContainerTabFromTemplateInput,
  type CreateContainerTabInput,
  type DeleteContainerTabInput,
  type RenameContainerTabInput,
  type ReorderContainerTabsInput,
  type TabTemplateSummary,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type TabIpcHandlers = {
  handleListTabs: (input: unknown) => Promise<ApiResult<ContainerTabSummary[]>>;
  handleListManagedTabs: (input: unknown) => Promise<ApiResult<ContainerTabSummary[]>>;
  handleListTabSummaries: (input: unknown) => Promise<ApiResult<ContainerTabContentSummary[]>>;
  handleListTabTemplates: () => Promise<ApiResult<TabTemplateSummary[]>>;
  handleCreateTab: (input: unknown) => Promise<ApiResult<ContainerTabSummary>>;
  handleCreateTabFromTemplate: (input: unknown) => Promise<ApiResult<ContainerTabSummary>>;
  handleRenameTab: (input: unknown) => Promise<ApiResult<ContainerTabSummary>>;
  handleReorderTabs: (input: unknown) => Promise<ApiResult<ContainerTabSummary[]>>;
  handleHideTab: (input: unknown) => Promise<ApiResult<ContainerTabSummary>>;
  handleShowTab: (input: unknown) => Promise<ApiResult<ContainerTabSummary>>;
  handleDuplicateTab: (input: unknown) => Promise<ApiResult<ContainerTabSummary>>;
  handleArchiveTab: (input: unknown) => Promise<ApiResult<ContainerTabSummary>>;
  handleDeleteTab: (input: unknown) => Promise<ApiResult<ContainerTabSummary>>;
};

export function createTabIpcHandlers(
  workspaceService: CurrentWorkspaceService
): TabIpcHandlers {
  return {
    async handleListTabs(input) {
      if (!isNonEmptyString(input)) {
        return apiError("INVALID_INPUT", "listTabs requires a containerId string.");
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(context.tabService.listTabs(input).map(toContainerTabSummary))
      );
    },

    async handleListManagedTabs(input) {
      if (!isNonEmptyString(input)) {
        return apiError("INVALID_INPUT", "listManagedTabs requires a containerId string.");
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(
          context.tabService
            .listTabs(input, { includeHidden: true, includeArchived: true })
            .map(toContainerTabSummary)
        )
      );
    },

    async handleListTabTemplates() {
      return await withTabService(workspaceService, async (context) =>
        apiOk(context.tabService.listTabTemplates())
      );
    },



    async handleListTabSummaries(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listTabSummaries requires a containerId string."
        );
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(
          context.tabService
            .listTabSummaries(input, { todayStart: getLocalDayStartIso() })
            .map(toContainerTabContentSummary)
        )
      );
    },

    async handleCreateTab(input) {
      if (!isCreateContainerTabInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createTab requires containerId and name fields."
        );
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(toContainerTabSummary(await context.tabService.createTab(input)))
      );
    },

    async handleCreateTabFromTemplate(input) {
      if (!isCreateContainerTabFromTemplateInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createTabFromTemplate requires containerId and templateId fields."
        );
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(toContainerTabSummary(await context.tabService.createTabFromTemplate(input)))
      );
    },

    async handleRenameTab(input) {
      if (!isRenameContainerTabInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "renameTab requires tabId and name fields."
        );
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(toContainerTabSummary(await context.tabService.renameTab(input)))
      );
    },

    async handleReorderTabs(input) {
      if (!isReorderContainerTabsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "reorderTabs requires containerId and tabIds fields."
        );
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(
          (await context.tabService.reorderTabs(input)).map(toContainerTabSummary)
        )
      );
    },

    async handleHideTab(input) {
      if (!isNonEmptyString(input)) {
        return apiError("INVALID_INPUT", "hideTab requires a tabId string.");
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(toContainerTabSummary(await context.tabService.hideTab({ tabId: input })))
      );
    },

    async handleShowTab(input) {
      if (!isNonEmptyString(input)) {
        return apiError("INVALID_INPUT", "showTab requires a tabId string.");
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(toContainerTabSummary(await context.tabService.showTab({ tabId: input })))
      );
    },

    async handleDuplicateTab(input) {
      if (!isNonEmptyString(input)) {
        return apiError("INVALID_INPUT", "duplicateTab requires a tabId string.");
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(toContainerTabSummary(await context.tabService.duplicateTab({ tabId: input })))
      );
    },

    async handleArchiveTab(input) {
      if (!isNonEmptyString(input)) {
        return apiError("INVALID_INPUT", "archiveTab requires a tabId string.");
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(toContainerTabSummary(await context.tabService.archiveTab({ tabId: input })))
      );
    },

    async handleDeleteTab(input) {
      if (!isDeleteContainerTabInput(input)) {
        return apiError("INVALID_INPUT", "deleteTab requires a tabId string or delete input.");
      }

      return await withTabService(workspaceService, async (context) =>
        apiOk(toContainerTabSummary(await context.tabService.deleteTab(
          typeof input === "string" ? { tabId: input } : input
        )))
      );
    }
  };
}

async function withTabService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    tabService: TabService;
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
      tabService: new TabService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Tab operation failed."
    );
  } finally {
    connection.close();
  }
}

function toContainerTabSummary(tab: ContainerTabRecord): ContainerTabSummary {
  return {
    id: tab.id,
    workspaceId: tab.workspaceId,
    containerId: tab.containerId,
    name: tab.name,
    description: tab.description,
    sortOrder: tab.sortOrder,
    isDefault: tab.isDefault,
    createdAt: tab.createdAt,
    updatedAt: tab.updatedAt,
    hiddenAt: tab.hiddenAt,
    archivedAt: tab.archivedAt,
    deletedAt: tab.deletedAt
  };
}


function toContainerTabContentSummary(
  summary: TabSummaryRecord
): ContainerTabContentSummary {
  return {
    tab: toContainerTabSummary(summary.tab),
    totalItemCount: summary.totalItemCount,
    openTaskCount: summary.openTaskCount,
    completedTaskCount: summary.completedTaskCount,
    overdueTaskCount: summary.overdueTaskCount,
    upcomingTaskCount: summary.upcomingTaskCount,
    noteCount: summary.noteCount,
    fileCount: summary.fileCount,
    linkCount: summary.linkCount,
    listCount: summary.listCount,
    openTaskPreviews: summary.openTaskPreviews,
    recentContentPreviews: summary.recentContentPreviews
  };
}

function getLocalDayStartIso(date = new Date()): string {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  ).toISOString();
}

function isCreateContainerTabInput(
  input: unknown
): input is CreateContainerTabInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.containerId) &&
    isNonEmptyString(input.name) &&
    isOptionalNullableString(input.description) &&
    isOptionalNumber(input.sortOrder)
  );
}

function isCreateContainerTabFromTemplateInput(
  input: unknown
): input is CreateContainerTabFromTemplateInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.containerId) &&
    isNonEmptyString(input.templateId) &&
    isOptionalNullableString(input.name)
  );
}

function isRenameContainerTabInput(
  input: unknown
): input is RenameContainerTabInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.tabId) &&
    isNonEmptyString(input.name) &&
    isOptionalNullableString(input.description)
  );
}

function isReorderContainerTabsInput(
  input: unknown
): input is ReorderContainerTabsInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.containerId) &&
    Array.isArray(input.tabIds) &&
    input.tabIds.every(isNonEmptyString)
  );
}

function isDeleteContainerTabInput(
  input: unknown
): input is string | DeleteContainerTabInput {
  if (isNonEmptyString(input)) {
    return true;
  }

  return (
    isRecord(input) &&
    isNonEmptyString(input.tabId) &&
    (input.itemHandling === undefined ||
      input.itemHandling === "reject" ||
      input.itemHandling === "move_to_default" ||
      input.itemHandling === "archive_items") &&
    isOptionalNullableString(input.targetTabId)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === "number";
}
