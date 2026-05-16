# Activity and Search Reconciliation

Purpose: prove that operator-facing writes leave two pieces of recoverability evidence behind: an activity-log event an operator/support person can understand, and a search-index projection that matches the current source record.

## Coverage added for PSE-202 / PSE-OR-007

Automated test: `packages/features/tests/activitySearchReconciliation.test.ts`.

The regression suite creates a fresh bootstrapped workspace and exercises these integrated write paths:

- Workspace bootstrap and system Inbox search projection.
- Project and contact creation/update.
- Task, note, list, list-row, link, and file attachment creation/update.
- Manual tags, category assignments, relationships, saved views, collections, and Today planning.
- File-item soft delete and attachment-search visibility.
- Search health degradation detection for missing, orphaned, and stale deleted rows.
- Maintenance search-index rebuild repair plus activity-log evidence.

## Standards enforced

For nontechnical operator handoff, a write is not considered complete unless:

1. The source record is persisted through the service/repository layer.
2. A target activity entry exists with a non-empty summary.
3. Searchable content appears in the search index with updated title/body/tags/category metadata.
4. Deleted or archived user data is hidden from normal search through `isDeleted` rather than silently hard-deleted.
5. Search health reports `healthy` after normal service mutations.
6. If search health is manually degraded, maintenance rebuild returns it to `healthy` and logs `search_index_rebuilt` plus `database_maintenance_run`.

## Findings resolved in this ticket

- Workspace bootstrap now indexes the system Inbox container, so a fresh workspace does not start with a missing core search projection.
- Workspace bootstrap now gives the `workspace_created` activity event an operator-readable summary.
- Generic item lifecycle updates now reindex attachments belonging to the item, so deleting or moving/updating a file item also updates attachment search visibility and metadata.

## Validation commands

```bash
pnpm test packages/features/tests/activitySearchReconciliation.test.ts
pnpm lint
pnpm typecheck
pnpm test
```
