# Backup Module

Purpose: own local backup orchestration and backup integrity checks.

Owns:

- Backup application service contracts.
- Backup snapshot orchestration.
- Backup integrity reporting and backup-before-migration coordination.

Does not own:

- Raw filesystem copy implementation from renderer code.
- Export format definitions.
- Database migration implementation.

Likely service methods later:

- `createBackup`
- `listBackups`
- `verifyBackup`
- `prepareBackupBeforeMigration`
- `restoreBackupIntoNewWorkspace`

Integration points:

- Workspace folder layout and database path services.
- Files/attachments for manifests.
- Electron main/preload IPC for safe local file operations.
