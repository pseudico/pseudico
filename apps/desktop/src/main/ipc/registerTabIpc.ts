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
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.listManagedTabs,
    (_event, input) => handlers.handleListManagedTabs(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabSummaries,
    (_event, input) => handlers.handleListTabSummaries(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabTemplates,
    () => handlers.handleListTabTemplates()
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.createTab,
    (_event, input) => handlers.handleCreateTab(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.createTabFromTemplate,
    (_event, input) => handlers.handleCreateTabFromTemplate(input)
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
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.hideTab,
    (_event, input) => handlers.handleHideTab(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.showTab,
    (_event, input) => handlers.handleShowTab(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.duplicateTab,
    (_event, input) => handlers.handleDuplicateTab(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.archiveTab,
    (_event, input) => handlers.handleArchiveTab(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tabs.deleteTab,
    (_event, input) => handlers.handleDeleteTab(input)
  );
}
