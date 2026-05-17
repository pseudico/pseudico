# Notion Markdown/CSV Import

Local Work OS supports a local-only Notion export adapter foundation for
Markdown/CSV exports that the user already has on disk.

## Packaged-app pilot status

PSE-223 did **not** find a pilot operator UI/preload path for Notion import in
the packaged app. Treat this as a service foundation with fixture/unit coverage,
not as a packaged operator-ready importer, until a focused UI/dialog ticket adds
and reviews that flow.

## Scope

- Preview local Notion Markdown pages, database CSV files, assets, and
  unsupported files from a selected export folder or already-extracted ZIP.
- Import Markdown pages as local Markdown notes in a new project container.
- Import supported database CSV rows as local tasks when a row has a `Name`,
  `Title`, `Task`, or `Page` column.
- Preserve CSV source fields in the task body and apply simple tag/multi-select
  columns as local tags.
- Copy already-resolved local assets into workspace attachment storage through
  the existing file service.
- Report unsupported blocks, unsupported source fields, unsupported files, and
  remote URLs as warnings before import.

## Out Of Scope

- Notion API access, account login, live workspace export, cloud sync, remote
  file fetching, or visual parity with Notion.
- Automatically downloading remote attachment URLs from exported Markdown.
- Treating formulas, rollups, relations, people fields, or other Notion-specific
  database behavior as first-class editable Local Work OS data.

## Safety And Data Flow

The adapter consumes local entries only. Execution uses the existing project,
note, task, file, tag, search, and activity-log services so imported records
follow the standard write flow where those services own writes:

```text
validate local export entries
  -> preview warnings and unsupported fields
  -> create project container
  -> create notes/tasks/attachments through services
  -> create imported tags through metadata service
  -> write notion_import_completed activity event
```

Renderer code must continue to use Electron main/preload IPC for folder or ZIP
selection and file copying; the feature service itself accepts already-scanned
local entries.

## Current Limitations

- ZIP extraction is expected to happen at the safe filesystem boundary before
  entries reach the feature service.
- CSV row mapping is intentionally conservative: rows become tasks rather than
  recreating every possible Notion database view or property type.
- Unsupported Notion fields stay in the task body/source report until a future
  scoped ticket defines a richer mapping.

