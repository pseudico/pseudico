# Lists Module

Purpose: own checklist and structured-list application operations.

Owns:

- List create/update behavior.
- List row ordering, indentation, completion, and progress calculations.
- Future pipeline-mode behavior for lists.

Does not own:

- Project container lifecycle.
- General task lifecycle outside list row behavior.
- Kanban or pipeline UI rendering.

Likely service methods later:

- `createList`
- `addListItem`
- `updateListItem`
- `reorderListItems`
- `calculateListProgress`

Integration points:

- Projects and contacts as list contexts.
- Tasks for task-like list rows.
- Search and metadata projections.
