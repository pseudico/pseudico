import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import { createWorkflowIpcHandlers } from "./workflowHandlers";

export function registerWorkflowIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createWorkflowIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workflows.listTemplates,
    () => handlers.handleListTemplates()
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workflows.preview,
    (_event, input) => handlers.handlePreview(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workflows.execute,
    (_event, input) => handlers.handleExecute(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.workflows.listRuns,
    (_event, input) => handlers.handleListRuns(input)
  );
}
