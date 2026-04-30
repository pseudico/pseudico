import {
  apiOk,
  type ApiResult,
  type IpcModuleStatus,
  type LocalWorkOsModuleName
} from "../../preload/api";

const placeholderMessages: Record<LocalWorkOsModuleName, string> = {
  containers: "Container IPC is typed but awaits repository/service tickets.",
  items: "Item IPC is typed but awaits repository/service tickets.",
  files: "File IPC is typed but awaits workspace filesystem service tickets."
};

export function handleGetModuleStatus(
  module: LocalWorkOsModuleName
): ApiResult<IpcModuleStatus> {
  return apiOk({
    module,
    available: true,
    implemented: false,
    message: placeholderMessages[module]
  });
}
