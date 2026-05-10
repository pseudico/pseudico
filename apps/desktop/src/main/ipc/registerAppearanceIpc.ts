import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createAppearanceIpcHandlers } from "./appearanceHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerAppearanceIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createAppearanceIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.appearance.getSettings,
    (_event, input) => handlers.handleGetSettings(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.appearance.updateSettings,
    (_event, input) => handlers.handleUpdateSettings(input)
  );
}
