import { dialog } from "electron";
import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import { createImportIpcHandlers } from "./importHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerImportIpc(): void {
  const handlers = createImportIpcHandlers({
    async chooseExportJsonPath() {
      const result = await dialog.showOpenDialog({
        filters: [{ name: "Workspace JSON export", extensions: ["json"] }],
        properties: ["openFile"]
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
}

