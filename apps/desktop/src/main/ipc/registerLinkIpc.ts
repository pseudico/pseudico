import { shell } from "electron";
import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createLinkIpcHandlers } from "./linkHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerLinkIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createLinkIpcHandlers(workspaceService, {
    openExternal: (url) => shell.openExternal(url)
  });

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.links.createLink,
    (_event, input) => handlers.handleCreateLink(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.links.updateLink,
    (_event, input) => handlers.handleUpdateLink(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.links.listByContainer,
    (_event, input) => handlers.handleListLinksByContainer(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.links.openExternal,
    (_event, input) => handlers.handleOpenLinkExternally(input)
  );
}
