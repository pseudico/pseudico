import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createDashboardIpcHandlers } from "./dashboardHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerDashboardIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createDashboardIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dashboard.getDefault,
    (_event, input) => handlers.handleGetDefaultDashboard(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dashboard.listWidgetDefinitions,
    () => handlers.handleListWidgetDefinitions()
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dashboard.addWidget,
    (_event, input) => handlers.handleAddWidget(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dashboard.updateWidget,
    (_event, input) => handlers.handleUpdateWidget(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dashboard.removeWidget,
    (_event, input) => handlers.handleRemoveWidget(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dashboard.reorderWidgets,
    (_event, input) => handlers.handleReorderWidgets(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dashboard.updateLayout,
    (_event, input) => handlers.handleUpdateLayout(input)
  );
}
