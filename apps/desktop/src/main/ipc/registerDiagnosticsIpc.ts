import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createDiagnosticsIpcHandlers } from "./diagnosticsHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerDiagnosticsIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createDiagnosticsIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.runWorkspaceIntegrityCheck,
    (_event, input) => handlers.handleRunWorkspaceIntegrityCheck(input)
  );
}
