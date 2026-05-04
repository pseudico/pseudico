import {
  apiOk,
  type ApiResult,
  type IpcModuleStatus,
  type LocalWorkOsModuleName
} from "../../preload/api";

const placeholderMessages: Record<LocalWorkOsModuleName, string> = {
  containers: "Container IPC is typed but awaits repository/service tickets.",
  items: "Item IPC is typed but awaits repository/service tickets.",
  files: "File IPC supports safe local attachment imports."
};

const implementedModules = new Set<LocalWorkOsModuleName>(["files"]);

export function handleGetModuleStatus(
  module: LocalWorkOsModuleName
): ApiResult<IpcModuleStatus> {
  return apiOk({
    module,
    available: true,
    implemented: implementedModules.has(module),
    message: placeholderMessages[module]
  });
}
