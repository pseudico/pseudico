import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import { createTaskIpcHandlers } from "./taskHandlers";

export function registerTaskIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createTaskIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask,
    (_event, input) => handlers.handleCreateTask(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask,
    (_event, input) => handlers.handleUpdateTask(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask,
    (_event, input) => handlers.handleCompleteTask(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask,
    (_event, input) => handlers.handleReopenTask(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tasks.snoozeTask,
    (_event, input) => handlers.handleSnoozeTask(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tasks.rescheduleTask,
    (_event, input) => handlers.handleRescheduleTask(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.tasks.listByContainer,
    (_event, input) => handlers.handleListTasksByContainer(input)
  );
}
