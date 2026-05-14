# Release readiness and local data safety

Use this guide before a release-candidate review or before relying on a new
workspace for important work.

## Before a release candidate

- Run the documented local checks: lint, typecheck, tests, build, package, and
  package smoke where relevant.
- Review the release notes and known limitations in `docs/RELEASE.md`.
- Confirm all release work stays local-only: no hosted account, telemetry, cloud
  sync, public sharing, or remote file storage is required.
- Confirm workspace data, attachments, backups, exports, and logs are created
  under user-controlled local workspace folders, not inside the app bundle.

## Protecting local data

- Create a manual backup before risky maintenance or migration work.
- Keep exported workspace JSON and Markdown/CSV bundles in a local folder you
  control.
- Verify imports or restores with a separate test workspace before replacing
  important local data.
- Keep installer/signing/update decisions separate from workspace data access so
  a user never loses access to their local files.

