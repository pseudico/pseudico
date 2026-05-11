import { dialog } from "electron";
import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createDiagnosticsIpcHandlers } from "./diagnosticsHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerDiagnosticsIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createDiagnosticsIpcHandlers(workspaceService, {
    async chooseReplacementPath() {
      const result = await dialog.showOpenDialog({
        properties: ["openFile"]
      });

      return result.canceled ? null : (result.filePaths[0] ?? null);
    }
  });

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.runWorkspaceIntegrityCheck,
    (_event, input) => handlers.handleRunWorkspaceIntegrityCheck(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.repairAttachment,
    (_event, input) => handlers.handleRepairAttachment(input)
  );
}
