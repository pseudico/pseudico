import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createInboxIpcHandlers } from "./inboxHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerInboxIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createInboxIpcHandlers(workspaceService);

  registerTypedIpcHandler(LOCAL_WORK_OS_IPC_CHANNELS.inbox.getInbox, (_event, input) =>
    handlers.handleGetInbox(input)
  );
  registerTypedIpcHandler(LOCAL_WORK_OS_IPC_CHANNELS.inbox.listItems, (_event, input) =>
    handlers.handleListInboxItems(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.inbox.moveItemToProject,
    (_event, input) => handlers.handleMoveInboxItemToProject(input)
  );
}
