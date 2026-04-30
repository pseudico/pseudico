# Projects Module

Purpose: own project container application behavior and project-level work
context.

Owns:

- Project container application operations.
- Project-level summaries and status behavior.
- Coordination of mixed project item feeds.

Does not own:

- Raw database repositories.
- Contact-specific fields.
- Task/list/note/file/link internals.

Likely service methods later:

- `createProject`
- `updateProject`
- `archiveProject`
- `listProjectItems`
- `getProjectSummary`

Integration points:

- Metadata and search.
- Tasks, lists, notes, files, and links.
- Dashboard, timeline, calendar, and saved views.
