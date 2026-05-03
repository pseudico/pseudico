import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createMetadataIpcHandlers } from "./metadataHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerMetadataIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createMetadataIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTagsWithCounts,
    (_event, input) => handlers.handleListTagsWithCounts(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.metadata.listCategoriesWithCounts,
    (_event, input) => handlers.handleListCategoriesWithCounts(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTargetsByMetadata,
    (_event, input) => handlers.handleListTargetsByMetadata(input)
  );
}
