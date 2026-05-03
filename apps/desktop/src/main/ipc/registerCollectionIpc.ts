import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createCollectionIpcHandlers } from "./collectionHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerCollectionIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createCollectionIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.collections.listCollections,
    (_event, input) => handlers.handleListCollections(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.collections.createTagCollection,
    (_event, input) => handlers.handleCreateTagCollection(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.collections.createKeywordCollection,
    (_event, input) => handlers.handleCreateKeywordCollection(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.collections.evaluateCollection,
    (_event, input) => handlers.handleEvaluateCollection(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.collections.createTaskInCollection,
    (_event, input) => handlers.handleCreateTaskInCollection(input)
  );
}
