# Markdown Note Import

Local Work OS supports standalone local Markdown file imports into an existing
workspace container through the feature-layer `MarkdownNoteImporter` and the
main-process Markdown note import IPC.

## Boundaries

- Imports are local-only. File selection/reading belongs to Electron
  main/preload IPC; renderer code must not read Markdown files directly.
- The main process reads selected `.md`/`.markdown` files and passes file
  contents plus safe relative filenames to the feature service.
- The feature service accepts file contents and workspace-relative source paths.
- No cloud services, hosted accounts, telemetry, or remote attachment fetching
  are used.

## Preview

The preview normalizes relative Markdown paths, derives note titles from
frontmatter `title`, the first H1 heading, or the Markdown filename, and reports
row-level issues before writes. Invalid examples include unsafe paths,
unsupported file extensions, duplicate paths, missing workspace/container IDs,
and missing or inactive target containers.

Frontmatter `tags`/`tag` values and Markdown `#tags` are normalized for import
preview. Wiki-links are surfaced in preview rows for validation/QA context.

## Execution

Execution routes each Markdown file through `NoteService.createNote`, so note
creation creates normal note activity events and search-index records. Imported
tags are applied through `TagService`, and the importer logs a workspace-level
`markdown_note_import_completed` activity event summarizing the import batch.

The desktop preload API exposes `previewMarkdownNoteImport` and
`importMarkdownNotes` for renderer callers. Those calls require an open
workspace, a target container ID, and one to 100 selected Markdown file paths.
