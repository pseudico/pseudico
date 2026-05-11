import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import { createViewModeIpcHandlers } from "./viewModeHandlers";

export function registerViewModeIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createViewModeIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.viewModes.getViewMode,
    (_event, input) => handlers.handleGetViewMode(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.viewModes.setViewMode,
    (_event, input) => handlers.handleSetViewMode(input)
  );
}
