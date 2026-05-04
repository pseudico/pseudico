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
}
