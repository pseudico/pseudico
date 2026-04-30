import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import { handleGetDatabaseHealthStatus } from "./databaseHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerDatabaseIpc(): void {
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.database.getHealthStatus,
    () => handleGetDatabaseHealthStatus()
  );
}
