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
    LOCAL_WORK_OS_IPC_CHANNELS.lists.enablePipelineMode,
    (_event, input) => handlers.handleEnablePipelineMode(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.disablePipelineMode,
    (_event, input) => handlers.handleDisablePipelineMode(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.getPipelineViewModel,
    (_event, input) => handlers.handleGetPipelineViewModel(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.movePipelineCard,
    (_event, input) => handlers.handleMovePipelineCard(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.indentItem,
    (_event, input) => handlers.handleIndentListItem(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.outdentItem,
    (_event, input) => handlers.handleOutdentListItem(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.moveItem,
    (_event, input) => handlers.handleMoveListItem(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.moveItemToList,
    (_event, input) => handlers.handleMoveListItemToList(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.bulkAddItems,
    (_event, input) => handlers.handleBulkAddListItems(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.bulkUpdateItems,
    (_event, input) => handlers.handleBulkUpdateListItems(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.listByContainer,
    (_event, input) => handlers.handleListListsByContainer(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.saveAsTemplate,
    (_event, input) => handlers.handleSaveListAsTemplate(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.createFromTemplate,
    (_event, input) => handlers.handleCreateListFromTemplate(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.lists.listTemplates,
    (_event, input) => handlers.handleListTemplates(input)
  );
}
