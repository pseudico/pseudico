# Tasks Module

Purpose: own task-specific application operations and task lifecycle behavior.

Owns:

- Task create, update, complete, reopen, move, snooze, and reschedule operations.
- Task-specific date, priority, and status rules.
- Task projections used by Today, timeline, calendar, dashboard, and saved views.

Does not own:

- Container persistence.
- Calendar rendering.
- Reminder scheduling internals until a reminder module exists.

Likely service methods later:

- `createTask`
- `updateTask`
- `completeTask`
- `moveTask`
- `listTasksForRange`

Integration points:

- Projects, contacts, and Inbox as task contexts.
- Metadata and search updates.
- Today, dashboard, timeline, calendar, and saved views.
