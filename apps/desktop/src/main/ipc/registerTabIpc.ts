import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import { createTabIpcHandlers } from "./tabHandlers";

export function registerTabIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createTabIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabs,
    (_event, input) => handlers.handleListTabs(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabSummaries,
    (_event, input) => handlers.handleListTabSummaries(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.createTab,
    (_event, input) => handlers.handleCreateTab(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.renameTab,
    (_event, input) => handlers.handleRenameTab(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.reorderTabs,
    (_event, input) => handlers.handleReorderTabs(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.deleteTab,
    (_event, input) => handlers.handleDeleteTab(input)
  );
}
