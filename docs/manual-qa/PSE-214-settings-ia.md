# PSE-214 Settings IA Manual QA Evidence

Linked issue: PSE-214 — PSE-HUX-002: Split Settings IA around primary-operator intent
Date: 2026-05-16

## Evidence method

Captured final Settings states from the actual `SettingsPage` React UI with the repository CSS and a local workspace fixture. The screenshots show the operator-facing Settings screen states after the IA split; no backend/service behavior was changed.

## Screenshots

- Settings landing / operator-intent overview: `docs/manual-qa/screenshots/PSE-214-2026-05-16T20-35-00/01-settings-landing.png`
- Backup & Restore section: `docs/manual-qa/screenshots/PSE-214-2026-05-16T20-35-00/02-backup-restore.png`
- Imports & Exports section: `docs/manual-qa/screenshots/PSE-214-2026-05-16T20-35-00/03-imports-exports.png`
- Advanced Maintenance section: `docs/manual-qa/screenshots/PSE-214-2026-05-16T20-35-00/04-advanced-maintenance.png`

## Operator UX review

| State | Operator is trying to | Visually dominant | Secondary / advanced | Safe next action obvious? | Result |
|---|---|---|---|---|---|
| Settings landing | Find the right setting without scanning an admin wall. | Appearance, Backup & Restore, Privacy/local-only, Categories. | Imports/Exports and Advanced Maintenance are labelled Advanced/secondary cards. | Yes: the primary CTA opens Backup & Restore; cards route by intent. | Pass |
| Backup & Restore | Create a local backup or restore to a fresh workspace. | Safety copy and Create backup. | Refresh/list details are secondary. | Yes: restore target says new workspace and copy says current workspace is not overwritten. | Pass for PSE-214; deeper guided flow remains PSE-218. |
| Imports & Exports | Move data in/out using local files deliberately. | Preview/import local file controls. | Portable JSON, IMAP, and exports are labelled advanced/local-file flows, not default settings. | Mostly: preview-first controls are visible; raw paths remain existing behavior. | Pass for IA; path comfort deferred to later import/restore work. |
| Advanced Maintenance | Troubleshoot health/search/attachments/database issues. | Workspace health, diagnostics, maintenance sections. | These controls only appear after opening Advanced Maintenance. | Yes: advanced warning copy explains when to use it and backup preflight/quarantine safety. | Pass |

## Risks / follow-ups

- P1 backup/restore remains path-oriented by design for this ticket; PSE-218 owns guided restore.
- P2 import/export path entry remains dense; future import UX can add pickers/guidance without changing this IA split.
- P2 screenshots were captured via local visual harness rather than a packaged Electron run because this ticket changed renderer IA only; targeted renderer tests cover section content and existing actions remain reachable.
