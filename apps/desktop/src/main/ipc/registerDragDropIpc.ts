import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createDragDropIpcHandlers } from "./dragDropHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerDragDropIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createDragDropIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderItems,
    (_event, input) => handlers.handleReorderItems(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.moveItem,
    (_event, input) => handlers.handleMoveItem(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderListItems,
    (_event, input) => handlers.handleReorderListItems(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderTabs,
    (_event, input) => handlers.handleReorderTabs(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.attachFilesToContainer,
    (_event, input) => handlers.handleAttachFilesToContainer(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.attachFilesToItem,
    (_event, input) => handlers.handleAttachFilesToItem(input)
  );
}
