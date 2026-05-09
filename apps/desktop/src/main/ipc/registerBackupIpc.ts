import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createBackupIpcHandlers } from "./backupHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerBackupIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createBackupIpcHandlers(workspaceService);

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.createManualBackup,
    (_event, input) => handlers.handleCreateManualBackup(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.listBackups,
    (_event, input) => handlers.handleListBackups(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.validateRestoreSource,
    (_event, input) => handlers.handleValidateRestoreSource(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreBackupToNewWorkspace,
    (_event, input) => handlers.handleRestoreBackupToNewWorkspace(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreExportToNewWorkspace,
    (_event, input) => handlers.handleRestoreExportToNewWorkspace(input)
  );
}
