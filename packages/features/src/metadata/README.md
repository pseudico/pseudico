# Metadata Module

Purpose: own tags and categories as local classification systems.

Owns:

- Tag and category application operations.
- Tagging and category assignment contracts.
- Metadata projections used by search and saved views.

Does not own:

- Saved-view query storage.
- Dashboard rendering.
- External/team taxonomy or cloud labels.

Likely service methods later:

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
