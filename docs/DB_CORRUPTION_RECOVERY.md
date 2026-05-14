# DB corruption recovery runbook

Local Work OS stores workspace data in a local SQLite database under
`data/local-work-os.sqlite`. If a workspace cannot be opened because SQLite
open, migration, or integrity checks fail, do **not** overwrite or delete the
original workspace.

## User recovery flow

1. Try to open the affected workspace from the Welcome screen.
2. If open fails, use the displayed **Recovery options** panel.
3. Choose **Find backups** to list backup snapshots from the unopened workspace
   folder.
4. Select the newest known-good snapshot.
5. Enter a separate empty target folder.
6. Select **Restore backup into new workspace**.

The restore flow copies the backup database and referenced local attachments
into the new workspace folder, writes a fresh `workspace.json`, opens the new
workspace, rebuilds search projections, and records a `backup_restored` activity
event inside the restored database.

## Safety guarantees

- The corrupt source database stays untouched.
- Restore targets cannot be the source workspace folder.
- Restore targets are rejected if they already contain `workspace.json` or a
  workspace database.
- Backup and attachment paths are validated as workspace-relative paths.
- No cloud service, telemetry, hosted account, or remote storage is involved.

## Manual QA

- Replace `data/local-work-os.sqlite` in a test workspace with invalid bytes
  after creating a manual backup.
- Open that workspace and confirm the recovery panel appears.
- Restore the latest backup into a new folder.
- Confirm the restored workspace opens and the original invalid database file is
  still present in the source workspace.
