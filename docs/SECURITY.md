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
