import { dialog, shell } from "electron";
import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createFileIpcHandlers } from "./fileHandlers";
import { handleGetModuleStatus } from "./moduleStatusHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerFileIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createFileIpcHandlers(workspaceService, {
    async chooseSourcePath() {
      const result = await dialog.showOpenDialog({
        properties: ["openFile"]
      });

      return result.canceled ? null : (result.filePaths[0] ?? null);
    },
    openPath: (path) => shell.openPath(path),
    revealPath: (path) => shell.showItemInFolder(path)
  });

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
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.files.chooseAndAttach,
    (_event, input) => handlers.handleChooseAndAttach(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.files.listByContainer,
    (_event, input) => handlers.handleListFilesByContainer(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.files.openAttachment,
    (_event, input) => handlers.handleOpenAttachment(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.files.revealAttachment,
    (_event, input) => handlers.handleRevealAttachment(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.files.updateMetadata,
    (_event, input) => handlers.handleUpdateMetadata(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.files.verifyAttachment,
    (_event, input) => handlers.handleVerifyAttachment(input)
  );
}
