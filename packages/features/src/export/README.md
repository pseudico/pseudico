# Export Module

Purpose: own local export orchestration and portable archive outputs.

Owns:

- Export application service contracts.
- Full JSON, Markdown, CSV/TSV, and manifest export orchestration.
- Export validation and portable-output boundaries.

Does not own:

- Backup snapshot lifecycle.
- Import/restore behavior until import tickets exist.
- Direct renderer filesystem writes.

Likely service methods later:

- `exportWorkspaceJson`
- `exportProjectMarkdown`
- `exportContactMarkdown`
- `exportTasksCsv`
- `createAttachmentManifest`

Integration points:

- Workspace, projects, contacts, tasks, notes, files, links, and metadata.
- Backup for archive workflows.
- Electron main/preload IPC for safe destination handling.
