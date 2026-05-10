import { dialog } from "electron";
import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createContainerMediaIpcHandlers } from "./containerMediaHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerContainerMediaIpc(workspaceService: WorkspaceFileSystemService): void {
  const handlers = createContainerMediaIpcHandlers(workspaceService, {
    async chooseSourcePath() {
      const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }] });
      return result.canceled ? null : (result.filePaths[0] ?? null);
    }
  });
  registerTypedIpcHandler(LOCAL_WORK_OS_IPC_CHANNELS.containerMedia.chooseAndSet, (_event, input) => handlers.handleChooseAndSet(input));
  registerTypedIpcHandler(LOCAL_WORK_OS_IPC_CHANNELS.containerMedia.getActive, (_event, input) => handlers.handleGetActive(input));
  registerTypedIpcHandler(LOCAL_WORK_OS_IPC_CHANNELS.containerMedia.remove, (_event, input) => handlers.handleRemove(input));
}
