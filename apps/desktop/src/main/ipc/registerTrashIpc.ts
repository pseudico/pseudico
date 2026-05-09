import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createTrashIpcHandlers } from "./trashHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerTrashIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createTrashIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.trash.listTrash,
    (_event, input) => handlers.handleListTrash(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.trash.restoreTrash,
    (_event, input) => handlers.handleRestoreTrash(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.trash.clearTrash,
    (_event, input) => handlers.handleClearTrash(input)
  );
}
