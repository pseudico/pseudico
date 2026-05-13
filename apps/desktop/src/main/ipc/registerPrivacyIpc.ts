import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createPrivacyIpcHandlers } from "./privacyHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerPrivacyIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createPrivacyIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.privacy.getSettings,
    (_event, input) => handlers.handleGetSettings(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.privacy.updateSettings,
    (_event, input) => handlers.handleUpdateSettings(input)
  );
}
