# ADR-0003: Universal Container And Item Model

- Status: Accepted
- Date: 2026-04-30
- Owners: Local Work OS maintainers

## Context

Local Work OS has a broad productivity surface: projects, contacts, Inbox,
tasks, lists, notes, files, links, tags, categories, saved views, Today,
dashboard, timeline/calendar, templates, workflows, backup/export/import, and
relationships. Treating every object as unrelated would increase duplicate
logic for search, activity, attachments, relationships, soft delete, and views.

## Decision

Use a universal container/item model where practical. Projects, contacts,
Inbox, and similar organizational surfaces are containers. Tasks, notes, files,
links, checklist records, and related work objects are items. Shared services
handle activity logging, relationships, search projections, soft delete, and
workspace-relative local file references.

## Consequences

- Common behavior can be implemented once and reused across modules.
- Search, activity, relationships, and saved views have a consistent foundation.
- Feature-specific payloads still need typed boundaries so the shared model does
  not become an unstructured catch-all.
- Schema changes should be introduced incrementally through scoped database
  tickets and migrations.

## Alternatives Considered

- Separate tables and services for every feature with no shared model: rejected
  because it would duplicate cross-cutting behavior.
- Fully generic records with all behavior in metadata blobs: rejected because it
  would weaken type safety and make migrations harder to reason about.

## Related Documents

- `docs/DATA_MODEL.md`
- `docs/MODULE_REGISTRY.md`
- `docs/COVERAGE_MATRIX.md`
