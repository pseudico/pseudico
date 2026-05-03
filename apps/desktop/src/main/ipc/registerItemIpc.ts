import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createItemIpcHandlers } from "./itemHandlers";
import { handleGetModuleStatus } from "./moduleStatusHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerItemIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createItemIpcHandlers(workspaceService);

  registerTypedIpcHandler(LOCAL_WORK_OS_IPC_CHANNELS.items.getStatus, () =>
    handleGetModuleStatus("items")
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.items.moveItem,
    (_event, input) => handlers.handleMoveItem(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.items.archiveItem,
    (_event, input) => handlers.handleArchiveItem(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.items.softDeleteItem,
    (_event, input) => handlers.handleSoftDeleteItem(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.items.getItemActivity,
    (_event, input) => handlers.handleGetItemActivity(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.items.openItemInspector,
    (_event, input) => handlers.handleOpenItemInspector(input)
  );
}
