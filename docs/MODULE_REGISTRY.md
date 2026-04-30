# Module Registry

This registry names Local Work OS modules, their ownership boundaries, and
their expected integration points. It is the routing map for future feature
tickets: implementation should land in the owning module unless a ticket
explicitly changes the boundary.

The placeholder contracts under `packages/features/src` are intentionally thin.
They define homes for future application services without adding database
schema, UI pages, filesystem behavior, or product logic early.

## Feature Module Map

| Module | Purpose | Primary entities | Depends on | Feeds into | Priority |
| --- | --- | --- | --- | --- | --- |
| Workspace | Coordinate opened local workspaces, workspace metadata, health, and maintenance entry points. | Workspace, workspace metadata, recent workspace references | Electron main/preload IPC, database services, filesystem services | Inbox, projects, backup, export, dashboard | MVP |
| Inbox | Own quick capture and triage workflows before work is filed into another context. | Inbox container, captured items, triage actions | Workspace, projects, contacts, tasks, notes, files, links, metadata | Today, dashboard, search, saved views | MVP |
| Projects | Own project container application behavior and project-level work context. | Project containers, project status, project item feeds | Workspace, tasks, lists, notes, files, links, metadata, search | Dashboard, timeline, calendar, saved views | MVP |
| Contacts | Own contact/client container behavior and local CRM-style context. | Contact containers, contact fields, interaction context | Workspace, projects, tasks, notes, files, links, metadata | Dashboard, timeline, saved views | V1 |
| Tasks | Own task-specific application operations and task lifecycle behavior. | Task items, task status, dates, priority, completion | Workspace, projects, contacts, metadata, search | Today, timeline, calendar, dashboard, saved views | MVP |
| Lists | Own checklist and structured-list application operations. | List items, list rows, checklist progress | Workspace, projects, tasks, metadata, search | Projects, dashboard, future pipeline views | MVP |
| Notes | Own Markdown note application operations and note search projections. | Note items, Markdown content, previews | Workspace, projects, contacts, metadata, search | Search, saved views, dashboard | MVP |
| Files | Own local attachment item behavior and safe attachment metadata workflows. | File items, attachments, attachment metadata | Workspace, Electron main/preload IPC, search, backup, export | Projects, contacts, dashboard, search | MVP |
| Links | Own URL/link item behavior and local metadata for captured links. | Link items, URL metadata, browser-capture results later | Workspace, projects, contacts, metadata, search | Search, saved views, dashboard | MVP |
| Metadata | Own tags and categories as local classification systems. | Tags, categories, taggings, category assignments | Workspace, search | Saved views, dashboard, today, all content modules | MVP |
| Search | Own local searchable projections, query behavior, and reindexing entry points. | Search records, indexed content, search diagnostics | Workspace, content modules, database/search repository | Global search, saved views, dashboard, maintenance | MVP |
| Saved Views | Own collection and smart-list query definitions. | Saved views, collections, smart-list filters | Workspace, metadata, search, tasks, projects, contacts | Dashboard, Today filters, future reports | V1 |
| Today | Own daily planning, due/overdue task projections, and rollover planning flows. | Daily plans, planned task references, Today/Tomorrow lanes | Tasks, metadata, saved views, workspace | Dashboard, timeline, calendar | V1 |
| Dashboard | Own workspace overview widgets, project health summaries, and saved-view widgets. | Dashboard widgets, summary cards, health summaries | Workspace, projects, tasks, search, saved views, today | Workspace home, planning views | V1 |
| Timeline | Own timeline projections for dated work and project ranges. | Timeline entries, date ranges, grouped dated work | Tasks, projects, contacts, metadata, saved views | Calendar, dashboard, planning views | V1 |
| Calendar | Own month/week/day calendar projections and date interactions. | Calendar entries, local dated work, local imports later | Tasks, timeline, metadata, workspace | Today, dashboard, planning views | V1 |
| Backup | Own local backup orchestration and backup integrity checks. | Backup snapshots, manifests, integrity reports | Workspace, files, database services, Electron main/preload IPC | Maintenance, export, restore later | MVP |
| Export | Own local export orchestration and portable archive outputs. | JSON exports, Markdown exports, CSV/TSV exports, manifests | Workspace, files, metadata, projects, contacts, tasks, notes | Backup, import later, maintenance | MVP |

## Platform And Future Modules

| Module | Purpose | Primary entities | Depends on | Feeds into | Priority |
| --- | --- | --- | --- | --- | --- |
| Database | Own SQLite setup, Drizzle schema, migrations, repositories, transaction helpers, and database health checks. | Schema, migrations, repositories, transactions | Core types | All data-backed modules | MVP |
| Activity Log | Record meaningful data-changing operations in the same write flow as domain mutations. | Activity events, audit metadata | Database, domain services | Search, dashboard, maintenance | MVP |
| Templates | Define reusable local project, contact, tab, list, note, and workflow templates. | Template definitions, template instances | Projects, contacts, lists, notes, metadata | Workflows, import/export | V2 |
| Workflows | Provide safe local manual and scheduled workflow actions after core operations are stable. | Workflow definitions, runs, action history | Templates, activity log, all mutable modules | Automation views, maintenance | V2 |

## Module Boundaries

### Workspace

Owns:

- Workspace-facing application service contracts.
- Current workspace identity, metadata, health summaries, and maintenance entry points.
- Coordination with Electron main/preload IPC for local folder operations.

Does not own:

- Raw filesystem access from renderer code.
- SQLite schema, migrations, or repositories.
- Product objects such as projects, contacts, tasks, notes, files, or links.

Expected service methods later:

- `createWorkspace`
- `openWorkspace`
- `listRecentWorkspaces`
- `getWorkspaceHealth`
- `repairWorkspaceStructure`

Integration points:

- Electron main/preload IPC for folder and file operations.
- Database bootstrap and health services.
- Backup/export maintenance flows.

### Inbox

Owns:

- Quick capture and triage application operations.
- Movement from Inbox into projects, contacts, or other containers.
- Inbox-specific empty, filtered, and backlog projections.

Does not own:

- Project/contact container persistence.
- Task, note, file, or link type-specific writes.
- Search index implementation.

Expected service methods later:

- `captureToInbox`
- `listInboxItems`
- `moveInboxItem`
- `dismissInboxItem`

Integration points:

- Tasks, notes, files, links, and metadata modules for captured content.
- Activity log and search updates through the standard write flow.
- Today and dashboard projections.

### Projects

Owns:

- Project container operations and project-level summaries.
- Project item feed coordination across tasks, lists, notes, files, and links.
- Project archive/status application behavior.

Does not own:

- Raw database repositories.
- Contact-specific fields.
- Task/list/note/file/link internals.

Expected service methods later:

- `createProject`
- `updateProject`
- `archiveProject`
- `listProjectItems`
- `getProjectSummary`

Integration points:

- Metadata for tags/categories.
- Search projections for project text.
- Dashboard, timeline, calendar, and saved views.

### Contacts

Owns:

- Contact/client container operations.
- Contact profile context and interaction-history projections.
- Relationships between contacts, projects, and work items.

Does not own:

- General project lifecycle behavior.
- Raw database repositories.
- External account sync or hosted CRM behavior.

Expected service methods later:

- `createContact`
- `updateContact`
- `listContactItems`
- `linkContactToProject`
- `getContactSummary`

Integration points:

- Projects and relationship services.
- Metadata, search, dashboard, and saved views.
- Files, notes, links, and tasks for interaction history.

### Tasks

Owns:

- Task lifecycle operations such as create, update, complete, reopen, snooze, and reschedule.
- Task-specific date, priority, and status application rules.
- Task projections used by Today, timeline, calendar, and dashboards.

Does not own:

- Container persistence.
- Calendar rendering.
- Reminder scheduling internals until the reminder module exists.

Expected service methods later:

- `createTask`
- `updateTask`
- `completeTask`
- `moveTask`
- `listTasksForRange`

Integration points:

- Projects, contacts, and Inbox as task contexts.
- Metadata and search updates.
- Today, dashboard, timeline, calendar, and saved views.

### Lists

Owns:

- Checklist/list application operations.
- List row ordering, indentation, completion, and progress behavior.
- Future pipeline-mode behavior for lists.

Does not own:

- Project container lifecycle.
- General task lifecycle outside list row behavior.
- Kanban or pipeline UI rendering.

Expected service methods later:

- `createList`
- `addListItem`
- `updateListItem`
- `reorderListItems`
- `calculateListProgress`

Integration points:

- Projects and contacts as list contexts.
- Tasks for task-like list rows.
- Search and metadata projections.

### Notes

Owns:

- Markdown note application operations.
- Note autosave and preview/excerpt behavior when implemented.
- Note search projections.

Does not own:

- Rich text editor internals.
- File attachments or external document storage.
- Raw search index implementation.

Expected service methods later:

- `createNote`
- `updateNoteContent`
- `getNotePreview`
- `listNotesForContainer`

Integration points:

- Projects, contacts, and Inbox as note contexts.
- Search for content indexing.
- Metadata, saved views, and dashboard widgets.

### Files

Owns:

- File item and attachment application operations.
- Safe attachment metadata workflows.
- Missing-file and attachment-integrity behavior at the feature layer.

Does not own:

- Direct renderer filesystem access.
- Arbitrary path reads/writes.
- Backup implementation, though it supplies attachment data to backups.

Expected service methods later:

- `attachFile`
- `listAttachments`
- `getAttachmentMetadata`
- `markAttachmentMissing`
- `createAttachmentVersion`

Integration points:

- Electron main/preload IPC for safe local file operations.
- Workspace attachment storage conventions.
- Search, backup, export, projects, and contacts.

### Links

Owns:

- Link item application operations.
- URL normalization and locally stored link metadata contracts.
- Local browser-capture intake later.

Does not own:

- Hosted preview services.
- Browser extension implementation.
- General notes/files search internals.

Expected service methods later:

- `createLink`
- `updateLinkMetadata`
- `normalizeUrl`
- `listLinksForContainer`

Integration points:

- Projects, contacts, and Inbox as link contexts.
- Search and metadata modules.
- Future local browser capture bridge.

### Metadata

Owns:

- Tags and categories as local classification systems.
- Tagging and category assignment application operations.
- Metadata projections used by search and saved views.

Does not own:

- Saved-view query storage.
- Dashboard rendering.
- External/team taxonomy or cloud labels.

Expected service methods later:

- `createTag`
- `renameTag`
- `assignTag`
- `createCategory`
- `assignCategory`
- `mergeTags`

Integration points:

- All content modules.
- Search index updates for searchable metadata.
- Saved views, dashboard, Today, timeline, and calendar filters.

### Search

Owns:

- Search-facing application service contracts.
- Searchable projection coordination and reindex entry points.
- Query result shaping for local search.

Does not own:

- Source-of-truth task/project/note/file records.
- Saved-view persistence.
- Remote indexing services.

Expected service methods later:

- `searchWorkspace`
- `upsertSearchRecord`
- `removeSearchRecord`
- `rebuildWorkspaceIndex`
- `getSearchDiagnostics`

Integration points:

- Database search repository or FTS table.
- All searchable content modules.
- Saved views, dashboard, and maintenance tools.

### Saved Views

Owns:

- Saved query and collection application operations.
- Smart-list filter contracts and result grouping behavior.
- Diagnostics for saved view definitions.

Does not own:

- General search index implementation.
- Dashboard widget layout.
- Metadata mutation rules.

Expected service methods later:

- `createSavedView`
- `updateSavedView`
- `evaluateSavedView`
- `listCollections`
- `validateSavedViewQuery`

Integration points:

- Search and metadata modules.
- Tasks, projects, contacts, and notes as query sources.
- Dashboard widgets and collection routes.

### Today

Owns:

- Today/Tomorrow planning application operations.
- Due, overdue, manual planning, ordering, and rollover projections.
- Daily plan state coordination.

Does not own:

- Task persistence internals.
- Calendar rendering.
- Reminder scheduling internals.

Expected service methods later:

- `getTodayPlan`
- `planTaskForToday`
- `planTaskForTomorrow`
- `reorderPlannedTasks`
- `rolloverDailyPlan`

Integration points:

- Tasks for source records.
- Metadata and saved views for filters.
- Dashboard, timeline, and calendar summaries.

### Dashboard

Owns:

- Dashboard application service contracts.
- Workspace overview widgets and project health summary projections.
- Saved-view widget coordination.

Does not own:

- Source domain writes for tasks/projects/notes/files.
- Saved-view query storage.
- Renderer layout implementation.

Expected service methods later:

- `getDefaultDashboard`
- `getProjectHealthSummary`
- `listDashboardWidgets`
- `resolveWidgetResults`

Integration points:

- Projects, tasks, search, saved views, Today, and metadata.
- Activity log for recent activity widgets.
- Workspace health and maintenance summaries.

### Timeline

Owns:

- Timeline projections for dated work and project ranges.
- Date-range grouping contracts.
- Future rescheduling application coordination.

Does not own:

- Task date persistence internals.
- Calendar view rendering.
- Reminder scheduling.

Expected service methods later:

- `listTimelineEntries`
- `groupTimelineByContainer`
- `rescheduleTimelineEntry`
- `getTimelineRangeSummary`

Integration points:

- Tasks, projects, contacts, metadata, and saved views.
- Calendar for shared dated-entry contracts.
- Dashboard and planning summaries.

### Calendar

Owns:

- Calendar projections over local dated work.
- Month/week/day query contracts.
- Future local calendar import coordination.

Does not own:

- External live calendar sync.
- Task lifecycle internals.
- Timeline rendering.

Expected service methods later:

- `listCalendarEntries`
- `createTaskFromCalendarDate`
- `moveEntryToDate`
- `importLocalIcsFile`

Integration points:

- Tasks as source records.
- Timeline for date-range projections.
- Metadata filters and Today planning.

### Backup

Owns:

- Backup application service contracts.
- Backup snapshot orchestration and integrity-report behavior.
- Backup-before-migration coordination once migrations exist.

Does not own:

- Raw filesystem copy implementation from renderer code.
- Export format definitions.
- Database migration implementation.

Expected service methods later:

- `createBackup`
- `listBackups`
- `verifyBackup`
- `prepareBackupBeforeMigration`
- `restoreBackupIntoNewWorkspace`

Integration points:

- Workspace folder layout and database path services.
- Files/attachments for manifests.
- Electron main/preload IPC for safe local file operations.

### Export

Owns:

- Export application service contracts.
- Full JSON, Markdown, CSV/TSV, and manifest export orchestration.
- Export validation and portable-output boundaries.

Does not own:

- Backup snapshot lifecycle.
- Import/restore behavior until import tickets exist.
- Direct renderer filesystem writes.

Expected service methods later:

- `exportWorkspaceJson`
- `exportProjectMarkdown`
- `exportContactMarkdown`
- `exportTasksCsv`
- `createAttachmentManifest`

Integration points:

- Workspace, projects, contacts, tasks, notes, files, links, and metadata.
- Backup for archive workflows.
- Electron main/preload IPC for safe destination handling.

## Cross-Cutting Rules

- All modules preserve local-only behavior.
- Data-changing modules use the standard write flow: validate, transact, write
  domain data, write activity log, update search when relevant, commit, notify.
- Searchable modules update search projections when the search service exists.
- Filesystem behavior goes through Electron main/preload IPC.
- React components do not call SQLite directly.
- User data should be soft-deleted or archived by default.
