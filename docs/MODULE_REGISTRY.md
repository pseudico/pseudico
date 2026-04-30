# Module Registry

This registry names planned Local Work OS modules and their responsibilities.
It is documentation only. Feature placeholder files belong to the follow-up
module contracts ticket.

| Module | Responsibility |
| --- | --- |
| Workspace | Own local workspace selection, metadata, folder layout, portability, health checks, and maintenance entry points. |
| Database | Own SQLite setup, Drizzle schema, migrations, transaction helpers, repositories, and database health checks. |
| Activity Log | Record meaningful user and system data changes in the same write flow as domain mutations. |
| Search | Maintain local searchable projections, full-text search, ranking, filters, diagnostics, and reindexing. |
| Inbox | Provide local quick capture, triage, and movement of captured items into projects, contacts, lists, or saved views. |
| Projects | Model project containers, overview metadata, related items, status, hierarchy, archive behavior, and project views. |
| Contacts | Model contact containers, fields, related projects/items, interaction history, and local CRM-style context. |
| Tasks | Model tasks, due dates, completion, recurrence, snooze/reminders, statuses, ordering, and task views. |
| Lists | Model checklists, structured lists, bulk paste, ordering, indentation, and later pipeline-style display modes. |
| Notes | Store local Markdown notes, autosave behavior, note search projections, and links to containers/items. |
| Files | Import, reference, reveal, preview, version, and verify local attachments without hosted storage. |
| Links | Store URLs, local metadata, browser capture results, and relationships to containers/items. |
| Tags/Categories | Provide flexible tags and deliberate categories for classification, filtering, colors, and saved views. |
| Saved Views | Persist local query definitions, smart lists, collection views, filters, grouping, and diagnostics. |
| Today | Show due/overdue work, day planning, tomorrow planning, rollover, and rapid planning flows. |
| Dashboard | Provide configurable local widgets, default workspace overview, saved-view widgets, and project health summaries. |
| Timeline | Display dated work and events across containers/items with local grouping and rescheduling behavior. |
| Calendar | Provide month/week/day views, local task/date interaction, and later local ICS import. |
| Backup/Export | Create local backup bundles, exports, restore checks, integrity verification, and portable archive outputs. |
| Templates | Define local project, contact, tab, list, and workflow templates that can be reused and imported/exported. |
| Workflows | Provide local manual and scheduled workflow actions after core item/container operations are stable. |

## Cross-Cutting Rules

- All modules must preserve local-only behavior.
- Data-changing modules must use the standard write flow.
- Searchable modules must update search projections when the search service
  exists.
- Filesystem behavior must go through Electron main/preload IPC.
- User data should be soft-deleted or archived by default.
