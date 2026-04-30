import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import { app } from "electron";
import { join } from "node:path";
import { RecentWorkspacesService } from "../services/workspace/RecentWorkspacesService";
import { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createWorkspaceIpcHandlers } from "./workspaceHandlers";

export function registerWorkspaceIpc(): void {
  const workspaceService = new WorkspaceFileSystemService({
    recentWorkspacesService: new RecentWorkspacesService(
      join(app.getPath("userData"), "recent-workspaces.json")
    )
  });
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
