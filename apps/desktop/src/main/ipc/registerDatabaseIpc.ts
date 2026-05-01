import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import { handleGetDatabaseHealthStatus } from "./databaseHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

export function registerDatabaseIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.database.getHealthStatus,
    () => handleGetDatabaseHealthStatus(workspaceService)
  );
}
