import {
  DASHBOARD_WIDGET_REGISTRY,
  DashboardService,
  type DashboardWidgetDefinition,
  type DashboardViewModel,
  type DashboardWidgetData,
  type DashboardWidgetViewModel
} from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DashboardRecord,
  type DashboardWidgetRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type AddDashboardWidgetInput,
  type DashboardRecordSummary,
  type DashboardViewModelSummary,
  type DashboardWidgetDataSummary,
  type DashboardWidgetRecordSummary,
  type DashboardWidgetDefinitionSummary,
  type DashboardWidgetSummary,
  type GetDefaultDashboardInput,
  type RemoveDashboardWidgetInput,
  type ReorderDashboardWidgetsInput,
  type UpdateDashboardLayoutInput,
  type UpdateDashboardWidgetInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type DashboardIpcHandlers = {
  handleGetDefaultDashboard: (
    input: unknown
  ) => Promise<ApiResult<DashboardViewModelSummary>>;
  handleListWidgetDefinitions: () => Promise<ApiResult<DashboardWidgetDefinitionSummary[]>>;
  handleAddWidget: (input: unknown) => Promise<ApiResult<DashboardWidgetSummary>>;
  handleUpdateWidget: (input: unknown) => Promise<ApiResult<DashboardWidgetSummary>>;
  handleRemoveWidget: (input: unknown) => Promise<ApiResult<DashboardWidgetRecordSummary>>;
  handleReorderWidgets: (input: unknown) => Promise<ApiResult<DashboardViewModelSummary>>;
  handleUpdateLayout: (input: unknown) => Promise<ApiResult<DashboardRecordSummary>>;
};

export function createDashboardIpcHandlers(
  workspaceService: CurrentWorkspaceService
): DashboardIpcHandlers {
  return {

    async handleListWidgetDefinitions() {
      return apiOk(
        DASHBOARD_WIDGET_REGISTRY.map(toDashboardWidgetDefinitionSummary)
      );
    },

    async handleAddWidget(input) {
      if (!isAddDashboardWidgetInput(input)) {
        return apiError("INVALID_INPUT", "addWidget requires a widget type and optional dashboard config.");
      }
      return await withDashboardService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const widget = await context.dashboardService.addWidget({ ...input, workspaceId, actorType: "local_user" });
        return apiOk(toDashboardWidgetSummary(widget));
      });
    },

    async handleUpdateWidget(input) {
      if (!isUpdateDashboardWidgetInput(input)) {
        return apiError("INVALID_INPUT", "updateWidget requires widgetId and valid widget config.");
      }
      return await withDashboardService(workspaceService, async (context) => {
        const widget = await context.dashboardService.updateWidget({ ...input, actorType: "local_user" });
        return apiOk(toDashboardWidgetSummary(widget));
      });
    },

    async handleRemoveWidget(input) {
      if (!isRemoveDashboardWidgetInput(input)) {
        return apiError("INVALID_INPUT", "removeWidget requires widgetId.");
      }
      return await withDashboardService(workspaceService, async (context) => {
        const widget = await context.dashboardService.removeWidget({ ...input, actorType: "local_user" });
        return apiOk(toDashboardWidgetRecordSummary(widget));
      });
    },

    async handleReorderWidgets(input) {
      if (!isReorderDashboardWidgetsInput(input)) {
        return apiError("INVALID_INPUT", "reorderWidgets requires dashboardId and widgetIds.");
      }
      return await withDashboardService(workspaceService, async (context) => {
        const viewModel = await context.dashboardService.reorderWidgets({ ...input, actorType: "local_user" });
        return apiOk(toDashboardViewModelSummary(viewModel));
      });
    },

    async handleUpdateLayout(input) {
      if (!isUpdateDashboardLayoutInput(input)) {
        return apiError("INVALID_INPUT", "updateLayout requires dashboardId and layout object.");
      }
      return await withDashboardService(workspaceService, async (context) => {
        const dashboard = await context.dashboardService.updateLayout({ ...input, actorType: "local_user" });
        return apiOk(toDashboardRecordSummary(dashboard));
      });
    },
    async handleGetDefaultDashboard(input) {
      if (!isGetDefaultDashboardInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "getDefaultDashboard requires an optional workspaceId."
        );
      }

      return await withDashboardService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(
          input?.workspaceId,
          context.workspace
        );
        const viewModel = await context.dashboardService.getDefaultDashboard({
          workspaceId
        });

        return apiOk(toDashboardViewModelSummary(viewModel));
      });
    }
  };
}

async function withDashboardService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    dashboardService: DashboardService;
    connection: DatabaseConnection;
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
      dashboardService: new DashboardService({ connection }),
      connection,
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Dashboard operation failed."
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
    throw new Error("Dashboard workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toDashboardViewModelSummary(
  viewModel: DashboardViewModel
): DashboardViewModelSummary {
  return {
    dashboard: toDashboardRecordSummary(viewModel.dashboard),
    widgets: viewModel.widgets.map(toDashboardWidgetSummary)
  };
}

function toDashboardRecordSummary(
  dashboard: DashboardRecord
): DashboardRecordSummary {
  return {
    id: dashboard.id,
    workspaceId: dashboard.workspaceId,
    name: dashboard.name,
    isDefault: dashboard.isDefault,
    layoutJson: dashboard.layoutJson,
    createdAt: dashboard.createdAt,
    updatedAt: dashboard.updatedAt,
    deletedAt: dashboard.deletedAt
  };
}

function toDashboardWidgetSummary(
  widget: DashboardWidgetViewModel
): DashboardWidgetSummary {
  return {
    widget: toDashboardWidgetRecordSummary(widget.widget),
    data: widget.data === null ? null : toDashboardWidgetDataSummary(widget.data)
  };
}

function toDashboardWidgetRecordSummary(
  widget: DashboardWidgetRecord
): DashboardWidgetRecordSummary {
  return {
    id: widget.id,
    workspaceId: widget.workspaceId,
    dashboardId: widget.dashboardId,
    type: widget.type,
    title: widget.title,
    savedViewId: widget.savedViewId,
    configJson: widget.configJson,
    positionJson: widget.positionJson,
    sortOrder: widget.sortOrder,
    createdAt: widget.createdAt,
    updatedAt: widget.updatedAt,
    deletedAt: widget.deletedAt
  };
}

function toDashboardWidgetDataSummary(
  data: DashboardWidgetData
): DashboardWidgetDataSummary {
  return data;
}


function toDashboardWidgetDefinitionSummary(
  definition: DashboardWidgetDefinition
): DashboardWidgetDefinitionSummary {
  return { ...definition };
}

function isAddDashboardWidgetInput(input: unknown): input is AddDashboardWidgetInput {
  return isRecord(input) && isOptionalNonEmptyString(input.workspaceId) && isOptionalNonEmptyString(input.dashboardId) && isNonEmptyString(input.type) && isOptionalNullableString(input.title) && isOptionalNullableString(input.savedViewId) && isOptionalRecord(input.config) && isOptionalPosition(input.position);
}

function isUpdateDashboardWidgetInput(input: unknown): input is UpdateDashboardWidgetInput {
  return isRecord(input) && isNonEmptyString(input.widgetId) && isOptionalNullableString(input.title) && isOptionalNullableString(input.savedViewId) && isOptionalRecord(input.config) && isOptionalPosition(input.position) && isOptionalInteger(input.sortOrder);
}

function isRemoveDashboardWidgetInput(input: unknown): input is RemoveDashboardWidgetInput {
  return isRecord(input) && isNonEmptyString(input.widgetId);
}

function isReorderDashboardWidgetsInput(input: unknown): input is ReorderDashboardWidgetsInput {
  return isRecord(input) && isNonEmptyString(input.dashboardId) && Array.isArray(input.widgetIds) && input.widgetIds.every(isNonEmptyString);
}

function isUpdateDashboardLayoutInput(input: unknown): input is UpdateDashboardLayoutInput {
  return isRecord(input) && isNonEmptyString(input.dashboardId) && isRecord(input.layout);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalRecord(value: unknown): boolean {
  return value === undefined || isRecord(value);
}

function isOptionalInteger(value: unknown): boolean {
  return value === undefined || (Number.isInteger(value) && Number.isFinite(value));
}

function isOptionalPosition(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }
  return isRecord(value) && Number.isInteger(value.column) && Number.isInteger(value.row) && isOptionalInteger(value.width) && isOptionalInteger(value.height);
}

function isGetDefaultDashboardInput(
  input: unknown
): input is GetDefaultDashboardInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) && isOptionalNonEmptyString(input.workspaceId))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalNonEmptyString(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.trim().length > 0);
}
