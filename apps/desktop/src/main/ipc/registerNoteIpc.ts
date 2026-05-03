import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createNoteIpcHandlers } from "./noteHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerNoteIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createNoteIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.notes.createNote,
    (_event, input) => handlers.handleCreateNote(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.notes.updateNote,
    (_event, input) => handlers.handleUpdateNote(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.notes.listByContainer,
    (_event, input) => handlers.handleListNotesByContainer(input)
  );
}
