# Saved Views Module

Purpose: own collection and smart-list query definitions.

Owns:

- Saved query and collection application operations.
- Smart-list filter contracts and result grouping.
- Diagnostics for saved view definitions.

Does not own:

- General search index implementation.
- Dashboard widget layout.
- Metadata mutation rules.

Implemented service methods:

- `createSavedView`
- `updateSavedView`
- `evaluateSavedView`
- `listCollections`
- `validateSavedViewQuery`
- `previewSmartList`

Supported visual criteria:

- Target type: containers, items, or both.
- Item type and container type.
- Specific containers.
- Tags and categories, including empty/non-empty category checks.
- Generic status, task status, and task priority.
- Due date presets and custom ranges.
- Text contains.
- Attachment presence.
- Pinned/unpinned state.
- Active, archived, or active-plus-archived results.
- Match all/any, grouping, sorting, and preview before saving.

Integration points:

- Search and metadata modules.
- Tasks, projects, contacts, and notes as query sources.
- Dashboard widgets and collection routes.
