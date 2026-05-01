import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createWorkspaceIpcHandlers } from "./workspaceHandlers";

export function registerWorkspaceIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createWorkspaceIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workspace.createWorkspace,
    (_event, input) => handlers.handleCreateWorkspace(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workspace.openWorkspace,
    (_event, input) => handlers.handleOpenWorkspace(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workspace.validateWorkspace,
    (_event, input) => handlers.handleValidateWorkspace(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace,
    () => handlers.handleGetCurrentWorkspace()
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workspace.listRecentWorkspaces,
    () => handlers.handleListRecentWorkspaces()
  );
}
