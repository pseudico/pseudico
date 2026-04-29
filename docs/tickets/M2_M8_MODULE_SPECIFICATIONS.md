---
title: Local Work OS Reference Document
created: 2026-04-29
scope: local-only desktop productivity app
status: generated aggregate reference for Codex / Linear setup
---


# Local Work OS — M2–M8 Core Feature Module Specifications

This document is an aggregate module specification for the core build after the M0/M1 scaffold and database foundation.
It exists so Linear tickets and Codex tasks can reference a single stable file instead of relying only on individual ticket files.

## Relationship to the strategy documents

This document connects to:

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m0-m1-scaffold-database-ticket-pack.md`
- `local-work-os-m2-m8-complete-feature-ticket-pack.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`

## Local-only boundary

The modules in this document must remain local-only:

- No cloud sync.
- No hosted accounts.
- No mobile app.
- No team permissions.
- No public sharing links.
- No hosted file storage.
- No telemetry unless explicitly approved.

The build target is a Pagico-style local productivity workspace: projects, contacts, tasks, notes, lists, files, links, tags, categories, search, smart collections, dashboards, daily planning, timeline/calendar views, local backup, and local import/export.

---

# M2 — Core Object Graph

## M2 objective

Build the internal object graph that all later features rely on.

The app should not be a collection of disconnected screens. It should be a local database of containers, items, relationships, metadata, activities, and saved views. All UI views should project from this graph.

## M2 modules

| Module | Purpose | Core tables | Primary services |
|---|---|---|---|
| Containers | Represent Inbox, Projects, Contacts | `containers`, `container_tabs` | `ContainerService`, `ContainerRepository` |
| Items | Represent tasks, lists, notes, files, links, headings, locations, comments | `items`, detail tables | `ItemService`, `ItemRepository` |
| Relationships | Link objects across containers | `relationships` | `RelationshipService` |
| Activity | Record all important writes | `activity_log` | `ActivityLogService` |
| Sort/order | Manual ordering in container feeds | `items.sort_order`, `list_items.sort_order` | `OrderingService` |
| Soft delete/archive | Hide without destroying data | `archived_at`, `deleted_at` | common repository methods |

## Container model

A container is a place that can hold mixed work content.

Initial container types:

```text
inbox
project
contact
```

Rules:

- Every workspace must have one system Inbox.
- Projects and contacts may have tabs.
- Containers can have tags, categories, colours, favourite state, and status.
- Containers should support archive and soft-delete.
- Containers should never directly implement task/note/file logic; they hold items.

## Item model

An item is a piece of content inside a container.

Initial item types:

```text
task
list
note
file
link
heading
location
comment
```

Rules:

- Each item belongs to one primary container.
- Each item may belong to one container tab.
- Each item may have tags and one category.
- Each item may be related to other containers/items.
- All data-changing item actions must write an activity event.
- Searchable item changes must update the search index.

## Relationship model

Relationships are not containment. They represent semantic links.

Examples:

```text
Task related to contact
Note references task
Project depends_on project
File belongs to project through container_id and references another item through relationship
Contact follow_up_for task
```

Allowed relation types for core:

```text
related
references
depends_on
blocked_by
follow_up_for
```

## Required UI surfaces

M2 is mostly service/database work, but must expose enough UI to prove data flows:

- Workspace home health panel.
- Container list placeholder.
- Basic object debug/inspection view in development mode.
- Recent activity placeholder.

## Required integration rules

Every create/update/archive/delete/move flow should follow:

```text
validate input
→ start transaction
→ write domain data
→ write activity event
→ update search index when relevant
→ commit
→ refresh UI/query cache
```

## M2 acceptance standard

M2 is complete when:

- Containers can be created, listed, updated, archived, and soft-deleted.
- Items can be created, listed by container, moved, archived, and soft-deleted.
- Relationships can be created and queried both directions.
- Every write creates an activity log event.
- Search indexing hooks exist, even if search UI is basic.
- Tests cover repositories, services, and transactions.

---

# M3 — Core Work Objects

## M3 objective

Implement the primary user-facing content types: projects, Inbox, tasks, lists, notes, files, and links.

## Project module

Projects are outcome/work containers. They should hold tasks, notes, lists, files, links, headings, and related contacts/projects.

### Project responsibilities

- Create/edit/archive project.
- List active/favourite/archived projects.
- Show project content feed.
- Add mixed item types to project.
- Show project summary: open tasks, overdue tasks, recent notes/files, recent activity.
- Support project status: active, waiting, completed, archived.

### Project services

```text
ProjectService.createProject
ProjectService.updateProject
ProjectService.archiveProject
ProjectService.listProjects
ProjectService.getProjectOverview
ProjectService.getProjectContent
ProjectService.calculateProjectHealth
```

## Inbox module

Inbox is the default capture container.

### Inbox responsibilities

- Ensure Inbox exists.
- Show unsorted items.
- Quick-add tasks/notes/links/files into Inbox.
- Move Inbox items to projects or contacts.
- Preserve metadata on move.
- Provide triage filters by item type/status/date.

### Inbox services

```text
InboxService.getInbox
InboxService.listInboxItems
InboxService.moveItemFromInbox
InboxService.bulkMoveFromInbox
```

## Task module

Tasks are the core unit of work.

### Task fields

```text
title
body
status: open / waiting / done / cancelled
start_at
due_at
priority
tags
category
container_id
completed_at
archived_at
deleted_at
```

### Task responsibilities

- Create task in Inbox/project/contact.
- Edit title/body/status/dates/category/tags.
- Complete and reopen task.
- Move task between containers.
- Query due today, overdue, upcoming, waiting, completed.
- Support basic natural-language date extraction later.

### Task services

```text
TaskService.createTask
TaskService.updateTask
TaskService.completeTask
TaskService.reopenTask
TaskService.setTaskDates
TaskService.moveTask
TaskService.listDueToday
TaskService.listOverdue
TaskService.listUpcoming
```

## List module

Lists are checklist or structured-list items.

### List responsibilities

- Create list item inside container.
- Add list rows.
- Complete/reopen list rows.
- Reorder rows.
- Bulk paste multiline rows.
- Indent/outdent rows.
- Add dates to list rows.
- Later convert between list rows and tasks.

### List services

```text
ListService.createList
ListService.addListItem
ListService.updateListItem
ListService.completeListItem
ListService.reorderListItems
ListService.bulkCreateListItems
ListService.indentListItem
ListService.outdentListItem
```

## Note module

Notes are Markdown content objects.

### Note responsibilities

- Create/edit Markdown notes.
- Search title/body.
- Parse inline tags.
- Link notes to tasks/projects/contacts.
- Support autosave later.

### Note services

```text
NoteService.createNote
NoteService.updateNote
NoteService.getNote
NoteService.listNotesByContainer
```

## File module

Files are local attachments and optionally visible file items.

### File responsibilities

- Copy file into workspace attachment folder.
- Create file item or attach to another item.
- Store metadata and checksum.
- Open/reveal file through Electron main process.
- Handle missing-file state.

### File services

```text
FileAttachmentService.importFile
FileAttachmentService.attachFileToItem
FileAttachmentService.openAttachment
FileAttachmentService.revealAttachment
FileAttachmentService.verifyAttachmentIntegrity
```

## Link module

Links are URL/bookmark items.

### Link responsibilities

- Create URL item.
- Store URL, title, domain, description.
- Open externally.
- Metadata fetching later.

### Link services

```text
LinkService.createLink
LinkService.updateLink
LinkService.openLink
LinkService.extractDomain
```

---

# M4 — Metadata, Search, Saved Views

## M4 objective

Implement flexible cross-cutting organisation: tags, categories, full-text search, and saved views.

## Tag module

Tags are flexible `@keyword` metadata.

### Responsibilities

- Parse inline tags from item titles/bodies/notes.
- Create missing tags automatically.
- Add/remove manual tags.
- Rename/merge tags.
- List tags and targets.
- Support tag autocomplete.

### Services

```text
TagService.parseInlineTags
TagService.findOrCreateTag
TagService.tagTarget
TagService.untagTarget
TagService.listTagsForTarget
TagService.listTargetsForTag
TagService.renameTag
```

## Category module

Categories are stable colour-coded classifications.

### Responsibilities

- Create/edit/delete categories.
- Assign to containers/items.
- Filter by category.
- Show category badges.

### Services

```text
CategoryService.createCategory
CategoryService.updateCategory
CategoryService.assignToContainer
CategoryService.assignToItem
CategoryService.listTargetsByCategory
```

## Search module

Search is global navigation.

### Responsibilities

- Index containers, items, notes, files, links, list rows, tags, categories.
- Search with FTS.
- Exclude archived/deleted by default.
- Return typed results with source container context.
- Rebuild index.

### Services

```text
SearchService.upsertTarget
SearchService.removeTarget
SearchService.search
SearchService.rebuildWorkspaceIndex
SearchService.getSearchDiagnostics
```

## Saved views module

Saved views power collections, smart lists, saved searches, and dashboard widgets.

### Responsibilities

- Store versioned query JSON.
- Evaluate query against local database.
- Group/sort results.
- Provide collection/smart-list UI later.

### Services

```text
SavedViewService.createSavedView
SavedViewService.updateSavedView
SavedViewService.deleteSavedView
SavedViewService.evaluateSavedView
SavedViewService.validateQuery
```

---

# M5 — Usability Views

## M5 objective

Turn the object graph into useful daily work surfaces: Collections, Today, Dashboard, and project health.

## Collections

Collections are saved views focused on tags/keywords.

### Responsibilities

- Create a collection from tag or keyword.
- Group results by container.
- Allow completing tasks inline.
- Allow adding a task from within the collection, auto-applying the collection tag when possible.

## Today / Daily Planner

Today is the daily operating surface.

### Responsibilities

- Show due-today tasks.
- Show overdue backlog.
- Allow manual planning into Today and Tomorrow.
- Preserve manual order.
- Complete/snooze tasks inline.
- Later implement rollover from Tomorrow to Today.

## Dashboard

Dashboard is an overview of attention areas.

### Responsibilities

- Default dashboard exists.
- Widgets: Today, Overdue, Upcoming, Favourite Projects, Recent Activity.
- Click widget result opens source object.
- Later support custom widgets/layout.

## Project health

Project health summarises project state.

### Responsibilities

- Count open/done/overdue tasks.
- Show next due task.
- Show recent activity.
- Link counts to filtered views.

---

# M6 — Files, Backup, Export, MVP Stabilisation

## M6 objective

Make the local app safer, usable, and recoverable.

## Files

- Workspace-relative attachment storage.
- Open/reveal file actions.
- Missing-file state.
- Basic checksum integrity.
- File metadata search.

## Backup

- Manual backup copies SQLite and attachment manifest.
- Backup before migration.
- Backup health check.
- Backup retention later.

## Export

- Full JSON export.
- Project/contact Markdown export later.
- Task CSV export later.

## MVP stabilisation

- Playwright smoke test.
- Migration verification.
- App packaging smoke.
- Regression checklist.
- Documentation sync.

---

# M7 — V1 Depth Modules

## Contacts

Contacts become first-class client/person/company containers.

Responsibilities:

- Contact profile fields.
- Flexible labelled fields.
- Related projects.
- Follow-up tasks.
- Meeting notes.
- Contact timeline/history.

## Container tabs

Tabs divide project/contact content.

Responsibilities:

- Default Main tab.
- Create/rename/delete/reorder tabs.
- Move items between tabs.
- Summary cards by tab.

## Reminders

Local reminders only.

Responsibilities:

- Reminder at due time.
- Reminder before due time.
- OS notifications through Electron.
- Reschedule on date changes.

## Timeline and Calendar

Visual date views.

Responsibilities:

- Timeline grouped by container.
- Month calendar from local tasks.
- Later week/day views and drag rescheduling.

## Templates

Local repeatable structures.

Responsibilities:

- List templates.
- Project/contact templates.
- Relative date expansion.

---

# M8 — Advanced Local Power Modules

## Recurrence

Recurring tasks remain local.

Responsibilities:

- Daily/weekly/custom weekday recurrence.
- Complete occurrence and generate next.
- Skip occurrence later.

## Pipelines

Pipeline is alternate list display mode.

Responsibilities:

- Toggle list into pipeline mode.
- Treat top-level list items as stages.
- Move child cards between stages.

## File versions

Local snapshots of attachments.

Responsibilities:

- Create snapshot.
- Browse versions.
- Restore or open old version.

## Workflows

Local automation only.

Responsibilities:

- Manual workflow trigger first.
- Add tag, set category, move item, create task/list from template.
- Preview and activity log.

## Browser capture

Optional local capture bridge.

Responsibilities:

- Native messaging or localhost bridge.
- Capture URL/title/selection into Inbox.
- No cloud dependency.

---

# Cross-module invariants

These apply to all modules:

1. Data-changing operations must create an activity log event.
2. Searchable content changes must update or invalidate the search index.
3. UI must call services through the approved boundary.
4. Renderer must not directly access SQLite or filesystem APIs.
5. All object IDs must be stable local IDs.
6. Soft-delete before hard-delete.
7. No cloud dependencies.
8. Tests must cover repository/service logic before UI-only implementation is accepted.
