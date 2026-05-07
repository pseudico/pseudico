import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createRelationshipIpcHandlers } from "./relationshipHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerRelationshipIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createRelationshipIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.relationships.linkContactToProject,
    (_event, input) => handlers.handleLinkContactToProject(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.relationships.unlinkContactFromProject,
    (_event, input) => handlers.handleUnlinkContactFromProject(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.relationships.listContactsForProject,
    (_event, input) => handlers.handleListContactsForProject(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.relationships.listProjectsForContact,
    (_event, input) => handlers.handleListProjectsForContact(input)
  );
}
