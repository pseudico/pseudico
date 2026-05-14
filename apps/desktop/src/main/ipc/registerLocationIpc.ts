import { shell } from "electron";
import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createLocationIpcHandlers } from "./locationHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerLocationIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createLocationIpcHandlers(workspaceService, {
    openExternal: (url) => shell.openExternal(url)
  });

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.locations.createLocation,
    (_event, input) => handlers.handleCreateLocation(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.locations.updateLocation,
    (_event, input) => handlers.handleUpdateLocation(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.locations.listByContainer,
    (_event, input) => handlers.handleListLocationsByContainer(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.locations.openExternal,
    (_event, input) => handlers.handleOpenLocationExternally(input)
  );
}
