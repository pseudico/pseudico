import { dialog } from "electron";
import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import { createImportIpcHandlers } from "./importHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

export function registerImportIpc(
  workspaceService: Pick<WorkspaceFileSystemService, "getCurrentWorkspace">
): void {
  const handlers = createImportIpcHandlers(workspaceService, {
    async chooseExportJsonPath() {
      const result = await dialog.showOpenDialog({
        filters: [{ name: "Workspace JSON export", extensions: ["json"] }],
        properties: ["openFile"]
      });

      return result.canceled ? null : (result.filePaths[0] ?? null);
    },
    async chooseEmailImportPath() {
      const result = await dialog.showOpenDialog({
        filters: [{ name: "Email messages", extensions: ["eml", "*"] }],
        properties: ["openFile", "openDirectory"]
      });

      return result.canceled ? null : (result.filePaths[0] ?? null);
    }
  });

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.import.validateWorkspaceExportJson,
    (_event, input) => handlers.handleValidateWorkspaceExportJson(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.import.chooseAndValidateWorkspaceExportJson,
    () => handlers.handleChooseAndValidateWorkspaceExportJson()
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.import.previewEmails,
    (_event, input) => handlers.handlePreviewEmails(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.import.importEmailsAsTasks,
    (_event, input) => handlers.handleImportEmailsAsTasks(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.import.chooseAndImportEmailsAsTasks,
    (_event, input) => handlers.handleChooseAndImportEmailsAsTasks(input)
  );
}

