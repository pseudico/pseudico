import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createListIpcHandlers } from "./listHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerListIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createListIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.createList,
    (_event, input) => handlers.handleCreateList(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.addItem,
    (_event, input) => handlers.handleAddListItem(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.updateItem,
    (_event, input) => handlers.handleUpdateListItem(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.completeItem,
    (_event, input) => handlers.handleCompleteListItem(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.reopenItem,
    (_event, input) => handlers.handleReopenListItem(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.bulkAddItems,
    (_event, input) => handlers.handleBulkAddListItems(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.listByContainer,
    (_event, input) => handlers.handleListListsByContainer(input)
  );
}
