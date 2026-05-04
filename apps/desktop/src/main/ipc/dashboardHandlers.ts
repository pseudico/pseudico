import {
  DashboardService,
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
  type DashboardRecordSummary,
  type DashboardViewModelSummary,
  type DashboardWidgetDataSummary,
  type DashboardWidgetRecordSummary,
  type DashboardWidgetSummary,
  type GetDefaultDashboardInput,
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
};

export function createDashboardIpcHandlers(
  workspaceService: CurrentWorkspaceService
): DashboardIpcHandlers {
  return {
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
