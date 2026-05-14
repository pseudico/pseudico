# Attachment manifest audit and orphan cleanup

Local Work OS can audit the attachment database manifest against the workspace
filesystem from **Settings > Maintenance**.

The audit compares active attachment rows with files under `attachments/` and
reports:

- database-referenced files that are missing from disk;
- files under `attachments/` that are not referenced by attachment metadata;
- stored size or checksum mismatches;
- unsafe attachment paths that do not stay inside workspace attachment storage.

Each maintenance run creates a local backup preflight and writes an audit report
under `logs/maintenance/<job-id>/attachment-manifest-audit.json` when the desktop
filesystem adapter is available.

The **Quarantine orphans** action is reversible cleanup. It moves unreferenced
files from `attachments/` to `logs/maintenance/<job-id>/orphan-attachments/`
instead of deleting them. Missing or corrupt referenced files continue to use the
existing attachment repair flow where the user locates a replacement file.

No cloud service, telemetry, or remote storage is used.
