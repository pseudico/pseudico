import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import { createSearchIpcHandlers } from "./searchHandlers";

export function registerSearchIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createSearchIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.search.searchWorkspace,
    (_event, input) => handlers.handleSearchWorkspace(input)
  );
}
