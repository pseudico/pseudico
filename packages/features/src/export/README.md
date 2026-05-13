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
- `exportTasksCsv`
- `exportContactMarkdown`
- `exportHtmlCsvTsvMarkdownBundle`
- `createAttachmentManifest`

Implemented focused exports:

- Workspace JSON export writes a portable full-workspace JSON snapshot.
- Project Markdown export writes a Markdown summary of a project container,
  including tasks, lists, notes, links, and file attachment metadata.
- Task CSV/TSV export writes active workspace tasks with project context,
  status, dates, priority, tags, body, and item IDs.
- HTML/CSV/TSV/Markdown bundle export writes a local folder under `exports/`
  with project/contact Markdown files, task and list CSV/TSV files, sanitized
  static HTML indexes for containers/search/collections, an attachment metadata
  CSV, and a JSON manifest.

Integration points:

- Workspace, projects, contacts, tasks, notes, files, links, and metadata.
- Backup for archive workflows.
- Electron main/preload IPC for safe destination handling.
