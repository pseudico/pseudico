# PSE-207 packaged backup/restore manual QA

Date/time: 2026-05-16 11:24-11:26 Australia/Sydney (2026-05-16 01:24-01:26 UTC)
OS: Microsoft Windows NT 10.0.26200.0 x64
App artifact path: `C:\Users\AlastairLacey\Pseudico\apps\desktop\dist-packaged\win-unpacked\Local Work OS.exe`
Packaged app bundle: `C:\Users\AlastairLacey\Pseudico\apps\desktop\dist-packaged\win-unpacked\resources\app.asar`
Artifact timestamp: `Local Work OS.exe` / `app.asar` last modified 2026-05-16 09:48 local after PSE-212 rebuild
App version / commit: package version `0.0.0`; repo commit `b6709a8bddc03d0b0575c525826fdcf489a256a6`
Source workspace path: `C:\tmp\PSE-207-2026-05-16T01-24-38-683Z-source-workspace`
Backup-restore target workspace path: `C:\tmp\PSE-207-2026-05-16T01-24-38-683Z-backup-restore-workspace`
Workspace JSON export target path reserved but not used for restore: `C:\tmp\PSE-207-2026-05-16T01-24-38-683Z-export-restore-workspace`
Backup path: `C:\tmp\PSE-207-2026-05-16T01-24-38-683Z-source-workspace\backups\2026-05-16T01-25-26-659Z`
Workspace JSON export path: `C:\tmp\PSE-207-2026-05-16T01-24-38-683Z-source-workspace\exports\2026-05-16T01-25-28-125Z-workspace-export.json`
Run summary: `docs/manual-qa/PSE-207-run-summary.json`

## Result

**Final gate result: Pass with caveats.**

The packaged app completed the OR-R2-critical manual backup restore path through the real Settings UI: create source workspace, create representative local data, create a manual backup, reject an unsafe restore target, restore that backup into a clean target workspace, verify restored data and attachment storage, close/reopen the packaged app, reopen the restored target, and verify persistence.

OR-R2 can be treated as **closed with caveats** for manual packaged backup restore. Do not change the overall verdict to Operator ready yet because OR-R3 and OR-R4 remain open. The caveat is that the run created a JSON export through the UI but did not complete a JSON-export restore through UI; backup restore is the recovery path proven here.

## Test data names used

| Data | Name/value |
| --- | --- |
| Source workspace | `PSE-207 Source Workspace 2026-05-16` |
| Project | `PSE-207 Recovery Project` |
| Contact | `Riley PSE-207 Recovery Contact` |
| Category | `PSE-207 Recovery QA` |
| Note | `PSE-207 restore verification note` |
| Search token | `PSE-207-restore-token` |
| Task | `PSE-207 verify restored package task` |
| List/checklist | `PSE-207 recovery checklist` |
| Link | `https://example.com/pse-207-recovery-reference` |
| Collection | `PSE-207 Recovery Collection` |
| Attachment source | `C:\tmp\PSE-207-2026-05-16T01-24-38-683Z-source-attachment.txt` |

## Step-by-step pass/fail table

| # | Operator recovery step | Result | Evidence / notes |
| --- | --- | --- | --- |
| 1 | Launch packaged app | Pass | Packaged welcome screen rendered. |
| 2 | Create clean source workspace | Pass | Source workspace under `C:\tmp` outside app bundle/resources. |
| 3 | Add project/contact/note/task/list/link/category | Pass | Created through Quick Start and Settings UI. |
| 4 | Add project-contact relationship | Pass | Linked through project UI; relationship count = 1 after restore. |
| 5 | Attach local file | Pass | File item exists and stored under workspace-relative `attachments/...`. |
| 6 | Create/open collection | Pass | Collection `PSE-207 Recovery Collection` created. |
| 7 | Verify source before backup | Pass | Search, attachment, relationship, collection, and recent activity checked through packaged APIs. |
| 8 | Create manual backup through UI | Pass | Settings > Backups > Create backup produced `backups/2026-05-16T01-25-26-659Z`. |
| 9 | Create workspace JSON export through UI | Pass with caveat | Export created; export-restore was not rerun through UI in this pass. |
| 10 | Safe failure branch: restore into active workspace | Pass | UI displayed understandable error: restore target cannot be the active workspace. |
| 11 | Restore backup into clean target workspace through UI | Pass | Settings restore target + `Restore to new workspace` completed. |
| 12 | Verify restored records through UI/API | Pass | Project/contact/note/task/list/link/collection/search all verified. |
| 13 | Verify attachment recovery from target workspace | Pass | `verifyAttachment` and `revealAttachment` returned ok; storage path remained target workspace-relative. |
| 14 | Verify activity/history coherence | Pass | Recent activity includes `backup_restored` plus created source records. |
| 15 | Close/reopen packaged app | Pass | Relaunched packaged app and opened restored target workspace via UI. |
| 16 | Confirm restored state persists after reopen | Pass | Search, project/contact, relationship, collection, attachment verify/reveal all still passed. |

## Attachment evidence

| Field | Value |
| --- | --- |
| Source checksum | `fd8412b1c3d0bf7c9caa68ccac1b9b302a0c90603fdfcccf96a595f98c35f0f3` |
| Source size | 68 bytes |
| Restored storage path | `attachments/2026/05/attachment_mp7nzivv_1539fbdwzt3/PSE-207-2026-05-16T01-24-38-683Z-source-attachment.txt` |
| Restored verify | `exists: true` |
| Restored reveal | `ok: true` |
| Target workspace proof | Verified after restore and again after app restart from `C:\tmp\PSE-207-2026-05-16T01-24-38-683Z-backup-restore-workspace`. |

## Backup/export contents at a high level

Backup directory contains:

- `attachment-manifest.json` (1,248 bytes)
- `local-work-os.sqlite` (688,128 bytes)

The restored target workspace contains expected workspace folders: `attachments/`, `backups/`, `data/`, `exports/`, `logs/`, and `workspace.json`.

## Screenshots

Major packaged-app screenshots are under:

`docs/manual-qa/screenshots/PSE-207-2026-05-16T01-24-38-683Z/`

Key files:

- `01-welcome.png`
- `02-source-workspace-created.png`
- `05-content-created.png`
- `07-attachment-attached.png`
- `09-backup-created.png`
- `10-export-created.png`
- `11-invalid-restore-target-error.png`
- `12-backup-restored.png`
- `13-backup-restore-project.png`
- `22-reopen-welcome.png`
- `23-backup-restore-after-restart-project.png`

## Issues found

| Severity | Issue | Evidence | Follow-up |
| --- | --- | --- | --- |
| P3 | Workspace JSON export restore was not rerun through UI in the successful pass. | JSON export was created through Settings UI, but after backup restore the automation runner could not reliably navigate back to Settings to run export-restore. | Optional follow-up if owner wants separate UI import/export restore evidence beyond manual backup restore. |
| P3 | Search/dashboard screenshots after restore are partly automation-harness evidence rather than pure visual proof. | The final verification is from packaged APIs plus project UI screenshots; search route text entry did not produce useful visual result. | Accept as caveat for OR-R2 because recovery data/search/attachment checks passed; improve route-specific manual screenshot harness later if needed. |

No P0/P1/P2 recovery issue was found in the successful manual backup-restore run.

## Operator-facing friction

- The Restore target field is a raw folder path field, not a folder picker; a nontechnical operator must copy/paste a target path carefully.
- The unsafe active-workspace restore branch was understandable and blocked the operation.
- The backup list row clearly exposed `Restore to new workspace` once a target folder was entered.
- Workspace JSON export can be created from UI, but this artifact does not prove JSON-export restore through UI.

## Runbook sufficiency

The runbook backup guidance was sufficient for the proven manual backup restore path: back up first, restore into a clean/fresh workspace, verify known records, verify attachment storage, and do not overwrite the active workspace. The runbook should remain conservative about restore targets because the UI currently expects pasted folder paths.

## Gate decision

OR-R2: **Closed with caveats** for packaged manual backup restore into a fresh workspace. Overall Operator-ready verdict remains **not yet** until OR-R3 and OR-R4 are complete and owner acceptance is recorded.

## Post-run validation

- `pnpm lint` - passed after removing the temporary local evidence runner from the repo root.
- `pnpm typecheck` - passed.

No code changes were made for PSE-207.
