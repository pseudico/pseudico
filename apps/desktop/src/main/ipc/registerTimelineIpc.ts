import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import { createTimelineIpcHandlers } from "./timelineHandlers";

export function registerTimelineIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createTimelineIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.timeline.getViewModel,
    (_event, input) => handlers.handleGetTimelineViewModel(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.timeline.saveFilterAsView,
    (_event, input) => handlers.handleSaveTimelineFilterAsView(input)
  );
}
