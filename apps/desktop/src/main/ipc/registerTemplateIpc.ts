import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";
import { createTemplateIpcHandlers } from "./templateHandlers";

export function registerTemplateIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createTemplateIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.templates.saveContainerAsTemplate,
    (_event, input) => handlers.handleSaveContainerAsTemplate(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.templates.createContainerFromTemplate,
    (_event, input) => handlers.handleCreateContainerFromTemplate(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.templates.listTemplates,
    (_event, input) => handlers.handleListTemplates(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.templates.updateTemplate,
    (_event, input) => handlers.handleUpdateTemplate(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.templates.duplicateTemplate,
    (_event, input) => handlers.handleDuplicateTemplate(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.templates.deleteTemplate,
    (_event, input) => handlers.handleDeleteTemplate(input)
  );
}
