import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createActivityIpcHandlers } from "./activityHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerActivityIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createActivityIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.activity.listRecentActivity,
    (_event, input) => handlers.handleListRecentActivity(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.activity.listActivityForTarget,
    (_event, input) => handlers.handleListActivityForTarget(input)
  );
}
