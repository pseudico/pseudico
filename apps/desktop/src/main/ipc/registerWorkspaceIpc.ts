import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import {
  handleCreateWorkspace,
  handleGetCurrentWorkspace,
  handleListRecentWorkspaces,
  handleOpenWorkspace
} from "./workspaceHandlers";

export function registerWorkspaceIpc(): void {
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workspace.createWorkspace,
    (_event, input) => handleCreateWorkspace(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workspace.openWorkspace,
    (_event, input) => handleOpenWorkspace(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace,
    () => handleGetCurrentWorkspace()
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workspace.listRecentWorkspaces,
    () => handleListRecentWorkspaces()
  );
}
