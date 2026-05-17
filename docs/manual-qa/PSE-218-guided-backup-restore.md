# PSE-218 packaged guided backup/restore QA

Date: 2026-05-17  
Build: `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe` from `codex/pse-218-guided-backup-restore`.

## Scope

Verify the guided Backup & restore flow in the packaged app:

- readable backup list with date/path/database/attachment status
- restore destination safety explanation
- restore preview before execution
- unsafe active-workspace restore target remains blocked
- restore success gives obvious next actions
- restored workspace opens with recovered data visible

## Result

Pass. The packaged run restored a manual backup into a separate local workspace and opened that workspace. No P0/P1/P2 recovery blocker was found.

## Evidence summary

Machine-readable summary: `docs/manual-qa/PSE-218-packaged-backup-restore-summary.json`

Screenshots:

1. `docs/manual-qa/screenshots/PSE-218-2026-05-17T00-32-11-101Z/01-backup-list-and-folder-picker.png`
2. `docs/manual-qa/screenshots/PSE-218-2026-05-17T00-32-11-101Z/02-restore-preview-safety-destination.png`
3. `docs/manual-qa/screenshots/PSE-218-2026-05-17T00-32-11-101Z/03-unsafe-active-workspace-target-error.png`
4. `docs/manual-qa/screenshots/PSE-218-2026-05-17T00-32-11-101Z/04-restore-success-open-show-actions.png`
5. `docs/manual-qa/screenshots/PSE-218-2026-05-17T00-32-11-101Z/05-restored-workspace-opened.png`

## Notes

- The packaged UI shows the normal **Choose restore folder** path. The automation used the advanced destination field for execution because native OS folder dialogs are not reliable through CDP; folder-picker IPC is covered by targeted IPC tests.
- JSON export restore is labelled as **Advanced portable data restore from JSON export** and is no longer presented as the normal operator recovery path.
- The source backup in this run had a database copy and zero attachment records; the preview and backup list showed those counts/statuses explicitly.

## Risk classification

- P0: none.
- P1: none.
- P2: OS folder picker itself was not clicked in packaged automation; covered by IPC test and visible packaged UI.
- P3: future manual run with real attachments would strengthen attachment-specific visual evidence.
