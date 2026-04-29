---
title: Local Work OS Reference Document
created: 2026-04-29
scope: local-only desktop productivity app
status: generated aggregate reference for Codex / Linear setup
---


# Local Work OS — M9–M14 Full-Scope Pagico-Style Parity Expansion Ticket Pack

This file extends the MVP/V1/V2 ticket packs into a full-scope local-only parity roadmap for the broad feature surface associated with Pagico-style productivity systems.

These tickets should generally **not** be imported into active Linear work until the M0–M8 foundation is stable. They are included so Codex, Linear, and GitHub references can resolve and so the long-term scope is explicit.

## Local-only interpretation

Where the reference product has cloud, team, mobile, or public sharing features, this plan either excludes them or maps them to a local equivalent:

| Cloud/mobile/team feature class | Local-only equivalent |
|---|---|
| Cloud sync | Backups, export/import, integrity tools |
| Public sharing | Print/export bundles |
| Team assignment | Local status/category/tag workflows |
| Team comments | Local comments/annotations |
| Mobile capture | Browser/local import/capture where feasible |
| Hosted email-to-task | Local EML/Maildir import, optional IMAP spike |

## Import recommendation

Keep these as backlog/reference. Import in small waves after MVP:

1. M9 for UX/navigation power.
2. M10 for project/contact depth.
3. M11 for advanced item behaviours.
4. M12 for planning/search/dashboard depth.
5. M13 for local automation/import/export.
6. M14 for security, performance, release readiness.


---

# M9 ticket group


## M9-001 — Implement command palette foundation

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Global keyboard command palette for navigation and actions.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-001: Implement command palette foundation. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-002 — Implement keyboard shortcut registry

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Central shortcut registry with settings visibility and conflict detection.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-002: Implement keyboard shortcut registry. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-003 — Implement context menus

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Right-click/context menus for containers, items, tags, categories, and saved views.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-003: Implement context menus. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-004 — Implement pinned items and favourites expansion

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Pin containers/items/saved views and expose them in sidebar/dashboard.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-004: Implement pinned items and favourites expansion. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-005 — Implement app navigation history

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Back/forward history across project/contact/item/search/result routes.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-005: Implement app navigation history. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-006 — Implement open recent and jump-to switcher

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Fast switcher for recent containers/items and saved views.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-006: Implement open recent and jump-to switcher. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-007 — Implement multi-tab app navigation

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Optional in-app tabs for multiple open project/contact/search pages.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-007: Implement multi-tab app navigation. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-008 — Implement item inspector panel

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Right-side inspector for dates, tags, category, relationships, activity, attachments.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-008: Implement item inspector panel. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-009 — Implement bulk selection and bulk actions

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Bulk tag/category/move/archive/delete/complete for item lists.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-009: Implement bulk selection and bulk actions. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-010 — Implement drag-and-drop across containers/views

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Move/reorder items by drag/drop with safe validations.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-010: Implement drag-and-drop across containers/views. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-011 — Implement undo foundation

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Undo recent local operations using activity before/after snapshots where safe.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-011: Implement undo foundation. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-012 — Implement trash and restore UI

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Trash view for soft-deleted containers/items and restore/delete controls.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-012: Implement trash and restore UI. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-013 — Implement print/export current view

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Print or export visible project/contact/collection/dashboard view to PDF/HTML/Markdown.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-013: Implement print/export current view. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-014 — Implement density/theme preferences

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Compact/cozy layouts, theme preferences, and font-size settings.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-014: Implement density/theme preferences. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-015 — Implement empty/loading/error-state standards

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Consistent user-facing empty, loading, error, and repair states.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-015: Implement empty/loading/error-state standards. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-016 — Implement accessibility audit fixes

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Keyboard focus, labels, landmarks, contrast, and screen-reader basics.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-016: Implement accessibility audit fixes. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-017 — Implement onboarding checklist

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

First-run local-only onboarding that explains workspace, Inbox, projects, quick add.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-017: Implement onboarding checklist. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M9-018 — Implement UI telemetry-free diagnostics panel

**Phase:** M9  
**Suggested labels:** `phase:m9`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local-only diagnostics page for health, version, paths, tests, and logs.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M9-018: Implement UI telemetry-free diagnostics panel. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

---

# M10 ticket group


## M10-001 — Implement rich project summary view

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Project summary cards by tasks, notes, files, activity, tags, categories, and dates.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-001: Implement rich project summary view. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-002 — Implement project banner and visual identity

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Project banner/image/colour without copying reference product visuals.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-002: Implement project banner and visual identity. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-003 — Implement project hierarchy and subproject relationships

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Parent/child project relationship and project dependency browsing.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-003: Implement project hierarchy and subproject relationships. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-004 — Implement project archive/restore workflow

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Archive completed projects and restore with all content intact.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-004: Implement project archive/restore workflow. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-005 — Implement project clone/duplicate

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Duplicate project structure with optional tasks/notes/files/templates.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-005: Implement project clone/duplicate. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-006 — Implement project kanban/status board

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Kanban-style project task grouping by status/category/custom fields.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-006: Implement project kanban/status board. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-007 — Implement advanced contact profile UI

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Photos, flexible fields, profile notes, favourites, category, tags.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-007: Implement advanced contact profile UI. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-008 — Implement contact label browser

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Browse contacts by custom labels/field names and category/tag.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-008: Implement contact label browser. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-009 — Implement contact interaction timeline

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Timeline of notes, completed tasks, files, links, and activity for contact.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-009: Implement contact interaction timeline. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-010 — Implement contact import from CSV/vCard

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local import of contacts with field mapping.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-010: Implement contact import from CSV/vCard. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-011 — Implement advanced content tab summaries

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Tab summary cards with previews/counts per tab.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-011: Implement advanced content tab summaries. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-012 — Implement tab templates

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Create tabs from saved local templates.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-012: Implement tab templates. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-013 — Implement hidden/private local tabs

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local hidden tabs requiring explicit reveal; no cloud privacy claims.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-013: Implement hidden/private local tabs. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-014 — Implement backlinks panel

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Show incoming and outgoing relationships for containers/items.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-014: Implement backlinks panel. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-015 — Implement relationship graph view

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local graph of related projects, contacts, tasks, notes, files.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-015: Implement relationship graph view. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-016 — Implement wikilinks/internal links

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Allow note/task text to link to containers/items via [[name]] style links.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-016: Implement wikilinks/internal links. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-017 — Implement auto-grouped container feeds

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Group project/contact content by type/date/category/tag with saved preference.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-017: Implement auto-grouped container feeds. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M10-018 — Implement container-level custom fields

**Phase:** M10  
**Suggested labels:** `phase:m10`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local custom fields for projects and contacts for advanced organisation.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M10-018: Implement container-level custom fields. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

---

# M11 ticket group


## M11-001 — Implement robust natural-language date parser

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Support today/tomorrow/next weekday/+Nd/time ranges with tests.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-001: Implement robust natural-language date parser. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-002 — Implement quick snooze menu everywhere

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Snooze/reschedule actions in task cards, Today, dashboard, search.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-002: Implement quick snooze menu everywhere. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-003 — Implement deferred and someday task states

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local defer/someday states and filters without cloud dependency.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-003: Implement deferred and someday task states. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-004 — Implement waiting/blocked task workflow

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Waiting/blocked status, blocker relationships, and dashboard widgets.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-004: Implement waiting/blocked task workflow. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-005 — Implement recurring task UI

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

UI for daily/weekly/custom weekday recurrence and next occurrence preview.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-005: Implement recurring task UI. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-006 — Implement reminder preferences and defaults

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Default reminder policy and per-task overrides.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-006: Implement reminder preferences and defaults. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-007 — Implement keyboard-first list editing

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Enter/new row, tab/shift-tab indent, arrows, reorder keyboard support.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-007: Implement keyboard-first list editing. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-008 — Implement task-to-list conversion

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Convert task into list and list item into task with data preservation.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-008: Implement task-to-list conversion. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-009 — Implement list item dates and Today integration

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

List rows with due/start dates appear in Today/search/calendar as task-like objects.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-009: Implement list item dates and Today integration. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-010 — Implement Markdown editor improvements

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Toolbar, preview, shortcuts, link insertion, tag autocomplete.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-010: Implement Markdown editor improvements. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-011 — Implement note autosave and conflict guard

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Autosave notes locally with dirty-state and recovery.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-011: Implement note autosave and conflict guard. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-012 — Implement comments and annotations

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local comments attached to items with search/activity integration.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-012: Implement comments and annotations. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-013 — Implement attachment preview cards

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Preview common image/PDF/text metadata safely without loading unsafe content.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-013: Implement attachment preview cards. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-014 — Implement attachment version browser

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Browse/open/restore file snapshots.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-014: Implement attachment version browser. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-015 — Implement attachment integrity audit

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Scan attachments for missing/corrupt files and offer repair/export report.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-015: Implement attachment integrity audit. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-016 — Implement location objects

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Store address/lat/lng/text locations and open externally in maps app/browser.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-016: Implement location objects. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-017 — Implement link metadata fetching with privacy controls

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Optional fetch title/description/favicon with clear network permission setting.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-017: Implement link metadata fetching with privacy controls. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-018 — Implement web widget safety spike

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Investigate sandboxed embedded web widgets and decide whether to build or exclude.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-018: Implement web widget safety spike. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-019 — Implement local email object model

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Represent imported EML/Maildir messages as local items with attachments.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-019: Implement local email object model. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M11-020 — Implement item conversion framework

**Phase:** M11  
**Suggested labels:** `phase:m11`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Generic conversion between supported object types with explicit rules.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M11-020: Implement item conversion framework. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

---

# M12 ticket group


## M12-001 — Implement unified view switcher

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Switch list/timeline/calendar modes for compatible saved views/containers.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-001: Implement unified view switcher. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-002 — Implement advanced timeline ranges

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Week/month/quarter timeline with grouping and filters.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-002: Implement advanced timeline ranges. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-003 — Implement timeline drag rescheduling

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Drag tasks/date ranges to reschedule with activity log.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-003: Implement timeline drag rescheduling. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-004 — Implement calendar week view

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Week view from local dated tasks and list items.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-004: Implement calendar week view. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-005 — Implement calendar day view

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Day view with time slots, all-day tasks, and quick add.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-005: Implement calendar day view. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-006 — Implement calendar drag and drop

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Drag tasks across dates/times with validation.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-006: Implement calendar drag and drop. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-007 — Implement ICS import

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local .ics import into read-only or imported calendar items.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-007: Implement ICS import. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-008 — Implement Rapid Day Planner keyboard mode

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Keyboard-first daily/nightly planning with Today/Tomorrow/Backlog lanes.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-008: Implement Rapid Day Planner keyboard mode. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-009 — Implement planning modes

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Ivy Lee/top-six, focus list, backlog review, and daily shutdown modes.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-009: Implement planning modes. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-010 — Implement dashboard layout editor

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Add/reorder/resize dashboard widgets and persist layout.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-010: Implement dashboard layout editor. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-011 — Implement dashboard saved-view widgets

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Any collection/smart list can be embedded as widget.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-011: Implement dashboard saved-view widgets. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-012 — Implement project health dashboard widgets

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Aggregated project health with drill-down.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-012: Implement project health dashboard widgets. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-013 — Implement visual smart-list builder

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

UI builder for saved view query JSON.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-013: Implement visual smart-list builder. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-014 — Implement structured search syntax

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Search operators for type/tag/category/status/date/container.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-014: Implement structured search syntax. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-015 — Implement advanced metadata browser

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Multi-tag/category filtering with result grouping and save-as-view.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-015: Implement advanced metadata browser. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-016 — Implement collection inline creation

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Create tasks/notes from inside collection with auto-applied filters.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-016: Implement collection inline creation. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-017 — Implement search ranking and snippets

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Better FTS ranking, excerpts, highlighting, and recent weighting.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-017: Implement search ranking and snippets. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M12-018 — Implement saved-view diagnostics

**Phase:** M12  
**Suggested labels:** `phase:m12`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Explain why a saved view returns results and validate broken queries.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M12-018: Implement saved-view diagnostics. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

---

# M13 ticket group


## M13-001 — Implement workflow definition registry

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local workflow definitions with enabled/disabled state and validation.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-001: Implement workflow definition registry. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-002 — Implement workflow manual trigger UI

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Run workflow manually against selected objects with preview.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-002: Implement workflow manual trigger UI. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-003 — Implement workflow item-created trigger

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local trigger when item is created, with recursion guard.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-003: Implement workflow item-created trigger. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-004 — Implement workflow file-import trigger

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Trigger when file is imported to tag/move/categorise.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-004: Implement workflow file-import trigger. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-005 — Implement workflow variables

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Variables such as {{Title}}, {{Container}}, {{Today}}, and user prompts.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-005: Implement workflow variables. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-006 — Implement workflow date manipulation

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Workflow actions can set dates relative to today or source item dates.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-006: Implement workflow date manipulation. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-007 — Implement workflow template actions

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Create tasks/lists/projects/tabs from templates via workflow.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-007: Implement workflow template actions. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-008 — Implement workflow history and rollback

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Log workflow runs and rollback where before/after snapshots allow.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-008: Implement workflow history and rollback. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-009 — Implement template library UI

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Manage project/contact/list/note/tab templates locally.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-009: Implement template library UI. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-010 — Implement template import/export

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Portable local template files with validation.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-010: Implement template import/export. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-011 — Implement browser capture extension bridge

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local native messaging/localhost bridge to capture page into Inbox.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-011: Implement browser capture extension bridge. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-012 — Implement local EML/Maildir import

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Import email files/folders into local email/link/note items.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-012: Implement local EML/Maildir import. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-013 — Implement optional IMAP import spike

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Investigate strictly local IMAP import without hosted service.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-013: Implement optional IMAP import spike. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-014 — Implement advanced CSV import mapping

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Map CSV columns to tasks/contacts/projects/categories/tags.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-014: Implement advanced CSV import mapping. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-015 — Implement advanced export bundles

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Export project/contact bundle with Markdown, JSON, and attachment manifest.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-015: Implement advanced export bundles. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M13-016 — Implement backup scheduler and retention

**Phase:** M13  
**Suggested labels:** `phase:m13`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local scheduled backup and retention policy.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M13-016: Implement backup scheduler and retention. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

---

# M14 ticket group


## M14-001 — Electron security audit

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Review preload, IPC, filesystem boundaries, CSP, webview restrictions.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-001: Electron security audit. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-002 — Optional workspace encryption spike

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Investigate local encryption tradeoffs and key management.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-002: Optional workspace encryption spike. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-003 — Privacy and network controls

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Central preference to disable/allow optional metadata fetching and network actions.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-003: Privacy and network controls. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-004 — Large workspace performance benchmark

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Benchmark 250k items, 500k list rows, 100k attachments metadata.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-004: Large workspace performance benchmark. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-005 — Database corruption recovery plan

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Detect corruption, backup/restore guidance, and safe recovery UI.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-005: Database corruption recovery plan. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-006 — Attachment manifest audit and repair

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Verify attachment manifest against filesystem and repair/report mismatches.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-006: Attachment manifest audit and repair. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-007 — Migration test matrix

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Test migrations across representative old workspace snapshots.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-007: Migration test matrix. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-008 — Release packaging hardening

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

macOS/Windows/Linux packaging checks and installer smoke tests.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-008: Release packaging hardening. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-009 — In-app help and local documentation

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Local help pages for workspace, tasks, tags, search, backups.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-009: In-app help and local documentation. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-010 — Demo workspace generator

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Generate local demo workspace for QA and screenshots.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-010: Demo workspace generator. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-011 — Internationalisation scaffold

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

i18n file structure and date/locale formatting readiness.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-011: Internationalisation scaffold. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-012 — Regression coverage map

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Map major features to tests and QA scripts.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-012: Regression coverage map. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-013 — Full parity QA pass

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Run full feature coverage matrix and log gaps.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-013: Full parity QA pass. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```

## M14-014 — Final documentation sync and release readiness

**Phase:** M14  
**Suggested labels:** `phase:m14`, `kind:feature`, `agent:needs-plan`, `full-scope-parity`  
**Suggested estimate:** 2–5 depending on implementation split  

### Goal

Sync specs, tickets, README, runbooks, and release checklist.

### Strategic references

- `local-work-os-full-build-specification.md`
- `local-work-os-m2-m8-core-feature-module-specifications.md`
- `local-work-os-full-scope-pagico-parity-coverage-matrix.md`
- `local-work-os-master-ticket-inventory-m0-m14.md`

### Scope

- Implement the local-only equivalent of the feature.
- Use existing container/item/metadata/activity/search/saved-view architecture.
- Add tests for service logic and critical UI flows.
- Update docs if the feature changes architecture, data model, or user workflow.

### Out of scope

- Cloud sync, public sharing, mobile apps, team permissions, hosted accounts.
- Copying proprietary UI, wording, icons, branding, screenshots, or assets.
- Broad rewrites outside the target feature.

### Implementation guardrails

- Use repository/service layers.
- Keep Electron filesystem operations behind main/preload IPC.
- Create activity log entries for writes.
- Update search index for searchable data.
- Prefer local, transparent, reversible behaviours.

### Acceptance criteria

- User-facing behaviour works in the app.
- Data persists after restart.
- Feature respects local-only constraints.
- Tests cover the core path and edge cases.
- PR summary explains what was implemented and what remains out of scope.

### Codex prompt

```text
@Codex plan and implement M14-014: Final documentation sync and release readiness. Read AGENTS.md, the full build specification, and the full-scope coverage matrix. Produce a plan before coding. Split the issue if the implementation is too large for one PR. Keep the build local-only and do not add cloud/mobile/team features.
```
