import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createCategoryIpcHandlers } from "./categoryHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerCategoryIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createCategoryIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.categories.createCategory,
    (_event, input) => handlers.handleCreateCategory(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.categories.updateCategory,
    (_event, input) => handlers.handleUpdateCategory(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.categories.deleteCategory,
    (_event, input) => handlers.handleDeleteCategory(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.categories.listCategories,
    (_event, input) => handlers.handleListCategories(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToProject,
    (_event, input) => handlers.handleAssignCategoryToProject(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToItem,
    (_event, input) => handlers.handleAssignCategoryToItem(input)
  );
}
