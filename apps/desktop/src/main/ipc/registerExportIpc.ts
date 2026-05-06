import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createExportIpcHandlers } from "./exportHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerExportIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createExportIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.export.exportWorkspaceJson,
    (_event, input) => handlers.handleExportWorkspaceJson(input)
  );
}
