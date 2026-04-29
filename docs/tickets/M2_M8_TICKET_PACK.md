---
title: Local Work OS Reference Document
created: 2026-04-29
scope: local-only desktop productivity app
status: generated aggregate reference for Codex / Linear setup
---


# Local Work OS — M2–M8 Complete Feature Ticket Pack

This aggregate pack contains the core MVP, V1, and first advanced-local feature tickets after the M0/M1 scaffold and database foundation.
It is intended to be referenced by Linear issues and Codex implementation tasks.

## Import recommendation

Do not import all tickets as active work at once. Use waves:

1. M2 after M0/M1 scaffold is passing.
2. M3 after containers/items are stable.
3. M4 after projects/tasks/notes/lists can persist.
4. M5 after search and saved views exist.
5. M6 when MVP hardening begins.
6. M7/M8 after MVP is usable.

## Cross-ticket rules

- Every write must create activity log events.
- Searchable changes must update search index.
- React must not call SQLite directly.
- Renderer must not directly access filesystem APIs.
- Scope must stay local-only.
- Prefer small PRs over broad rewrites.


---

# M2 ticket group


## M2-001 — Implement container service and repository CRUD

**Phase:** M2  
**Suggested Linear labels:** `phase:m2`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Build create/read/update/archive/soft-delete flows for containers, including system-container safety.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `containers, container_tabs`.

### Implementation method

Expected service or boundary: `ContainerService, ContainerRepository`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M2-001: Implement container service and repository CRUD.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M2-002 — Implement universal item service and repository CRUD

**Phase:** M2  
**Suggested Linear labels:** `phase:m2`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Build create/read/update/archive/soft-delete/move flows for universal items.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `items`.

### Implementation method

Expected service or boundary: `ItemService, ItemRepository`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M2-002: Implement universal item service and repository CRUD.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M2-003 — Implement container content feed queries

**Phase:** M2  
**Suggested Linear labels:** `phase:m2`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Return mixed item feeds by container/tab with manual ordering and deleted/archived filtering.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `items, container_tabs`.

### Implementation method

Expected service or boundary: `ItemQueryService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M2-003: Implement container content feed queries.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M2-004 — Implement relationship service

**Phase:** M2  
**Suggested Linear labels:** `phase:m2`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create/query/delete typed relationships between containers, items, and list items.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `relationships`.

### Implementation method

Expected service or boundary: `RelationshipService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M2-004: Implement relationship service.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M2-005 — Implement manual ordering service

**Phase:** M2  
**Suggested Linear labels:** `phase:m2`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Support reorder operations for items and future list rows using stable sort_order updates.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `items, list_items`.

### Implementation method

Expected service or boundary: `OrderingService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M2-005: Implement manual ordering service.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M2-006 — Implement archive and trash semantics

**Phase:** M2  
**Suggested Linear labels:** `phase:m2`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Standardise archived_at/deleted_at behaviour and restore paths across containers/items.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `containers, items`.

### Implementation method

Expected service or boundary: `ArchiveService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M2-006: Implement archive and trash semantics.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M2-007 — Implement activity feed queries

**Phase:** M2  
**Suggested Linear labels:** `phase:m2`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Expose recent activity and target-specific activity for UI and dashboard use.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `activity_log`.

### Implementation method

Expected service or boundary: `ActivityLogService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M2-007: Implement activity feed queries.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M2-008 — Add object graph integration tests

**Phase:** M2  
**Suggested Linear labels:** `phase:m2`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Prove containers, items, relationships, activity, and ordering work together.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `core db tables`.

### Implementation method

Expected service or boundary: `integration tests`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M2-008: Add object graph integration tests.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

---

# M3 ticket group


## M3-001 — Implement project creation and project list

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create project containers and list active/favourite/archived projects.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `containers`.

### Implementation method

Expected service or boundary: `ProjectService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-001: Implement project creation and project list.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M3-002 — Implement project overview and content page

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Show project header, summary counts, and mixed content feed.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `containers, items, task_details`.

### Implementation method

Expected service or boundary: `ProjectService, UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-002: Implement project overview and content page.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M3-003 — Implement Inbox service and Inbox page

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

List system Inbox items and provide move-out operations.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `containers, items`.

### Implementation method

Expected service or boundary: `InboxService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-003: Implement Inbox service and Inbox page.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M3-004 — Implement task creation service

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create tasks as item + task_details rows with tags/category hooks.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `items, task_details`.

### Implementation method

Expected service or boundary: `TaskService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-004: Implement task creation service.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M3-005 — Implement task editing and completion

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Update task fields, complete/reopen tasks, and reflect completed_at.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `items, task_details`.

### Implementation method

Expected service or boundary: `TaskService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-005: Implement task editing and completion.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M3-006 — Implement task due-date queries

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Return due today, overdue, upcoming, and waiting tasks.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `task_details`.

### Implementation method

Expected service or boundary: `TaskQueryService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-006: Implement task due-date queries.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M3-007 — Implement checklist/list service

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create list items and list rows with check/uncheck support.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `items, list_details, list_items`.

### Implementation method

Expected service or boundary: `ListService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-007: Implement checklist/list service.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M3-008 — Implement list reordering and bulk paste

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Support manual ordering and multiline paste into list rows.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `list_items`.

### Implementation method

Expected service or boundary: `ListService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-008: Implement list reordering and bulk paste.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M3-009 — Implement Markdown note service

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create/edit/read Markdown notes, store preview, and index searchable body.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `items, note_details`.

### Implementation method

Expected service or boundary: `NoteService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-009: Implement Markdown note service.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M3-010 — Implement file item metadata service

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create file item metadata without full import UI yet; prepare attachment linkage.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `items, attachments`.

### Implementation method

Expected service or boundary: `FileAttachmentService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-010: Implement file item metadata service.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M3-011 — Implement link item service

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create/edit/open URL/bookmark items with domain extraction.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `items, links`.

### Implementation method

Expected service or boundary: `LinkService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-011: Implement link item service.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M3-012 — Add first vertical app slice

**Phase:** M3  
**Suggested Linear labels:** `phase:m3`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create workspace → create project → add task/note/list/link → persist after restart.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `many`.

### Implementation method

Expected service or boundary: `vertical integration`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M3-012: Add first vertical app slice.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

---

# M4 ticket group


## M4-001 — Implement inline tag parser

**Phase:** M4  
**Suggested Linear labels:** `phase:m4`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Extract @tags from task/note/item text with normalisation and tests.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `tags, taggings`.

### Implementation method

Expected service or boundary: `TagParser, TagService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M4-001: Implement inline tag parser.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M4-002 — Implement tag repository and service

**Phase:** M4  
**Suggested Linear labels:** `phase:m4`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Find/create tags, add/remove taggings, list by target and by tag.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `tags, taggings`.

### Implementation method

Expected service or boundary: `TagService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M4-002: Implement tag repository and service.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M4-003 — Implement tag browser foundation

**Phase:** M4  
**Suggested Linear labels:** `phase:m4`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

List tags with counts and show matching targets.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `tags, taggings`.

### Implementation method

Expected service or boundary: `Metadata UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M4-003: Implement tag browser foundation.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M4-004 — Implement category repository and service

**Phase:** M4  
**Suggested Linear labels:** `phase:m4`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create/edit/list categories and assign to containers/items.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `categories, containers, items`.

### Implementation method

Expected service or boundary: `CategoryService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M4-004: Implement category repository and service.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M4-005 — Implement category management UI

**Phase:** M4  
**Suggested Linear labels:** `phase:m4`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Settings UI for categories and colour tokens.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `categories`.

### Implementation method

Expected service or boundary: `Settings UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M4-005: Implement category management UI.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M4-006 — Implement FTS search index writes

**Phase:** M4  
**Suggested Linear labels:** `phase:m4`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Upsert containers/items/notes/files/links into search index.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `search_index`.

### Implementation method

Expected service or boundary: `SearchIndexService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M4-006: Implement FTS search index writes.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M4-007 — Implement global search page

**Phase:** M4  
**Suggested Linear labels:** `phase:m4`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Search across containers/items and open source records.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `search_index, source tables`.

### Implementation method

Expected service or boundary: `SearchService, UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M4-007: Implement global search page.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M4-008 — Implement search index rebuild and diagnostics

**Phase:** M4  
**Suggested Linear labels:** `phase:m4`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Add maintenance function to rebuild FTS and report stale records.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `search_index`.

### Implementation method

Expected service or boundary: `SearchIndexService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M4-008: Implement search index rebuild and diagnostics.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M4-009 — Implement saved view schema and evaluator

**Phase:** M4  
**Suggested Linear labels:** `phase:m4`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Validate and evaluate versioned query JSON for basic conditions.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `saved_views`.

### Implementation method

Expected service or boundary: `SavedViewService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M4-009: Implement saved view schema and evaluator.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M4-010 — Implement basic collection from tag/keyword

**Phase:** M4  
**Suggested Linear labels:** `phase:m4`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create saved collection views grouped by container.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `saved_views, tags, search_index`.

### Implementation method

Expected service or boundary: `CollectionService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M4-010: Implement basic collection from tag/keyword.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

---

# M5 ticket group


## M5-001 — Implement Today due and overdue view

**Phase:** M5  
**Suggested Linear labels:** `phase:m5`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Display due-today and overdue tasks with completion actions.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `task_details`.

### Implementation method

Expected service or boundary: `TodayService, UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M5-001: Implement Today due and overdue view.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M5-002 — Implement manual daily planning lanes

**Phase:** M5  
**Suggested Linear labels:** `phase:m5`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Add daily_plans and daily_plan_items UI for Today/Tomorrow planning.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `daily_plans`.

### Implementation method

Expected service or boundary: `TodayService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M5-002: Implement manual daily planning lanes.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M5-003 — Implement Today lane ordering and move actions

**Phase:** M5  
**Suggested Linear labels:** `phase:m5`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Drag/move tasks between Today, Tomorrow, and backlog lanes.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `daily_plan_items`.

### Implementation method

Expected service or boundary: `TodayService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M5-003: Implement Today lane ordering and move actions.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M5-004 — Implement default dashboard data service

**Phase:** M5  
**Suggested Linear labels:** `phase:m5`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Return Today, Overdue, Upcoming, Favourites, Recent Activity widgets.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `dashboards, widgets`.

### Implementation method

Expected service or boundary: `DashboardService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M5-004: Implement default dashboard data service.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M5-005 — Implement default dashboard UI

**Phase:** M5  
**Suggested Linear labels:** `phase:m5`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Render default dashboard widgets and navigate to source objects.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `dashboard_widgets`.

### Implementation method

Expected service or boundary: `Dashboard UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M5-005: Implement default dashboard UI.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M5-006 — Implement project health calculation

**Phase:** M5  
**Suggested Linear labels:** `phase:m5`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Calculate open/done/overdue/next due/recent activity for projects.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `task_details, activity_log`.

### Implementation method

Expected service or boundary: `ProjectHealthService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M5-006: Implement project health calculation.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M5-007 — Implement collections page

**Phase:** M5  
**Suggested Linear labels:** `phase:m5`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Render saved collections, grouped results, and inline task completion.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `saved_views`.

### Implementation method

Expected service or boundary: `Collections UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M5-007: Implement collections page.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M5-008 — Implement quick add foundation

**Phase:** M5  
**Suggested Linear labels:** `phase:m5`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Quick-add task/note/link into Inbox or current container.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `items, task_details, note_details, links`.

### Implementation method

Expected service or boundary: `QuickAddService/UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M5-008: Implement quick add foundation.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M5-009 — Add usability-view integration tests

**Phase:** M5  
**Suggested Linear labels:** `phase:m5`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Prove Today, Dashboard, Collections, and quick add use the same source objects.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `many`.

### Implementation method

Expected service or boundary: `integration/e2e`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M5-009: Add usability-view integration tests.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

---

# M6 ticket group


## M6-001 — Implement safe local file import

**Phase:** M6  
**Suggested Linear labels:** `phase:m6`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Copy selected files into workspace attachments and create attachment metadata.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `attachments`.

### Implementation method

Expected service or boundary: `FileAttachmentService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M6-001: Implement safe local file import.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M6-002 — Implement open and reveal attachment actions

**Phase:** M6  
**Suggested Linear labels:** `phase:m6`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Open/reveal files via Electron main process with safe path validation.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `attachments`.

### Implementation method

Expected service or boundary: `File IPC`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M6-002: Implement open and reveal attachment actions.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M6-003 — Implement missing-file and integrity checks

**Phase:** M6  
**Suggested Linear labels:** `phase:m6`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Detect missing/corrupt attachment files and show repair status.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `attachments`.

### Implementation method

Expected service or boundary: `FileIntegrityService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M6-003: Implement missing-file and integrity checks.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M6-004 — Implement manual backup service

**Phase:** M6  
**Suggested Linear labels:** `phase:m6`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Copy SQLite database and attachment manifest to backup folder.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `backups folder`.

### Implementation method

Expected service or boundary: `BackupService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M6-004: Implement manual backup service.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M6-005 — Implement full JSON export

**Phase:** M6  
**Suggested Linear labels:** `phase:m6`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Export containers/items/metadata/activity without search cache.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `all core tables`.

### Implementation method

Expected service or boundary: `ExportService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M6-005: Implement full JSON export.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M6-006 — Implement MVP smoke test suite

**Phase:** M6  
**Suggested Linear labels:** `phase:m6`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Playwright smoke: workspace, project, task, note, search, backup.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `app`.

### Implementation method

Expected service or boundary: `Playwright`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M6-006: Implement MVP smoke test suite.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M6-007 — Implement package build verification

**Phase:** M6  
**Suggested Linear labels:** `phase:m6`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

electron-builder config and smoke check for packaged app paths.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `desktop app`.

### Implementation method

Expected service or boundary: `Packaging`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M6-007: Implement package build verification.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M6-008 — MVP documentation and regression sync

**Phase:** M6  
**Suggested Linear labels:** `phase:m6`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Update docs to match implemented architecture and create regression checklist.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `docs`.

### Implementation method

Expected service or boundary: `Docs`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M6-008: MVP documentation and regression sync.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

---

# M7 ticket group


## M7-001 — Implement contact containers and contact list

**Phase:** M7  
**Suggested Linear labels:** `phase:m7`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create/list/open contact containers.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `containers`.

### Implementation method

Expected service or boundary: `ContactService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M7-001: Implement contact containers and contact list.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M7-002 — Implement flexible contact fields

**Phase:** M7  
**Suggested Linear labels:** `phase:m7`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Add arbitrary labelled fields for contacts.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `contact_fields or JSON/settings`.

### Implementation method

Expected service or boundary: `ContactFieldService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M7-002: Implement flexible contact fields.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M7-003 — Implement related projects and follow-ups for contacts

**Phase:** M7  
**Suggested Linear labels:** `phase:m7`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Show linked projects, tasks, notes, files, and activity by contact.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `relationships`.

### Implementation method

Expected service or boundary: `ContactOverview`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M7-003: Implement related projects and follow-ups for contacts.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M7-004 — Implement content tabs UI

**Phase:** M7  
**Suggested Linear labels:** `phase:m7`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create/rename/reorder/delete tabs inside projects/contacts.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `container_tabs`.

### Implementation method

Expected service or boundary: `TabService/UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M7-004: Implement content tabs UI.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M7-005 — Implement local reminders foundation

**Phase:** M7  
**Suggested Linear labels:** `phase:m7`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Schedule local reminders for due tasks through Electron notifications.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `reminder tables`.

### Implementation method

Expected service or boundary: `ReminderService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M7-005: Implement local reminders foundation.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M7-006 — Implement timeline view foundation

**Phase:** M7  
**Suggested Linear labels:** `phase:m7`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Show dated tasks grouped by container across week/month range.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `task_details`.

### Implementation method

Expected service or boundary: `TimelineService/UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M7-006: Implement timeline view foundation.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M7-007 — Implement calendar month view

**Phase:** M7  
**Suggested Linear labels:** `phase:m7`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Show local dated tasks in month calendar.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `task_details`.

### Implementation method

Expected service or boundary: `CalendarService/UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M7-007: Implement calendar month view.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M7-008 — Implement list/project templates foundation

**Phase:** M7  
**Suggested Linear labels:** `phase:m7`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create simple list/project templates with relative dates.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `templates`.

### Implementation method

Expected service or boundary: `TemplateService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M7-008: Implement list/project templates foundation.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

---

# M8 ticket group


## M8-001 — Implement recurring task foundation

**Phase:** M8  
**Suggested Linear labels:** `phase:m8`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Daily/weekly/custom weekday recurrence and next occurrence generation.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `recurrence_rules`.

### Implementation method

Expected service or boundary: `RecurrenceService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M8-001: Implement recurring task foundation.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M8-002 — Implement quick snooze and reschedule actions

**Phase:** M8  
**Suggested Linear labels:** `phase:m8`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Snooze to tomorrow/next week/custom date across task views.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `task_details`.

### Implementation method

Expected service or boundary: `TaskSchedulingService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M8-002: Implement quick snooze and reschedule actions.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M8-003 — Implement pipeline mode for lists

**Phase:** M8  
**Suggested Linear labels:** `phase:m8`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Toggle list into pipeline mode and move cards between stages.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `list_details, list_items`.

### Implementation method

Expected service or boundary: `PipelineService/UI`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M8-003: Implement pipeline mode for lists.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M8-004 — Implement attachment snapshots and file versions

**Phase:** M8  
**Suggested Linear labels:** `phase:m8`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Create attachment version snapshots and browse versions.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `attachment_versions`.

### Implementation method

Expected service or boundary: `FileVersionService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M8-004: Implement attachment snapshots and file versions.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M8-005 — Implement manual local workflows

**Phase:** M8  
**Suggested Linear labels:** `phase:m8`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Manual workflows with preview: add tag, set category, move item, create task/list.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `workflow tables`.

### Implementation method

Expected service or boundary: `WorkflowService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M8-005: Implement manual local workflows.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M8-006 — Implement local browser capture spike/prototype

**Phase:** M8  
**Suggested Linear labels:** `phase:m8`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Design native messaging/local capture path and create proof-of-concept if approved.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `links, inbox`.

### Implementation method

Expected service or boundary: `BrowserCapture`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M8-006: Implement local browser capture spike/prototype.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M8-007 — Implement import foundations

**Phase:** M8  
**Suggested Linear labels:** `phase:m8`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

CSV task import and Markdown/folder note import foundations.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `import_jobs optional`.

### Implementation method

Expected service or boundary: `ImportService`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M8-007: Implement import foundations.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.

## M8-008 — V2 architecture review and hardening

**Phase:** M8  
**Suggested Linear labels:** `phase:m8`, `kind:feature`, `area:auto-assign`, `agent:codex-ready`  
**Suggested estimate:** 2–3  
**Depends on:** prior scaffold/database foundation and adjacent lower-numbered tickets

### Goal

Review security, migrations, performance, and docs after advanced local features.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-linear-github-codex-operating-plan.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the domain/service/repository path for this feature.
- Keep the implementation local-only.
- Add or update UI only where required by the ticket title.
- Ensure activity log integration for user-visible writes.
- Ensure search-index integration where searchable content changes.

### Out of scope

- Cloud sync, hosted accounts, public sharing, mobile, team permissions.
- Unrelated module rewrites.
- Advanced versions of the feature not explicitly listed in this ticket.

### Data model impact

Primary tables/objects: `all`.

### Implementation method

Expected service or boundary: `Review/Docs`.

Implementation should follow:

```text
validate input
→ use repository/service layer
→ wrap writes in transaction where practical
→ log activity event
→ update search index if searchable content changed
→ return typed result
```

### Expected files or areas

- `packages/features/`
- `packages/db/repositories/`
- `packages/core/entities/`
- `apps/desktop/src/renderer/` if UI is included
- tests under the relevant package

### Acceptance criteria

- The feature works through the service layer.
- Data persists after restart where relevant.
- Archived/deleted records are excluded from active views by default.
- Activity log events are created for user-visible writes.
- Search index is updated for searchable objects.
- The PR stays inside the ticket scope.

### Test requirements

- Unit tests for pure logic.
- Repository tests for database operations.
- Service integration tests for write flow + activity log + search hooks.
- UI/component or Playwright tests where a user-facing screen/action is included.

### Codex prompt

```text
@Codex implement M8-008: V2 architecture review and hardening.
Read AGENTS.md and the strategic references first. Produce a short plan before coding. Keep the PR scoped to this issue. Do not add cloud, mobile, team, or public-sharing functionality. Add tests and update docs if behaviour or architecture changes.
```

### Done when

- Acceptance criteria pass.
- Required tests pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- PR uses the repository template.
- Linear issue is updated with summary and follow-up tickets if needed.
