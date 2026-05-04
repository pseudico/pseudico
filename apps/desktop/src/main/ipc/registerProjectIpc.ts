import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createProjectIpcHandlers } from "./projectHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerProjectIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createProjectIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject,
    (_event, input) => handlers.handleCreateProject(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.projects.updateProject,
    (_event, input) => handlers.handleUpdateProject(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject,
    (_event, input) => handlers.handleArchiveProject(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.projects.softDeleteProject,
    (_event, input) => handlers.handleSoftDeleteProject(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.projects.listProjects,
    (_event, input) => handlers.handleListProjects(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.projects.getProject,
    (_event, input) => handlers.handleGetProject(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.projects.getProjectHealth,
    (_event, input) => handlers.handleGetProjectHealth(input)
  );
}

