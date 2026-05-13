# CSV/TSV Import

Local Work OS supports local CSV and TSV import previews for tasks, contacts, and projects.

## Boundaries

- Imports are local-only and read from a user-provided local file path through Electron main-process IPC.
- Renderer code does not read files directly.
- No cloud services, hosted accounts, telemetry, or remote storage are used.

## Mapping

The import service infers common header names and also accepts an explicit mapping schema. Supported mapped fields include:

- Tasks: title, container/project, status, priority, start date, due date, tags, category, body.
- Contacts: name, email, phone, company, role, website, tags, category, description.
- Projects: name, description, status, tags, category.

CSV/TSV files are parsed with quoted-cell support. `.tsv` uses tab delimiters; `.csv` uses comma delimiters.

## Preview and conflicts

The preview reports row-level errors and warnings before writes. The desktop settings import panel uses `skip_existing` conflict behavior so matching tasks, contacts, or projects are skipped instead of duplicated. Task rows can create missing project containers by default; blank task containers import to Inbox.

## Execution

Execution reuses the existing task, contact, project, category, and tag services. Those services write activity events and search-index updates for created domain records. The import service also logs a workspace-level `csv_import_completed` event for the completed local import job.
