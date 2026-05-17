# Data Model

This document summarizes the planned local data model direction. It is not a
schema migration. Concrete tables and columns should be introduced only through
scoped database tickets.

## Workspace

A workspace is the local root for a user's data. It owns the SQLite database,
workspace metadata, attachment storage, backup/export files, and local
maintenance outputs.

Planned responsibilities:

- Store workspace identity and version metadata.
- Track local folder layout and relative paths.
- Support health checks and maintenance tasks.
- Remain portable across local folders when possible.

## Universal Containers

Projects, contacts, Inbox, collections, and future organizational surfaces are
modeled as containers where practical. Containers provide a common way to group
items, show activity, attach files, display tabs, and participate in search.

Expected container capabilities:

- Stable local identity.
- Title, description, status, and metadata.
- Soft delete plus reversible archive/restore and completion lifecycle behavior.
- Relationships to other containers and items.
- Searchable text projection.
- Activity log coverage for data-changing operations.

## Universal Items

Tasks, notes, files, links, checklist entries, and similar records are modeled
as items where practical. Items may belong to containers, appear in saved views,
carry tags/categories, and participate in activity/search.

Expected item capabilities:

- Type-specific payloads with shared metadata.
- Dates, status, and ordering where relevant.
- Soft delete by default.
- Attachment or link references where relevant.
- Activity log coverage for create, update, move, complete, archive, restore,
  and delete operations.

## Relationships

Relationships and backlinks connect containers and items without requiring a
cloud graph service. They support cross-object navigation, project/contact
context, related work, and future graph views.

## Tags And Categories

Tags and categories are local metadata systems. Tags support flexible labeling
and saved views. Categories support more deliberate classification, color, and
workflow grouping. Neither implies team assignment or cloud taxonomy.

## Activity Log

The activity log records meaningful data-changing operations. New write paths
must include activity events in the same transaction as the domain write unless
a ticket explicitly documents a different approach.

## Search Index

Searchable content should be projected into the local search index when the
search service exists. Search updates must stay transactionally aligned with
domain writes where practical.

## Attachments

Attachments are local files stored inside the workspace or referenced through
workspace-relative paths where possible. Remote file storage is out of scope.

## Initial Schema Foundation

The first schema migration creates the durable SQLite foundation for the local
object graph:

- `workspaces` and `app_settings` store workspace identity, schema version, and
  local preference/settings rows.
  Appearance preferences use an `appearance.settings.v1` app setting payload for
  local theme, density, and font-size choices without adding cloud profile data.
  Project/contact display preferences use per-container
  `container.preferences.v1:<container_id>` app setting payloads for default
  view/tab, show-completed behavior, grouping, default quick-add type,
  summary-first layout, and compact mode.
- `containers` and `container_tabs` store Inbox, project, and contact surfaces
  plus tab support. Content tabs now include `hidden_at`, `archived_at`, and
  `deleted_at` timestamps so local visibility, reversible archive, and soft
  delete state survive app restarts without affecting item ownership.
- `contact_fields` stores flexible labelled profile fields for contact
  containers.
- `items`, `task_details`, `list_details`, `list_items`, `note_details`,
  `links`, and `attachments` store mixed content and type-specific payloads.
- `tags`, `taggings`, and `categories` store local metadata for cross-cutting
  organization.
- `relationships` stores local backlinks and dependency/reference edges between
  containers, items, list rows, URLs, and files.
- `saved_views`, `dashboards`, and `dashboard_widgets` store query/view and
  dashboard foundations.
- `daily_plans` and `daily_plan_items` store Today/Tomorrow/Backlog planning
  state.
- `templates` stores local reusable definitions. It supports list templates and
  project/contact container templates with tabs, tasks, lists, notes, link/file
  placeholders, contact fields, copied tag/category references, and relative day
  offsets for dated tasks/list rows.
- `workflow_definitions` and `workflow_runs` store local workflow definitions,
  trigger type (`manual`, `item_created`, `file_imported`, `tag_added`,
  `tag_removed`, or `category_assigned`), preview snapshots, action result logs,
  failure details, captured action activity IDs, and rollback status metadata.
- `recurrence_rules` stores narrow local task recurrence definitions for daily
  and weekly/custom-weekday repeating tasks.
- `activity_log` records the activity trail used by later write services.
- `search_index` is a normal SQLite table placeholder for local search
  projections; the search ticket may replace or augment it with FTS5 while
  keeping the service-facing shape stable.

Workspace-owned tables include `workspace_id`, indexes for common local lookup
paths, and soft-delete timestamps where records are user-managed. IDs are text
values generated by application code, booleans are stored as `0`/`1`, datetimes
are ISO text, and JSON payloads are stored in `_json` text columns.

## Current MVP Implementation

The current codebase implements the initial schema foundation as a single
versioned SQLite migration plus typed Drizzle schema modules under
`packages/db/src/schema`. Repository and service coverage now exists for the
MVP object graph:

- Workspace metadata, bootstrap, seed data, migration, health, transaction,
  and activity-log services.
- Container, item, task, list, note, link, attachment, tag, category,
  relationship, saved-view, dashboard, daily-plan, template, workflow, and
  search-index repositories.
- Feature services for projects, contacts, Inbox, tasks, lists, notes, links, files,
  metadata, saved views/collections, Today planning, dashboards, reminders, project
  health, templates, workflows, backup, export, import validation, local
  EML/Maildir email-to-task import, diagnostics, and search hydration/orchestration.
- File version snapshots now live in `attachment_versions`, keyed to local
  attachments with monotonically increasing version numbers, workspace-relative
  version storage paths, checksums, byte sizes, optional notes, and activity-log
  coverage for snapshot and restore writes.
- Portable template files use a versioned `.lwo-template` JSON envelope around
  the existing template JSON payload. The envelope records capabilities,
  portable tag/category references, source metadata, and file-version
  information while keeping binary attachments as placeholders.
- Applying project/contact templates keeps those binary attachment placeholders
  as explicit note items rather than creating `file` items without attachment
  rows. The note carries the original file metadata and reattachment guidance,
  keeping integrity diagnostics, backup/restore, activity, and search aligned
  until a future scoped ticket adds real binary-copy support for templates.

Search remains a local projection table behind `SearchIndexService`,
`SearchService`, and feature-level orchestrators. It indexes source records
that are user-searchable and excludes derived export/search artifacts from the
portable workspace export. Archived project/contact containers are projected as
hidden from default search results while remaining available to explicit
archived searches and restore flows.
Recent search history is workspace-scoped local metadata stored in
`app_settings` under `search.recent.v1`; it records query/filter summaries only
and does not add a schema table or cloud search dependency.

The contact foundation now stores contact containers plus flexible profile
fields behind repository and service APIs. The reminder foundation now stores
task and list-item reminder policies and scheduled reminder events in
`reminder_policies` and `reminder_events`, with task rows pointing at the active
local policy when one exists and workspace defaults stored in `app_settings`.
The recurrence foundation now stores active daily and weekly/custom
weekday rules in `recurrence_rules`, with task rows pointing at the active local
rule when one exists and recurring completion rolling the same task to the next
occurrence. The template foundation stores list templates and project/contact
container templates; note/tab imports and portable template files remain future
work. The workflow foundation stores manual, item-created, file-imported,
tag-added, tag-removed, and category-assigned definitions/runs, plus run history
diagnostics and rollback status for undoable activity snapshots; scheduled or external automation remains future work. The data model still intentionally
reserves future shape for timeline/calendar views, monthly/yearly recurrence,
backup restore/import execution, and richer saved-view builder state. Add those
through scoped migrations and repository/service tickets rather than expanding
the current schema opportunistically.

List pipeline mode uses the existing `list_details.display_mode` and
`list_items` hierarchy: top-level rows are stages, and child rows are cards.
Moving a pipeline card updates the child row's parent, depth, and sort order
through the list service boundary; it does not introduce separate board tables.

## Source Documents

This direction is derived from `docs/PRODUCT_SPEC.md`,
`docs/COVERAGE_MATRIX.md`, and
`docs/DECISIONS/ADR-0003-universal-container-item-model.md`.

## Container media

Project banners and contact avatars are stored as local attachment-backed container media records. The container_media table keeps one active media assignment per container/role, references an attachment copied under workspace-relative ttachments/, stores optional thumbnail paths, and soft-deletes prior assignments so changes are reversible. Missing-file state is detected by verifying the attachment or thumbnail path inside the active workspace.

### Comments and annotations

Comments are local-only annotations stored in a dedicated comments table. Each comment belongs to one workspace and targets a container, item, or list_item; comments use soft delete, write activity events on create/update/delete, and are folded into the target's local search projection so searching comment text returns the annotated object.


### Calendar feeds (PSE-141)

Local ICS imports persist read-only calendar sources in calendar_sources and events in calendar_events. Events store source UID, title, optional description/location, start/end timestamps, all-day flag, raw parsed metadata, soft-delete timestamp, and remain workspace-local. Network calendar sources are disabled unless an explicit network-enabled import path is used.

### Local email import (PSE-167)

Local EML/Maildir imports do not add a dedicated email table. Each imported
message becomes a task item in the chosen container, currently Inbox by default
or the active project when an `.eml` file is dropped on project content, with
sanitized header/body content in the task body. The original email file is
copied into workspace attachment storage and linked to the task through existing
attachment rows, so backup/export/search/activity flows use the established item
and file metadata model.



### Optional local IMAP import (PSE-168)

Optional IMAP import stores non-secret account settings in `app_settings`, run history in `imap_import_jobs`, and duplicate-prevention markers in `imap_imported_messages`. Passwords are excluded from SQLite and must be provided by an OS keychain or session-only credential adapter. Imported messages are converted through the existing email-to-task flow so task activity and search indexing remain aligned.


### Maintenance jobs (PSE-174)

Local maintenance job history is stored in `app_settings` under `maintenance.jobs.v1` so integrity checks, search reindex runs, SQLite VACUUM runs, backup preflight IDs, attachment manifest audits, and orphan attachment scan/cleanup summaries survive app restart without a new schema table. Maintenance writes activity events for the job summary, and search rebuilds continue to write `search_index_rebuilt` activity records. Attachment manifest audits compare active attachment rows with workspace-relative `attachments/` files, write local audit JSON reports under `logs/maintenance/`, and orphan cleanup quarantines unreferenced files under `logs/maintenance/<job-id>/orphan-attachments/` instead of deleting them.


## Location Objects

Location items use `location_details` rows for address, latitude/longitude, and saved viewport zoom/center. They are indexed for local search and open external maps only through explicit user action.

### Link web widget settings (PSE-135)

Link items persist an explicit sandboxed-widget opt-in on the existing `links`
row. `render_as_widget` controls card versus widget rendering,
`widget_height` stores the local size preference, and
`widget_warning_accepted_at` records when the user first accepted the per-link
warning. Widget settings update through the link service, write activity, and
refresh link search metadata; they do not add cloud sync or remote storage.
