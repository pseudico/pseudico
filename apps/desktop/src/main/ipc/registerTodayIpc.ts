import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import { createTodayIpcHandlers } from "./todayHandlers";

export function registerTodayIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createTodayIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.today.getViewModel,
    (_event, input) => handlers.handleGetTodayViewModel(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.today.getOrCreateDailyPlan,
    (_event, input) => handlers.handleGetOrCreateDailyPlan(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.today.planTask,
    (_event, input) => handlers.handlePlanTask(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.today.unplanTask,
    (_event, input) => handlers.handleUnplanTask(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.today.reorderPlannedTask,
    (_event, input) => handlers.handleReorderPlannedTask(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.today.getPlannedTasks,
    (_event, input) => handlers.handleGetPlannedTasks(input)
  );
}
