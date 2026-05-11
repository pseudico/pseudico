import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import { createReminderIpcHandlers } from "./reminderHandlers";

export function registerReminderIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createReminderIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.reminders.setTaskReminder,
    (_event, input) => handlers.handleSetTaskReminder(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.reminders.clearTaskReminder,
    (_event, input) => handlers.handleClearTaskReminder(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.reminders.setListItemReminder,
    (_event, input) => handlers.handleSetListItemReminder(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.reminders.clearListItemReminder,
    (_event, input) => handlers.handleClearListItemReminder(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.reminders.dismissReminder,
    (_event, input) => handlers.handleDismissReminder(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.reminders.snoozeReminder,
    (_event, input) => handlers.handleSnoozeReminder(input)
  );
}
