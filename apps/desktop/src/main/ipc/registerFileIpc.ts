import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createFileIpcHandlers } from "./fileHandlers";
import { handleGetModuleStatus } from "./moduleStatusHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerFileIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createFileIpcHandlers(workspaceService);

  registerTypedIpcHandler(LOCAL_WORK_OS_IPC_CHANNELS.files.getStatus, () =>
    handleGetModuleStatus("files")
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.files.attachFileToContainer,
    (_event, input) => handlers.handleAttachFileToContainer(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.files.attachFileToItem,
    (_event, input) => handlers.handleAttachFileToItem(input)
  );
}
