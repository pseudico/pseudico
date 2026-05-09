import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createNavigationIpcHandlers } from "./navigationHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerNavigationIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createNavigationIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.navigation.listRecentTargets,
    (_event, input) => handlers.handleListRecentTargets(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.navigation.recordTarget,
    (_event, input) => handlers.handleRecordTarget(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.navigation.listPinnedFavorites,
    (_event, input) => handlers.handleListPinnedFavorites(input)
  );
}
