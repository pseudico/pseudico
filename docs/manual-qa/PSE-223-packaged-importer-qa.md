# PSE-223 Packaged Importer QA Matrix

Date: 2026-05-17 (Australia/Sydney)
Branch: `codex/pse-223-importer-packaged-qa`
Base commit: `97f7968374723fb1a53428f63e78b33f08b44b63`
Package: `C:\tmp\Pseudico-pse-223\apps\desktop\dist-packaged\win-unpacked\Local Work OS.exe`
OS/runtime: Windows (`Microsoft Windows NT 10.0.26200.0`), Node `v22.21.1`, pnpm `10.25.0`
Evidence JSON: `docs/manual-qa/PSE-223-packaged-importer-qa-summary.json`
Raw command capture: `docs/manual-qa/PSE-223-package-smoke-output.txt`

## Verdict

Pass with caveats for the importer families that are actually packaged as local
IPC/UI surfaces. The package smoke now exercises representative local import
fixtures in the packaged runtime and verifies preview/execution where supported,
created data, activity, search, attachment copying, invalid input rejection,
duplicate/conflict behavior, and workspace integrity.

Caveats:

- This is structured packaged-runtime evidence, not a human OS-native file-picker
  pass. PSE-228 remains the focused dialog QA ticket.
- Notion, Todoist, Trello, and Evernote are service foundations with unit
  coverage and docs, but no pilot operator UI/preload path in the packaged app.
- IMAP remains adapter/scaffold-only for packaged operators; no password storage
  or live mailbox import was enabled.
- Browser capture is not an importer family exercised here; it remains an
  optional local capture surface with separate privacy/bridge coverage.

## Packaged importer evidence matrix

| Family surfaced by code/docs/UI | Status | Packaged evidence | Preview | Execute | Warnings / invalid input | Created data | Activity | Search | Attachments | Duplicates / conflicts | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CSV/TSV tasks/projects | Pass | `packageSmoke.importerEvidence.csvTsv` | 1 row previewed | 1 task row imported; project CSV used for duplicate check | wrong-extension path rejected | task/project data created through CSV import service | `csv_import_completed`, `task_created`, `container_created` | 1 search hit for CSV fixture token | N/A for CSV task fixture | duplicate project row skipped on second import | Packaged Settings UI exposes CSV/TSV import; smoke uses main IPC path directly. |
| Markdown folder / Obsidian-style vault | Pass with caveat | `packageSmoke.importerEvidence.markdownFolder` | 5 source rows previewed | 4 records imported | unsupported `.canvas` fixture included in preview path; missing folder rejected | project/tab/note/file rows created | `markdown_folder_import_completed`, `note_created`, `file_attached` | 1 search hit | 1 attachment copied under workspace attachments | Not applicable in this fixture | OS folder picker not manually exercised in this ticket. |
| Standalone Markdown note files | Pass with caveat | `packageSmoke.importerEvidence.markdownNote` | 1 note previewed | 1 note imported | file selection limits covered by handler validation; no bad extension fixture in package smoke | note created in existing project tab | `markdown_note_import_completed`, `note_created` | 1 search hit | N/A | Not applicable | Packaged IPC exists; no primary Settings wizard currently exposes standalone Markdown note import. |
| EML email import | Pass with caveat | `packageSmoke.importerEvidence.email` | 1 message previewed | 1 task imported | direct EML happy path; Maildir directory variant not separately exercised here | task created in project | `task_created`, `file_attached` | 1 search hit | original `.eml` copied as attachment | No duplicate marker for EML import today | Settings exposes EML/Maildir import; smoke exercises single-file EML. |
| Calendar ICS file import | Pass with caveat | `packageSmoke.importerEvidence.ics` | No separate preview in product | 1 event imported | `.ics` handler validates extension/path; bad extension not in this smoke | calendar feed/event data | `calendar_feed_imported` | Calendar views, not FTS search | N/A | 0 skipped in fixture | Included because Calendar page exposes local ICS import. |
| Portable workspace JSON validation/restore | Not reviewed in PSE-223 | Prior PSE-207/PSE-218 backup/restore evidence | Validation UI exists | Restore belongs to backup/restore flow | Not exercised here | Not reviewed here | Not reviewed here | Not reviewed here | Not reviewed here | Not reviewed here | Recovery/import evidence remains in backup/restore tickets. |
| Notion Markdown/CSV export | Partial / service foundation only | Service tests and `docs/NOTION_IMPORT.md`; no packaged UI path | Service preview only | Service execution only | Service warnings only | Service-created notes/tasks/assets in tests | Service-level import event | Service-level search through underlying services | Local asset copy through service foundation | Not packaged-reviewed | Do not market as pilot-ready operator UI. |
| Todoist CSV/backup ZIP | Partial / service foundation only | Service tests and `docs/TODOIST_IMPORT.md`; no packaged UI path | Service preview only | Service execution only | Service warnings only | Service-created tasks/sections in tests | Service-level import event | Service-level search through task service | Remote links preserved only as metadata | Not packaged-reviewed | No Todoist API/cloud import. |
| Trello JSON board | Partial / service foundation only | Service tests and `docs/TRELLO_IMPORT.md`; no packaged UI path | Service preview only | Service execution only | Service warnings only | Service-created project/list/task/checklist data in tests | Service-level import event | Service-level search through underlying services | Optional local raw files only in service foundation | Not packaged-reviewed | No Trello API/remote attachment fetching. |
| Evernote ENEX/HTML notebook | Partial / service foundation only | Service tests and `docs/EVERNOTE_IMPORT.md`; no packaged UI path | Service preview only | Service execution only | Service warnings only | Service-created project/notes/tags/resources in tests | Service-level import event | Service-level search through note/file services | Local copied resources only | Not packaged-reviewed | No Evernote account/API import. |
| Optional IMAP import | Unsupported for pilot packaged UI / scaffold | `docs/IMAP_IMPORT.md`; service/mock adapter tests | Service/mock only | Service/mock only | Adapter required | No live packaged import | Service-level only | Via email-to-task when adapter exists | N/A | Duplicate markers designed in service | Settings correctly says adapter required; no password storage in SQLite. |
| Browser capture scaffold | Unsupported as importer QA | Separate capture/privacy docs/tests | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Not an import/export flow for this ticket. |

## Assertions from packaged smoke

From `docs/manual-qa/PSE-223-packaged-importer-qa-summary.json`:

- CSV/TSV: `previewRows=1`, `importedCount=1`, `duplicateSkippedCount=1`, `searchHitCount=1`.
- Markdown folder: `previewRows=5`, `importedCount=4`, `attachmentCount=1`, `searchHitCount=1`.
- Markdown note: `previewRows=1`, `importedCount=1`, `searchHitCount=1`.
- EML email: `previewCount=1`, `importedCount=1`, `attachmentCount=1`, `searchHitCount=1`.
- ICS: `importedEventCount=1`, `skippedEventCount=0`.
- Invalid paths: bad CSV extension and missing Markdown folder were both rejected.
- Activity included import, task/note/container/file events.
- Workspace integrity after imports: `healthy`, `issueCount=0`.
- Attachment/open/reveal and backup smoke still pass in the same packaged run.

## Operator UX answers

- Primary operator task: deliberately move local files into Pseudico after taking a backup.
- Visually dominant action: Settings → Imports & exports should keep CSV/TSV, Markdown folder, and EML/Maildir import paths visible only after the operator opens the advanced import/export section.
- Secondary/advanced: portable JSON restore, third-party service foundations, IMAP, and browser capture should not be presented as ordinary pilot importers.
- Safe next action: preview before import, back up first, and verify search/activity/attachments after import.
- Copy clarity: docs/runbook now distinguish packaged-proven import paths from service-only foundations.

## Risks and follow-ups

| Severity | Risk | Disposition |
|---|---|---|
| P2 | OS-native picker/dialog behavior for import choices is not manually proven here. | Track under PSE-228. |
| P2 | Third-party import foundations could be mistaken for pilot-ready UI importers. | Matrix/runbook/readiness docs label them service-only/partial. |
| P3 | Package cleanup can leave disposable temp smoke workspaces if Windows keeps SQLite files busy briefly. | Smoke treats cleanup EBUSY as non-functional cleanup caveat; no workspace data is packaged. |
