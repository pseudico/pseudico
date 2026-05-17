# PSE-228 packaged OS-native dialog QA

Date: 2026-05-18 08:33 Australia/Sydney
Linear: PSE-228 - Run manual OS-native dialog QA for packaged file, import, export, and backup flows
Branch: `codex/pse-228-os-dialog-qa`
Base commit: `b2bee031700465a4adb9adb296319be15be6412c`
Package: `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`
OS/runtime: Windows packaged app, Node `v22.21.1`, pnpm `10.25.0`

## Scope

This pass used the packaged app as an operator would against disposable local
workspaces under `C:\tmp\PSE-228-dialog-qa-fixtures`. It records which flows
actually have OS-native dialogs today, which picker-driven flows passed, and
which requested surfaces are typed-path or workspace-relative flows rather than
native dialog flows.

No product code changed. This evidence does not add cloud sync, telemetry,
hosted accounts, auto-update, signing, installers, or new importer/exporter
behavior.

Machine-readable run summary:
`docs/manual-qa/PSE-228-packaged-dialog-qa-summary.json`.

Screenshot folder:
`docs/manual-qa/screenshots/PSE-228-2026-05-18T08-15-00/`.

## Command evidence

- `pnpm install --frozen-lockfile` - pass in fresh PSE-228 worktree.
- `pnpm package` - pass; output:
  `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`.
- `pnpm package:smoke` - pass; packaged app smoke covered local workspace,
  SQLite write/read, attachment, backup, importer smoke paths, and normal
  launch.
- `pnpm release:package-check` - pass; wrote current artifact checksum/data
  boundary report to `docs/release/package-artifact-check.json`.
- Packaged dialog QA driver - pass; launched the unpacked Windows executable,
  exercised real native file/folder dialogs where present, and captured actual
  app UI screenshots before/after actions.

## Dialog and picker matrix

| Operator flow | Result | Evidence / caveat |
| --- | --- | --- |
| Create workspace | Pass for packaged typed-path flow; native picker not present | Welcome create/open currently uses a typed local folder path and recent workspace buttons, not an OS folder picker. Missing workspace open returned a safe error. |
| Open workspace | Pass for packaged typed-path flow; native picker not present | Same disposable workspace reopened successfully. |
| Attach file - cancel | Pass | Real Windows `Open` dialog cancelled safely and returned no attachment. |
| Attach file - select | Pass | Real Windows `Open` dialog selected `operator-attachment.txt`; project remained usable after copied workspace attachment. |
| Markdown folder preview/import | Pass | Real Windows folder picker selected the Markdown vault, previewed 3 rows with 1 unsupported canvas warning, then imported 2 supported Markdown notes/projects. |
| Email import | Pass for direct packaged local path; native picker Not reviewed | Direct packaged import of `.eml` created one Inbox task. The mixed Windows `openFile`/`openDirectory` email picker opened as a folder-selection dialog in this QA run and keyboard selection was not reliable enough to claim native-picker coverage. |
| CSV/TSV import | Not reviewed as native dialog | Current Settings flow uses a typed local file path for CSV/TSV import. PSE-223 covers packaged importer behavior, but there is no OS-native CSV picker to claim here. |
| Export workspace JSON / tasks CSV | Pass for packaged export; native destination picker not present | Exports wrote to workspace-relative `exports/` paths. No OS save/folder picker is implemented for export destination. |
| Manual backup create/list | Pass for packaged backup; native destination picker not present | Backup wrote to workspace-relative `backups/` and listed successfully. |
| Restore target - cancel | Pass | Real Windows folder picker cancelled safely and returned no target path. |
| Restore target - select and restore | Pass | Real Windows folder picker selected a fresh restore folder; backup restored into that folder with 2 copied attachments and 0 missing attachments. |
| Workspace JSON restore source picker | Not reviewed | Normal recovery should use backup restore. JSON-export restore source selection remains a separate advanced recovery picker surface. |
| Invalid/missing paths | Pass | Missing workspace and missing attachment source produced safe errors; no partial attachment was created from the missing file. |

## Visual evidence

| Screenshot | Operator question answered | Result |
| --- | --- | --- |
| `01-packaged-welcome.png` | Can the operator see how to start with a local workspace? | Pass with typed-path caveat. |
| `02-workspace-created.png` | Does the app land in a usable workspace after create? | Pass. |
| `03-workspace-reopened.png` | Does reopening the local workspace return to the same work context? | Pass. |
| `04-project-before-file-picker.png` | Is the file attachment action available beside the work it belongs to? | Pass. |
| `05-project-file-attached.png` | Does the screen show the attached file after the native picker action? | Pass. |
| `06-inbox-email-imported.png` | Does a packaged local `.eml` import create visible work? | Pass for direct path; native email picker remains Not reviewed. |
| `07-projects-markdown-folder-imported.png` | Does Markdown folder import produce visible project/work records? | Pass. |
| `08-settings-export-backup-state.png` | Can the operator see export/backup state after local operations? | Pass. |
| `09-restored-workspace-open.png` | Does the restored workspace open after selecting a restore folder? | Pass. |

## Acceptance status

- Packaged app used as the runtime: **Pass**.
- Real native dialogs exercised where implemented for file attach, Markdown
  folder preview, and restore target selection: **Pass**.
- Cancel paths for file attach and restore target selection: **Pass**.
- Created/opened disposable local workspace: **Pass**, but current UI is
  typed-path/recent-workspace rather than native folder picker.
- Import/export/backup/restore outcomes verified: **Pass with caveats**.
  Implemented local data paths worked; export/backup destinations are
  workspace-relative rather than native destination dialogs.
- Screenshots show app state before/after affected actions: **Pass**.
- Evidence records package path, SHA, OS, and workspace paths: **Pass** in the
  summary JSON above.
- Unexercised or non-existent native dialog surfaces are explicitly marked:
  **Pass**.

## Risk classification

| Severity | Risk | Status |
| --- | --- | --- |
| P0 | Dialog flow corrupts or loses workspace data. | Not observed. |
| P1 | Attachment or restore picker cannot complete the primary recovery/file loop. | Not observed; attach and restore target pickers passed. |
| P2 | Requested "native dialog" coverage cannot be claimed for flows that are typed-path or workspace-relative today. | Documented in readiness/runbook/release docs. |
| P2 | Windows email import's mixed file/folder picker is not human-proven in this pass. | Direct import passed; follow-up created as PSE-229 before claiming native email picker coverage. |
| P3 | Keyboard-driven native dialog QA is evidence, not stable CI automation. | Keep as manual/packaged evidence only. |

## Architecture and local-only safety

- No renderer filesystem access, direct SQLite access, IPC contract, Electron
  sandbox, context isolation, or external URL opener behavior changed.
- All exercised files were local disposable fixtures; no network, cloud sync,
  telemetry, hosted account, remote storage, public sharing, or auto-update
  behavior was introduced.
- Attachments, exports, backups, and restore targets remained local filesystem
  operations routed through packaged Electron APIs.
