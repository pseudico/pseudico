# Search Module

Purpose: own local searchable projections, query behavior, and reindexing entry
points.

Owns:

- Search-facing application service contracts.
- Searchable projection coordination.
- Reindex and diagnostics entry points.

Does not own:

- Source-of-truth task/project/note/file records.
- Saved-view persistence.
- Remote indexing services.

Likely service methods later:

- `searchWorkspace`
- `upsertSearchRecord`
- `removeSearchRecord`
- `rebuildWorkspaceIndex`
- `getSearchDiagnostics`

Integration points:

- Database search repository or FTS table.
- All searchable content modules.
- Saved views, dashboard, and maintenance tools.
