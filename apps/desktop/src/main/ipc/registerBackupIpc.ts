import { dialog, shell, type OpenDialogOptions } from "electron";
import { LOCAL_WORK_OS_IPC_CHANNELS } from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";
import { createBackupIpcHandlers } from "./backupHandlers";
import { registerTypedIpcHandler } from "./registerTypedIpcHandler";

export function registerBackupIpc(
  workspaceService: WorkspaceFileSystemService
): void {
  const handlers = createBackupIpcHandlers(workspaceService, undefined, {
    async chooseRestoreTargetFolder(input) {
      const dialogOptions: OpenDialogOptions = {
        title: "Choose a folder for the restored workspace",
        properties: ["openDirectory", "createDirectory", "promptToCreate"]
      };

      if (input?.defaultPath !== undefined) {
        dialogOptions.defaultPath = input.defaultPath;
      }

      const result = await dialog.showOpenDialog(dialogOptions);

      return result.canceled ? null : (result.filePaths[0] ?? null);
    },
    revealPath: (path) => {
      shell.showItemInFolder(path);
    }
  });

  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.createManualBackup,
    (_event, input) => handlers.handleCreateManualBackup(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.listBackups,
    (_event, input) => handlers.handleListBackups(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.listBackupsForWorkspacePath,
    (_event, input) => handlers.handleListBackupsForWorkspacePath(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.getAutomaticBackupSettings,
    (_event, input) => handlers.handleGetAutomaticBackupSettings(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.updateAutomaticBackupSettings,
    (_event, input) => handlers.handleUpdateAutomaticBackupSettings(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.runAutomaticBackupCheck,
    (_event, input) => handlers.handleRunAutomaticBackupCheck(input)
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
    LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreBackupFromWorkspacePath,
    (_event, input) => handlers.handleRestoreBackupFromWorkspacePath(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreExportToNewWorkspace,
    (_event, input) => handlers.handleRestoreExportToNewWorkspace(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.chooseRestoreTargetFolder,
    (_event, input) => handlers.handleChooseRestoreTargetFolder(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.revealBackupFolder,
    (_event, input) => handlers.handleRevealBackupFolder(input)
  );
  registerTypedIpcHandler(
    LOCAL_WORK_OS_IPC_CHANNELS.backup.revealRestoredWorkspaceFolder,
    (_event, input) => handlers.handleRevealRestoredWorkspaceFolder(input)
  );
}
