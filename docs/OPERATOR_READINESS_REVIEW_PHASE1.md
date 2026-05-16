# Operator Readiness Review - Phase 1 Discovery

Date: 2026-05-15
Scope: Read-only discovery against repository docs, source layout, and automated-test inventory. No functional app smoke, backup/restore exercise, package run, or network audit was executed in this phase.

## Initial verdict

**Pilot ready, not operator ready.** Existing docs and code structure show a broad local-only MVP/V1 foundation with substantial unit/integration/component coverage. However, the repository itself already records the blocking gap: there is not yet complete fresh-workspace operator journey evidence, backup/restore has not been proven end-to-end as an operator recovery path, and a nontechnical operator runbook is not present.

Confidence: **medium** for discovery/static claims; **low** for actual operator usability until Phases 3-4 exercise the real app on a fresh workspace.

## Evidence inspected

- `docs/README.md`, `docs/PRODUCT_SPEC.md`, `docs/MODULE_REGISTRY.md`, `docs/TEST_COVERAGE_MAP.md`, `docs/COVERAGE_MATRIX.md`, `docs/OPERATOR_HANDOFF_PLAN.md`
- Package/app layout under `apps/desktop/src` and `packages/*/src`
- Test inventory under `packages/core/tests`, `packages/db/tests`, `packages/features/tests`, `packages/ui/tests`, and `apps/desktop/tests`
- Static checks for renderer SQLite/filesystem access and Electron hardening markers

## Product truth map

| Feature | Expected behavior | Implementation evidence | Test evidence | Result | Operator-facing issue / mismatch |
|---|---|---|---|---|---|
| Projects | Local project containers with mixed content, status/health, archive/restore | `packages/features/src/projects`, `containers`, renderer project pages | Unit/integration/component + MVP smoke | Present | Needs full fresh-workspace journey evidence |
| Contacts | Local contact containers, flexible fields, relationships, timeline | `contacts` services/repos/UI | Unit/integration/component; smoke planned | Partial-present | Contact E2E smoke missing; deeper CRM future |
| Inbox | Capture and triage tasks/notes/links locally | `inbox`, `capture`, Quick Add | Unit/component + MVP smoke | Present | Keyboard/operator triage regression still follow-up |
| Tasks | Create/edit/complete/dates/recurrence/reminders | `tasks`, `recurrence`, `reminders` | Broad automated coverage | Present | Date/reminder matrix and OS notification manual QA still needed |
| Lists | Checklists, rows, conversion, pipeline mode | `lists`, `pipelines` | Unit/component; smoke planned | Present/partial | Operator reorder/conversion smoke still needed |
| Notes | Markdown notes, autosave, wikilinks/search | `notes`, `wikilinks`, Markdown UI | Unit/component; smoke planned | Present/partial | Crash/reopen/autosave journey not proven here |
| Files | Local attachments, previews, versions, integrity audit | `files`, attachment repos, safe FS IPC | Unit/integration/component; smoke planned | Present/partial | Attach/open/reveal/backup audit needs real workspace proof |
| Links | URL items, parsing, safe external open, optional local capture | `links`, `capture`, safe opener | Unit/integration/component; smoke planned | Present/partial | Capture remains future/opt-in; invalid payload smoke needed |
| Tags | Inline/local metadata and browser | `metadata`, `tags` | Unit/integration/component; smoke planned | Present | Activity/search consistency needs reconciliation proof |
| Categories | Local classification and browser | `metadata`, `categories` | Unit/integration/component; smoke planned | Present | Same metadata reconciliation risk |
| Relationships | Cross-object links/backlinks/graphs | `relationships` services/repos/UI panels | Unit/integration coverage | Present/partial | Operator relation journey not yet evidenced end-to-end |
| Search | Local FTS, structured tokens, diagnostics/rebuild | `search`, DB search index services | Unit/integration/component; smoke planned | Present/partial | Relevance/rebuild fixture smoke still needed |
| Saved views | Smart views/collections/query evaluation | `savedViews`, `collections` | Unit/integration/component; smoke planned | Present/partial | Advanced builder UX future; E2E missing |
| Collections | Local saved tag/keyword grouped views | `collectionService`, collections page | Unit/component; smoke planned | Present/partial | Operator creation/reopen evidence missing |
| Dashboards | Default widgets, health/activity/task projections | `dashboard`, UI widgets | Unit/integration/component + shell smoke | Present/partial | Custom dashboard editing future; restart evidence missing |
| Today planning | Today/Tomorrow lanes and planning | `today`, daily plan repo/UI | Unit/integration/component + MVP smoke | Present/partial | Rollover/restart operator smoke needed |
| Timeline/calendar | Local dated projections/calendar/feed foundations | `timeline`, `calendar` | Unit/component; smoke planned | Partial | Advanced drag/drop/external live sync explicitly future |
| Templates | Local list/container/template file foundations | `templates` services/UI | Unit/integration/component; smoke planned | Present/partial | Portable/broader templates future; import/export smoke needed |
| Workflows | Local manual/event workflow service/actions/run history | `workflows` services/repos/UI | Unit/integration/component; smoke planned | Partial | Scheduling future; safe-action operator docs needed |
| Backup/export/import | Local backup/export/import/restore foundations | `backup`, `export`, `import`, handlers | Unit/integration/main handler; smoke planned | Partial | End-to-end recovery path is a stated blocker |
| Local maintenance tools | Health, integrity, migration, search/attachment audits | `maintenance`, `diagnostics`, DB health | Unit/integration/component; smoke planned | Present/partial | Failure/recovery instructions incomplete |

## Static architecture/safety discovery

- Renderer static grep did **not** find direct `better-sqlite3`, Drizzle, Node `fs`, `ipcRenderer`, or `shell.openExternal` usage beyond user-facing strings.
- Main window hardening is present: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, webview attach denied, navigation/window-open routed through validated opener logic.
- Preload exposes a typed `localWorkOs` API via `contextBridge` and uses `webUtils.getPathForFile` only for filtered local drag/drop paths.
- Main process has broad per-feature IPC registration and safe filesystem services, consistent with the intended boundary.
- This is not yet a full architecture/security verdict: Phase 2 should inspect handler input validation, service write flows, activity/search updates, dependency direction, and no-network guarantees in detail.

## Test inventory snapshot

- Core/domain tests: 21
- DB/migration/repository tests: 45
- Feature service tests: 90
- UI component tests: 23
- Desktop main/preload/renderer/security/smoke tests: 40
- Existing docs classify many release-critical smoke/E2E checks as planned or manual, especially contacts, lists, notes, files, links, metadata, search, saved views, timeline/calendar, templates/workflows, import/export/backup, privacy/maintenance.

## Top blockers before operator-ready

- P0: No complete fresh-workspace operator journey through the real app has been captured.
- P0: Backup/restore has not been proven as a nontechnical recovery path with attachments.
- P1: No dedicated `docs/OPERATOR_RUNBOOK.md` exists for nontechnical handoff.
- P1: Failure-mode matrix exists as a proposal/plan, not as evidence-backed recovery behavior.
- P1: Local-only/no-unexpected-network evidence and dependency/license audit are not complete.
- P1: Activity/search/data-integrity reconciliation across write flows still needs an evidence pass.

## Recommended next phases

1. Phase 2 static architecture/security review: inspect IPC validators, repository/service boundaries, data-changing write flows, search-index updates, activity logging, dependency direction, and network-capable dependencies.
2. Phase 3 functional smoke: run the app on a disposable fresh workspace and capture evidence for create/open, mixed content, relationships, search, saved views, Today, dashboard/calendar/timeline, backup, restore, and restart persistence.
3. Phase 4 failure-mode review: exercise bad paths, missing files, malformed imports/URLs, large inputs, DB lock/corrupt cases, search out-of-sync, and failed restore with operator-readable recovery evidence.
