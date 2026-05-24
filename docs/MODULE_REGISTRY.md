# Module Registry

This registry names Local Work OS modules, their ownership boundaries, and
their expected integration points. It is the routing map for future feature
tickets: implementation should land in the owning module unless a ticket
explicitly changes the boundary.

The placeholder contracts under `packages/features/src` are intentionally thin.
They define homes for future application services without adding database
schema, UI pages, filesystem behavior, or product logic early.

## Current MVP Module Status

Most MVP modules now have concrete feature services and repository-backed
renderer flows. The registry remains the ownership map for future tickets, but
new work should account for this implemented baseline:

- Implemented MVP/V1 flows: Workspace, Inbox, Projects, Contacts, Content Tabs,
  Tasks, Lists, Notes, Files, Links, Metadata, Search, Saved Views/Collections,
  Today, Dashboard, Templates (list and project/contact container templates), Backup, Export, Import
  validation, Activity Log, Database, and diagnostics.
- Contact pages now include a local interaction timeline and follow-up summary
  that combine contact content, relationships, and activity log projections.
- The Lists/Pipelines slice now supports switching a list between checklist and
  pipeline display modes, projecting top-level rows as stages and child rows as
  movable cards.
- The Files slice now supports local attachment version snapshots with
  workspace-relative version paths, checksums, notes, history browsing, open,
  and cautious restore.
- Local recurrence now has database and service foundations for daily and
  weekly/custom-weekday task roll-forward behavior; monthly/yearly RRULEs remain
  future work.
- Task and list-row date editing now uses a shared single date-range input that
  can persist due-only dates or start/due ranges while preserving all-day versus
  timed metadata.
- Task quick snooze/reschedule actions now share a local menu across task cards,
  Today, search, collections, and dashboard task widgets, including later-today,
  tomorrow, next-week, custom date, and remove-due flows.
- Future-heavy flows: advanced Timeline/Calendar drag/drop editing,
  portable/broader Templates, broader third-party import execution beyond the
  currently documented local paths, custom dashboard editing, advanced
  saved-view builder UX, production browser capture, workflow scheduling, and
  user-authored workflow builder UX.
- Workflows now have a local service foundation with persisted manual,
  item-created, file-imported, tag-added, tag-removed, and category-assigned
  definitions/runs, preview, and service-backed add-tag, set-category,
  move-item, and create-task actions. Workflow actions can interpolate local
  trigger/upstream variables, skip conditional steps, expose run-history
  diagnostics, and roll back undoable activity snapshots. The beta renderer
  exposes only predefined guided household-renovation workflows with read-only
  preview, explicit confirmation, service-backed execution, result summary, and
  run history; scheduling and user-authored workflow builders remain future work.
- Local reminders now have task/list-item targets, default preferences,
  notification enablement, scheduler, IPC, shared picker foundations, and
  renderer entry points; deeper reminder preference workflows remain future
  work.
- Cross-cutting services now include project health, recent activity,
  integrity diagnostics, bounded pagination, app-wide error boundaries/toasts,
  command palette navigation/actions, workspace-scoped recent navigation,
  back/forward route history, top-level app tabs for open project/contact/search/collection views,
  project/contact content-tab summary cards with bounded item previews,
  automatic project/contact library grouping by local facets with persisted
  collapsed-group preferences,
  workspace-scoped appearance preferences,
  unified context menu action providers for local targets, packaged smoke checks,
  automatic backup scheduling/retention, and MVP smoke coverage.
- Large-workspace benchmark services now provide deterministic local fixture
  seeding, service-level budgets, and report generation for open/search,
  dashboard, Today, and export performance gates.
- External import foundations now include local-only Notion Markdown/CSV,
  Todoist CSV/ZIP, Trello JSON, and Evernote ENEX/HTML adapter services for
  previewing source records, attachments/resources, unsupported scope, and
  source-report warnings before importing through existing
  project/note/task/file/tag/search/activity flows.

When adding a future module slice, prefer extending the owning feature service
and matching repository/preload/client boundary rather than creating a parallel
renderer-only implementation.

## Feature Module Map

| Module | Purpose | Primary entities | Depends on | Feeds into | Priority |
| --- | --- | --- | --- | --- | --- |
| Workspace | Coordinate opened local workspaces, workspace metadata, health, and maintenance entry points. | Workspace, workspace metadata, recent workspace references | Electron main/preload IPC, database services, filesystem services | Inbox, projects, backup, export, dashboard | MVP |
| Inbox | Own quick capture and triage workflows before work is filed into another context. | Inbox container, captured items, triage actions | Workspace, projects, contacts, tasks, notes, files, links, metadata | Today, dashboard, search, saved views | MVP |
| Projects | Own project container application behavior and project-level work context. | Project containers, project status, project item feeds | Workspace, tasks, lists, notes, files, links, metadata, search | Dashboard, timeline, calendar, saved views | MVP |
| Contacts | Own contact/client container behavior and local CRM-style context. | Contact containers, contact fields, interaction context | Workspace, projects, tasks, notes, files, links, metadata | Dashboard, timeline, saved views | V1 |
| Content Tabs | Own local project/contact content tab mutations and ordering. | Container tabs | Projects, contacts, items, activity log | Project/contact item feeds, templates later | V1 |
| Container Preferences | Own project/contact display defaults and default quick-add behavior. | Per-container preference payloads in app settings | Projects, contacts, tabs, activity log | Project/contact detail settings panels and feed rendering | V1 |
| Container Grouping | Own automatic project/contact library grouping by status, category, tag, favourite, stale state, company, and contact labels. | Workspace-level grouping preferences, collapsed groups, grouped project/contact view models | Projects, contacts, metadata, activity log | Project/contact library pages, saved/browse workflows later | V1 |
| Tasks | Own task-specific application operations and task lifecycle behavior. | Task items, task status, dates, priority, completion | Workspace, projects, contacts, metadata, search | Today, timeline, calendar, dashboard, saved views | MVP |
| Lists | Own checklist and structured-list application operations. | List items, list rows, checklist progress | Workspace, projects, tasks, metadata, search | Projects, dashboard, future pipeline views | MVP |
| Notes | Own Markdown note application operations and note search projections. | Note items, Markdown content, previews | Workspace, projects, contacts, metadata, search | Search, saved views, dashboard | MVP |
| Files | Own local attachment item behavior and safe attachment metadata workflows. | File items, attachments, attachment metadata | Workspace, Electron main/preload IPC, search, backup, export | Projects, contacts, dashboard, search | MVP |
| Links | Own URL/link item behavior and local metadata for captured links. | Link items, URL metadata, browser-capture results later | Workspace, projects, contacts, metadata, search | Search, saved views, dashboard | MVP |
| Browser Capture | Own the local-only browser capture payload contract and safe disabled bridge prototype. | Browser capture payloads, Inbox link/task capture requests | Links, tasks, Inbox, Electron main/preload security | Future browser extension/native messaging intake | V2 |
| Quick Start Actions | Own context-aware local action registration for one-step creation into the current container/tab or Inbox. | Quick Start action descriptors, target resolution, create-action UI | Inbox, projects, contacts, tasks, notes, lists, files, links, command palette | Top bar, project/contact pages, fast capture | V1 |
| Command Palette | Own central local action registration, command matching, keyboard execution, and palette navigation. | Action descriptors, route actions, local UI commands | App shell, navigation, feature services | Fast navigation, quick capture, future shortcut registry | V1 |
| Context Menus | Own local right-click/keyboard menu target contracts and action filtering for containers, items, list rows, metadata, files, and saved views. | Context menu targets, action descriptors, grouped menu UI | Action registry, items, projects, metadata, files, saved views | Project/contact feeds, metadata browser, saved views, future shortcuts | V1 |
| Navigation History | Own workspace-scoped recent content persistence and app back/forward route stacks. | Recent navigation targets, route stack entries | App shell, app settings, projects, contacts, items, saved views | Top bar recent menu, fast content restore | V1 |
| App Tabs | Own top-level open-view tab session state, active tab selection, and tab order. | App tab route targets, active tab id | App shell, app settings, navigation history | Fast switching among open projects, contacts, search, and collections | V1 |
| Appearance | Own local theme, density, and font-size preferences plus renderer appearance contracts. | Appearance settings payloads, CSS variables, ThemeProvider state | Workspace, app settings, activity log, Electron main/preload IPC | App shell, cards, dashboard, settings | V1 |
| Metadata | Own tags and categories as local classification systems. | Tags, categories, taggings, category assignments | Workspace, search | Saved views, dashboard, today, all content modules | MVP |
| Search | Own local searchable projections, query behavior, and reindexing entry points. | Search records, indexed content, search diagnostics | Workspace, content modules, database/search repository | Global search, saved views, dashboard, maintenance | MVP |
| Saved Views | Own collection and smart-list query definitions. | Saved views, collections, smart-list filters | Workspace, metadata, search, tasks, projects, contacts | Dashboard, Today filters, future reports | V1 |
| Today | Own daily planning, due/overdue task projections, and rollover planning flows. | Daily plans, planned task references, Today/Tomorrow lanes | Tasks, metadata, saved views, workspace | Dashboard, timeline, calendar | V1 |
| Dashboard | Own workspace overview widgets, project health summaries, and saved-view widgets. | Dashboard widgets, summary cards, health summaries | Workspace, projects, tasks, search, saved views, today | Workspace home, planning views | V1 |
| Reminders | Own local task/list-item reminder policies, default preferences, reminder event state, and scheduler-facing projections. | Reminder policies, reminder events, app-setting defaults | Tasks, lists, activity log, Electron main notifications | Today, dashboard, future calendar | V1 |
| Recurrence | Own narrow local repeating-task rules and recurring task roll-forward behavior. | Recurrence rules, task recurrence pointers | Tasks, activity log, search, reminders | Today, timeline, calendar | V2 |
| Timeline | Own timeline projections for dated work and project ranges. | Timeline entries, date ranges, grouped dated work | Tasks, projects, contacts, metadata, saved views | Calendar, dashboard, planning views | V1 |
| Calendar | Own month/week/day calendar projections and date interactions. | Calendar entries, local dated work, local imports later | Tasks, timeline, metadata, workspace | Today, dashboard, planning views | V1 |
| Backup | Own local backup orchestration, restore into a new workspace, and backup integrity checks. | Backup snapshots, manifests, restore summaries, integrity reports | Workspace, files, database services, Electron main/preload IPC | Maintenance, export/import, restore | MVP |
| Export | Own local export orchestration and portable archive outputs. | JSON exports, Markdown exports, CSV/TSV exports, manifests | Workspace, files, metadata, projects, contacts, tasks, notes | Backup, import later, maintenance | MVP |
| Local Email Import | Own local EML/Maildir parsing, preview summaries, task creation, and original-email attachment preservation. | Imported email task payloads, original `.eml` attachments | Tasks, files/attachments, metadata, search, activity log, Electron main/preload IPC | Inbox, Quick Add/import workflows, search | V2 |
| Printing | Own sanitized local print/PDF rendering for selected items and container/view projections. | Print HTML documents, PDF export summaries, print export activity | Workspace, items, projects, contacts, collections, dashboard, Electron printToPDF | Export, activity, files metadata | V1 |
| Optional Workspace Encryption | Research and gated future implementation planning for opt-in local at-rest encryption of SQLite data, attachments, backups, exports, and derived caches. | Encryption gates, unlock contract, recovery plan, encrypted workspace migration plan | Workspace, Database, Files, Backup, Export, Search, Electron main/preload IPC | Future security hardening tickets | Future |
| Performance | Own deterministic local large-workspace fixtures, benchmark operation budgets, and report artifacts for service-layer performance gates. | Benchmark budgets, fixture summaries, benchmark reports | Database fixtures, Search, Dashboard, Today, Export | Release QA, maintenance, performance regressions | V1 |

## Platform And Future Modules

| Module | Purpose | Primary entities | Depends on | Feeds into | Priority |
| --- | --- | --- | --- | --- | --- |
| Database | Own SQLite setup, Drizzle schema, migrations, repositories, transaction helpers, and database health checks. | Schema, migrations, repositories, transactions | Core types | All data-backed modules | MVP |
| Activity Log | Record meaningful data-changing operations in the same write flow as domain mutations. | Activity events, audit metadata | Database, domain services | Search, dashboard, maintenance | MVP |
| Templates | Define reusable local project, contact, tab, list, note, and workflow templates; currently implements local list templates first. | Template definitions, template instances | Projects, contacts, lists, notes, metadata | Workflows, import/export | V2 |
| Workflows | Provide safe guided local workflows with preview, confirmation, execution, and durable run history while excluding broad automation. | Guided templates, workflow runs, action history, variable interpolation, conditional steps | Templates, activity log, all mutable modules | Workflows page, search/activity, future builder only if explicitly ticketed | V1 |

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
- Contact custom-label browsing by flexible fields, company, role, location,
  email domain, tags, categories, and status.
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
- `getContactLabelBrowser`

Integration points:

- Projects and relationship services.
- Metadata, search, dashboard, and saved views.
- Files, notes, links, and tasks for interaction history.

### Browser Capture

Owns:

- Local-only browser capture payload normalization.
- Conversion of captured web pages into Inbox links and tasks through existing services.
- Disabled-by-default bridge design for future native messaging or localhost experiments.

Does not own:

- Browser extension publication or installation.
- Cloud capture, hosted previews, telemetry, or remote storage.
- Direct database/filesystem access from renderer or browser-originated code.

Expected service methods:

- `captureWebPage`
- `createInboxLinkFromCapture`
- `createInboxTaskFromCapture`

Integration points:

- Links and tasks for persisted Inbox items.
- Activity log and search through existing write services.
- Electron main/preload security for any future bridge enablement.

### Command Palette

Owns:

- Central action descriptors and local action matching.
- App-shell palette UI and keyboard execution for registered actions.
- Shared default shortcut registry and read-only shortcut help surface.
- Navigation and safe local UI commands such as opening Quick Add.

Does not own:

- Persisted keyboard shortcut customization.
- Data-changing writes that bypass existing feature services.
- Cloud commands or remote command execution.

Expected service methods:

- `registerAction`
- `searchActions`
- `executeAction`

Integration points:

- App shell and route registry for navigation actions.
- Quick Add and future feature services for local commands.
- Settings > Keyboard shortcuts for discoverable read-only defaults.
- Future preferences storage when configurable shortcuts are introduced.

### Context Menus

Owns:

- Shared `ContextMenuTarget` and context action provider contracts.
- Filtering, grouping, and disabled-state handling for right-click and keyboard menus.
- Reusable renderer menu primitives for local containers, items, list rows, metadata, files, and saved views.

Does not own:

- Domain mutations that bypass existing feature services/repositories.
- Operating system shell menu implementation.
- Cloud sharing, public links, or remote clipboard/sync behavior.

Expected service methods:

- `getContextMenuActions`
- `resolveContextMenuActions`
- `createContextMenuActionRegistry`

Integration points:

- Action registry descriptors for command consistency.
- Project/Inbox item feeds, metadata browser, file actions, and saved-view lists.
- Existing IPC-backed file open/reveal flows and service-backed item writes.

### App Tabs

Owns:

- Workspace-scoped open app tab session state persisted in app settings.
- Active tab selection for project/contact/search/collection route targets.
- Close and reorder behavior for top-level app tabs.

Does not own:

- Project/contact content tabs inside a container.
- Browser tabs, cloud sync, or cross-device session state.
- Domain content writes beyond recording existing navigation history targets.

Expected service methods:

- `listTabs`
- `openTab`
- `closeTab`
- `reorderTabs`
- `setActiveTab`

Integration points:

- App shell tab strip for user-facing switching.
- Navigation history recent targets when tabs are opened.
- App settings repository for local-only session persistence.

### Appearance

Owns:

- Workspace-scoped light, dark, and system theme preference persistence.
- Comfortable/compact density and small/medium/large font-size validation.
- Renderer appearance context, CSS variable tokens, and settings page controls.

Does not own:

- Cloud profile sync, hosted accounts, or cross-device preferences.
- Per-object custom themes, proprietary visual designs, or external assets.
- Raw renderer database/filesystem access.

Implemented service methods:

- `getSettings`
- `updateSettings`

Integration points:

- `app_settings` repository for local persistence.
- Activity Log for user-visible preference writes.
- Main/preload IPC, `ThemeProvider`, app shell, cards, dashboard, and Settings.

### Internationalization

Owns:

- Local translation message keys and English resources for shell/navigation
  copy.
- Locale-aware date/time and number formatting helpers.
- A read-only Settings placeholder for future locale preference work.

Does not own:

- Hosted translation services, telemetry, cloud locale sync, or automatic
  language downloads.
- Persisted locale selection until a scoped follow-up ticket defines the
  settings write flow.

Implemented service methods:

- `t`
- `createTranslator`
- `formatLocalizedDateTime`
- `formatLocalizedNumber`

Integration points:

- App shell/sidebar/top-bar labels and route metadata.
- Settings language/locale placeholder.
- Future renderer string migrations through core-owned message keys.

### Content Tabs

Owns:

- Project/contact tab create, template-create, rename, reorder, duplicate,
  local hide/show, archive, and soft-delete operations.
- Active-tab filtering in project/contact content feeds.
- Activity events for user-visible tab writes.

Does not own:

- Item editor internals.
- Item editor internals beyond delete-time item handling.
- Raw database access from renderer code.

Expected service methods:

- `listTabs`
- `createTab`
- `createTabFromTemplate`
- `renameTab`
- `reorderTabs`
- `hideTab`
- `showTab`
- `duplicateTab`
- `archiveTab`
- `deleteTab`

Integration points:

- Projects and contacts as editable tab containers.
- Tasks, lists, notes, links, and files through `containerTabId`.
- Tab templates for built-in local tab scaffolds.
- Activity log for tab write history.

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
- URL normalization, opt-in web metadata fetching, and locally stored link
  metadata contracts.
- Local browser-capture intake later.

Does not own:

- Hosted preview services or automatic/background network fetching.
- Browser extension implementation.
- General notes/files search internals.

Expected service methods later:

- `createLink`
- `updateLinkMetadata`
- `fetchLinkMetadata`
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

### Reminders

Owns:

- Local task and list-item reminder policy and reminder event persistence.
- Workspace default reminder and notification-enabled preferences.
- Set, clear, dismiss, snooze, and target date rescheduling behavior.
- Scheduler-facing event projections for Electron main-process notifications.

Does not own:

- Cloud push notifications, mobile notifications, or hosted accounts.
- General task/list lifecycle rules outside reminder rescheduling hooks.
- Full renderer recurrence UX.

Expected service methods:

- `setTaskReminder`
- `clearTaskReminder`
- `dismissReminder`
- `snoozeReminder`
- `rescheduleReminderForTaskDateChange`

Integration points:

- Tasks and list items for start/due-date changes and target context.
- Activity log for all reminder writes.
- Electron main for local notifications only.

### Recurrence

Owns:

- Local task recurrence rules for daily, weekly, and custom weekday schedules.
- Next-occurrence calculation and recurring task completion roll-forward.
- Activity log coverage for recurrence set, clear, and advance writes.

Does not own:

- Monthly/yearly RRULE support.
- Cloud calendars or external sync.
- General task lifecycle rules outside recurrence hooks.

Expected service methods:

- `setRecurrenceRule`
- `clearRecurrenceRule`
- `calculateNextOccurrence`
- `completeRecurringTask`

Integration points:

- Tasks for source records and due-date updates.
- Search for changed task-date projections.
- Reminders for relative reminder rescheduling after recurrence advance.

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
- Automatic backup scheduler settings/status and retention cleanup.
- Backup-before-migration coordination hooks for migrations.

Does not own:

- Raw filesystem copy implementation from renderer code.
- Export format definitions.
- Database migration implementation.

Expected service methods later:

- `createBackup`
- `listBackups`
- `getAutomaticBackupSettings`
- `runAutomaticBackupCheck`
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
- Full JSON, Markdown, CSV/TSV, HTML bundle, and manifest export orchestration.
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
- `exportHtmlCsvTsvMarkdownBundle`
- `createAttachmentManifest`

Integration points:

- Workspace, projects, contacts, tasks, notes, files, links, and metadata.
- Backup for archive workflows.
- Electron main/preload IPC for safe destination handling.

### Local Email Import

Owns:

- Local EML file and Maildir folder scanning through Electron main-process IPC.
- EML header/body parsing, sanitized preview text, and email-to-task task body shaping.
- Original email preservation by copying `.eml`/Maildir message files into local attachments.
- Renderer drop routing for `.eml` files so Inbox and project content can create
  local email tasks without renderer filesystem access.

Does not own:

- Hosted email-to-task, cloud mailboxes, IMAP sync, or background network polling.
- Direct renderer filesystem access.
- A dedicated email item schema; imported email currently becomes task items with attachments.

Implemented service methods:

- `previewMessages`
- `importMessagesAsTasks`

Integration points:

- Tasks for imported work items.
- Files/attachments for original email preservation.
- Tags/search/activity via the existing task and file write flows.
- Settings import action and future Quick Add target integration.

### CSV/TSV Import

Owns:

- Local CSV/TSV parsing, inferred field mapping, validation previews, and
  conflict-aware execution for task, contact, and project imports.
- Import job activity summaries plus created-record activity/search/tag/category
  integration through existing domain services.

Does not own:

- Renderer filesystem reads, cloud spreadsheet sources, remote sync, or hosted
  import services.
- Arbitrary schema migration/import beyond the mapped task/contact/project
  spreadsheet workflow.

Implemented service methods:

- `parse`
- `inferMapping`
- `previewImport`
- `executeImport`

Integration points:

- Tasks, contacts, projects, categories, tags, search, activity log, and
  Electron main/preload IPC for safe local file access.


### Markdown Folder Import

Owns local Markdown folder scanning through Electron main-process IPC, previewing
folder-to-project mappings, importing Markdown files as notes, first-level folders
as project tabs, nested folders as headings, and non-Markdown files as local
attachments. Does not own cloud migration, remote storage, renderer filesystem
access, or arbitrary path traversal. Integrates with Projects, Tabs, Notes,
Files/attachments, Search, and Activity Log through existing service write flows.

### External Import Research

Owns docs-only evaluation of local export files from common productivity apps,
including importer order, tradeoffs, fixture requirements, and proposed follow-up
tickets. Does not own app-specific production importers, cloud connectors,
account login, telemetry, remote attachment fetching, or proprietary UI/assets.
See `docs/import-research/COMMON_APP_IMPORT_FORMATS.md`.

### Evernote Import

Owns local ENEX and HTML notebook export preview/import, including note title,
tags, created/updated timestamp preservation in import metadata, matched local
resources as note attachments, and source-report warnings for unsupported rich
formatting. Does not own Evernote account/API access, remote resource fetching,
or exact rich-text parity. Integrates with Projects, Notes, Tags,
Files/attachments, Search, and Activity Log through existing service flows.

### Printing

Owns:

- Sanitized print-safe HTML for selected items and full local container/view
  projections.
- Electron `printToPDF` orchestration through main/preload IPC.
- Local PDF export activity records.

Does not own:

- Cloud sharing, hosted PDF generation, or renderer filesystem writes.
- Proprietary layouts or external print services.

Implemented service methods:

- `buildPrintHtml`
- `recordPrintPdfExport`
- `printPdf`

Integration points:

- Items, tasks, notes, lists, links, file metadata, projects, contacts,
  collections, dashboards, export folders, and activity logs.


### Maintenance

Owns:

- Local database maintenance job orchestration for SQLite integrity checks, VACUUM, search-index rebuilds, attachment manifest audits, and orphan attachment scans/cleanup.
- App-settings-backed maintenance job logs and user-visible progress summaries.
- Backup preflight coordination before write maintenance.

Does not own:

- Cloud diagnostics, telemetry, or remote repair services.
- Direct renderer filesystem or SQLite access.
- Hard deletion of orphan attachment files; cleanup quarantines them under local logs so the user can recover them.

Implemented service methods:

- `runMaintenanceJob`
- `listJobLogs`

Integration points:

- Backup service for preflight snapshots.
- Search index service for local rebuilds.
- Electron main/preload IPC and Settings > Maintenance.
- Activity Log for maintenance and search-rebuild events.

### Demo Workspace

Owns optional first-run sample workspace generation from the Welcome screen,
including fictional local projects, contacts, tasks, notes, lists, link
metadata, generated attachment content, tags, categories, relationships, saved
views, and demo-generation activity. Does not own proprietary assets, cloud
seed data, remote metadata fetches, telemetry, or renderer filesystem access.
Integrates with workspace creation, Electron main-process attachment file
creation, feature services, activity log, and search/saved-view projections.

## Cross-Cutting Rules

- All modules preserve local-only behavior.
- Data-changing modules use the standard write flow: validate, transact, write
  domain data, write activity log, update search when relevant, commit, notify.
- Searchable modules update search projections when the search service exists.
- Filesystem behavior goes through Electron main/preload IPC.
- React components do not call SQLite directly.
- User data should be soft-deleted or archived by default.

### Container Media

Owns local visual identity assignments for projects and contacts: project banners and contact avatars/photos. Uses attachment-backed storage, generated thumbnail paths, activity log events for set/remove operations, and Electron IPC for all filesystem access. Does not own cloud media, remote storage, or renderer filesystem access.

### Comments

Owns local comments and annotations for containers, items, and list rows. Comment writes go through repository/service layers, create activity events, soft-delete removed comments, and refresh the target search projection. Does not own cloud/team comments or remote sharing.


### Calendar Feeds

Owns local .ics import into read-only calendar source/event records, calendar projection integration, local search indexing, and explicit network-feed guardrails. Does not own live cloud sync, hosted accounts, editable external events, or background network refresh without user-enabled network preference.



### Optional IMAP Import

Owns optional local IMAP account settings, connection-test/import orchestration, duplicate-prevention markers, and run history. Does not own hosted email capture, cloud sync, telemetry, or password storage in SQLite. Integrates with the existing local email-to-task importer so imported mailbox messages use task/search/activity flows already present in the app.

### Optional Workspace Encryption

Owns the research and future gated implementation plan for optional local
workspace encryption. A production implementation must use a vetted
SQLite-encryption adapter, keep all unlock/key material behind Electron
main/preload IPC, encrypt attachments outside the database, and define
backup/export/search/recovery behavior before any workspace migration. Does not
own hosted recovery, cloud key escrow, telemetry, renderer key handling, or
homegrown cryptography. See
`docs/DECISIONS/ADR-0004-optional-workspace-encryption-spike.md`.
