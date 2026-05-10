import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createPrintIpcHandlers } from "./printHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerPrintIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createPrintIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.print.printPdf,
    (_event, input) => handlers.handlePrintPdf(input)
  );
}
