import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createCalendarIpcHandlers } from "./calendarHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerCalendarIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createCalendarIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.calendar.getMonth,
    (_event, input) => handlers.handleGetCalendarMonth(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.calendar.rescheduleItem,
    (_event, input) => handlers.handleRescheduleCalendarItem(input)
  );
}
