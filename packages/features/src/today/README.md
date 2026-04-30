# Today Module

Purpose: own daily planning, due/overdue projections, and rollover planning
flows.

Owns:

- Today/Tomorrow planning application operations.
- Due, overdue, manual planning, ordering, and rollover projections.
- Daily plan state coordination.

Does not own:

- Task persistence internals.
- Calendar rendering.
- Reminder scheduling internals.

Likely service methods later:

- `getTodayPlan`
- `planTaskForToday`
- `planTaskForTomorrow`
- `reorderPlannedTasks`
- `rolloverDailyPlan`

Integration points:

- Tasks for source records.
- Metadata and saved views for filters.
- Dashboard, timeline, and calendar summaries.
