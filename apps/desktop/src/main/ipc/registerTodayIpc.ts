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
}
