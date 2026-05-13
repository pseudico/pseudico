# Security And Privacy

Local Work OS is designed as a local-only desktop app. Security decisions should
protect user files, preserve local data ownership, and avoid accidental network
or cloud dependencies.

## Local-Only Guardrails

Do not add these without explicit approval:

- Cloud sync.
- Hosted accounts.
- Telemetry or analytics SDKs.
- Team collaboration services.
- Public sharing.
- Remote databases.
- Remote file storage.
- Billing or licensing systems.
- Mobile app code.

## Electron Guardrails

- Keep filesystem and database access in Electron main.
- Expose native capabilities through typed preload IPC only.
- Do not expose arbitrary Node APIs to the renderer.
- Validate IPC inputs at the boundary.
- Prefer narrow IPC methods with explicit return types.
- Validate external URLs before opening them in the OS browser; only allow
  explicit safe protocols and never open `file:`, `javascript:`, `data:`, or
  custom-scheme renderer input.
- Keep `<webview>` and embedded web/widget surfaces disabled unless a future
  ticket adds an explicit sandboxed allowlist.
- Keep browser capture and automation local when those features are added.
- Browser capture bridges must stay disabled by default, bind only to loopback
  when localhost mode is explicitly enabled, and require a long pairing token.

## Filesystem Guardrails

- Store app-managed files inside the selected workspace where practical.
- Keep persisted paths workspace-relative when practical.
- Avoid destructive deletes; prefer archive or soft delete for user data.
- Validate import, export, backup, and restore paths before use.

## Database Guardrails

- Access SQLite through repositories or services.
- Run data-changing operations in transactions.
- Write activity log events for all meaningful data changes.
- Keep search index updates aligned with searchable content changes.
- Add migrations for schema changes and verify they apply cleanly.

## Privacy Guardrails

- Do not send workspace data to external services by default.
- Do not introduce telemetry by default.
- Keep optional network-capable features behind the workspace Privacy &
  Network settings. Link metadata fetch, web widgets, ICS URL import, IMAP
  import, and browser capture default to off and require explicit enablement
  before their service path can perform network-capable work.
- Treat attachments, notes, project data, contacts, and imported files as local
  private user data.
- Document any future network capability before implementation. Localhost-only
  browser capture is documented in `BROWSER_CAPTURE.md` and must not add cloud
  transfer, telemetry, hosted accounts, or remote storage.

## Review Triggers

Flag a change for careful review if it adds network access, broad IPC,
filesystem writes outside the workspace, direct renderer filesystem access,
direct renderer database access, hard delete behavior, or user-data export
paths.


## Optional IMAP Import Guardrails

The optional IMAP importer is local-desktop initiated only. It must not add hosted accounts, cloud forwarding, telemetry, or background cloud workers. Persisted settings exclude passwords; credentials must live in an OS keychain or session-only adapter. Imports are bounded, explicit, and duplicate-protected by local metadata.

## Optional Workspace Encryption Spike

Current production workspaces are local-only but not application-encrypted at
rest. Optional encryption remains a proposed future capability, not a production
format change. Any future implementation must follow
`docs/DECISIONS/ADR-0004-optional-workspace-encryption-spike.md`: use a
SQLCipher-compatible native database adapter rather than homegrown SQLite
crypto, keep passphrases and derived keys behind Electron main/preload IPC,
encrypt attachment bytes separately, and define backup/export/search/recovery
behavior before migrating existing workspaces.


## Local maintenance tools

Maintenance actions stay local to the open workspace. Renderer controls call typed preload IPC only; Electron main opens the SQLite connection, creates the preflight backup under `backups/`, scans only workspace-relative `attachments/` files, and runs SQLite maintenance commands without exposing arbitrary SQL or filesystem access to the renderer. Orphan scans report paths but do not delete files in this slice.
