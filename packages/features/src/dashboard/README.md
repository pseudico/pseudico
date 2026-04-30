# Dashboard Module

Purpose: own workspace overview widgets, project health summaries, and
saved-view widget coordination.

Owns:

- Dashboard application service contracts.
- Workspace overview widgets and project health projections.
- Saved-view widget coordination.

Does not own:

- Source domain writes for tasks/projects/notes/files.
- Saved-view query storage.
- Renderer layout implementation.

Likely service methods later:

- `getDefaultDashboard`
- `getProjectHealthSummary`
- `listDashboardWidgets`
- `resolveWidgetResults`

Integration points:

- Projects, tasks, search, saved views, Today, and metadata.
- Activity log for recent activity widgets.
- Workspace health and maintenance summaries.
