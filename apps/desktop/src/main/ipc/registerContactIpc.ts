import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createContactIpcHandlers } from "./contactHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerContactIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createContactIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.contacts.createContact,
    (_event, input) => handlers.handleCreateContact(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.contacts.updateContact,
    (_event, input) => handlers.handleUpdateContact(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.contacts.listContacts,
    (_event, input) => handlers.handleListContacts(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.contacts.getContact,
    (_event, input) => handlers.handleGetContact(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.contacts.addField,
    (_event, input) => handlers.handleAddField(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.contacts.updateField,
    (_event, input) => handlers.handleUpdateField(input)
  );
}
