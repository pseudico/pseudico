import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import { handleGetModuleStatus } from "./moduleStatusHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerFileIpc(): void {
  registerTypedIpcHandler(LOCAL_WORK_OS_IPC_CHANNELS.files.getStatus, () =>
    handleGetModuleStatus("files")
  );
}
