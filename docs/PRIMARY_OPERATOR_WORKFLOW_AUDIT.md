# Primary Operator Workflow Audit

Linked issue: PSE-213 — PSE-HUX-001: Primary operator workflow audit and visual baseline
Audit date: 2026-05-16
Scope: documentation and visual audit only; no product code was changed.

## Evaluation standard

This audit uses the `docs/PRODUCT_SPEC.md` Local Work OS loop as the product standard:

```text
Capture quickly
  -> organise by project/contact/inbox
  -> connect related things
  -> plan the day
  -> review timelines/dashboards
  -> find anything instantly
  -> keep files and notes beside the work they belong to
  -> recover local data safely
```

A screen does **not** pass because a route, button, API, repository, or service exists. It passes only to the extent that a human primary operator can see what matters, understand the next safe action, and trust the visible result without developer interpretation.

## Evidence basis

Primary evidence is actual packaged-app screenshot/manual QA evidence already captured in the repo:

- `docs/manual-qa/PSE-206-packaged-operator-journey.md`
- `docs/manual-qa/PSE-207-packaged-backup-restore.md`
- `docs/manual-qa/PSE-209-packaged-ui-performance.md`
- `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/`
- `docs/manual-qa/screenshots/PSE-207-2026-05-16T01-24-38-683Z/`
- `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/`

Context evidence read for the audit:

- `AGENTS.md`
- `docs/README.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/TESTING.md`
- `docs/SECURITY.md`
- `docs/OPERATING_PLAN.md`
- `docs/MODULE_REGISTRY.md`
- `docs/PRIMARY_OPERATOR_FIT_REVIEW.md`
- `docs/PRIMARY_OPERATOR_UX_TICKET_PACK.md`
- `docs/PRIMARY_OPERATOR_UX_TICKET_AMENDMENTS.md`
- `docs/OPERATOR_READINESS_REPORT.md`
- `docs/OPERATOR_RUNBOOK.md`

Linear PSE-213 comments were empty when checked. The shared PSE-HUX amendment requirement was therefore recovered from `docs/PRIMARY_OPERATOR_UX_TICKET_AMENDMENTS.md`: the complete sequence is PSE-213 -> PSE-214 -> PSE-215 -> PSE-216 -> PSE-218 -> PSE-217 -> PSE-219 -> PSE-220, and every ticket requires screenshot/manual operator evidence.

## Scoring rubric

Scores are 1-5:

- 1 = blocks or strongly undermines human operator confidence.
- 2 = workflow exists but needs explanation, scrolling, or developer interpretation.
- 3 = usable for a motivated/internal operator with caveats.
- 4 = clear and comfortable for normal primary work.
- 5 = excellent; the screen teaches the workflow and confirms results.

Columns:

- Goal = primary operator goal clarity.
- Hierarchy = visual hierarchy.
- Read = readability / sizing.
- Safe = safe next action.
- Work = work-first vs admin-first balance.
- Confirm = visible confirmation after action.
- Advanced = advanced-tool containment.

## Screen score summary

| Screen | Goal | Hierarchy | Read | Safe | Work | Confirm | Advanced | Overall risk |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Welcome / workspace open | 4 | 3 | 3 | 4 | 3 | 3 | 3 | P2 |
| Project detail | 3 | 2 | 2 | 2 | 2 | 2 | 1 | P1 |
| Contact detail | 2 | 1 | 2 | 2 | 2 | 1 | 2 | P1 |
| Today | 4 | 3 | 3 | 3 | 4 | 3 | 3 | P2 |
| Dashboard | 4 | 3 | 3 | 3 | 4 | 3 | 3 | P2 |
| Search | 3 | 2 | 2 | 2 | 3 | 1 | 3 | P1 |
| Settings overview | 3 | 1 | 2 | 2 | 1 | 3 | 1 | P1 |
| Backup / restore area | 3 | 2 | 2 | 2 | 2 | 3 | 1 | P1 |

No P0 data-loss or impossible-core-work issue was identified from this screenshot audit. The baseline does identify multiple P1 primary-work-loop blockers that should prevent a primary-operator-ready verdict until fixed or explicitly accepted.

## Visual evidence checklist

| Surface | Screenshot evidence |
| --- | --- |
| Welcome / workspace open | `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/01-welcome.png`; `02-workspace-created.png`; `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/00-startup-welcome.png` |
| Project detail | `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/06-project-content-created.png`; `17-persistence-project.png`; `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-project-feed.png`; `01-1000-project-feed-after-scroll.png` |
| Contact detail | `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/03-contact-created.png`; `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-contact-detail.png` |
| Today | `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/12-today-planning.png`; `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-today.png` |
| Dashboard | `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/13-dashboard.png`; `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-dashboard.png` |
| Search | `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/10-search-results-saved.png`; `18-persistence-search.png`; `docs/manual-qa/screenshots/PSE-207-2026-05-16T01-24-38-683Z/14-backup-restore-search.png`; `24-backup-restore-after-restart-search.png`; `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-search-fixture.png` |
| Settings overview | `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/05-category-created-settings.png`; `docs/manual-qa/screenshots/PSE-207-2026-05-16T01-24-38-683Z/09-backup-created.png`; `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-backup-created.png` |
| Backup / restore | `docs/manual-qa/screenshots/PSE-207-2026-05-16T01-24-38-683Z/11-invalid-restore-target-error.png`; `12-backup-restored.png`; `13-backup-restore-project.png`; `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-backup-created.png` |

## Screen findings

### 1. Welcome / workspace open

**Primary operator goal:** open the right local workspace, create a workspace if needed, and know Pseudico is local-only.

**What the current UI makes easy:**

- The welcome screen clearly presents workspace name/path entry and recent workspaces.
- The local-only promise is visible.
- Successful workspace open lands on a home/workspace page with a Quick Start checklist and navigation.

**What the current UI makes harder than it should:**

- Long recent-workspace lists from QA-style runs can become noisy; the operator has to visually filter stale workspaces.
- The welcome screen still feels partly like workspace administration rather than an invitation back into active work.
- The workspace home is useful, but its main job is ambiguous: continue current work, onboard, or manage workspace state.

**What should be fixed first:**

- Keep this as a P2 backlog item unless later PSE-HUX work creates a clearer home/continue-work pattern. A future improvement should curate recent workspaces and make the most likely safe next action visually dominant.

**Evidence:**

- `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/01-welcome.png`
- `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/02-workspace-created.png`
- `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/00-startup-welcome.png`

### 2. Project detail

**Primary operator goal:** see what the project is, what needs attention, and the notes/tasks/files/links that belong beside that project.

**What the current UI makes easy:**

- Project status, category, tags, activity, tab preview, content feed, task controls, note/link/list/file content, and project health are all visible somewhere on the page.
- The project page proves the app can keep tasks, notes, links, lists, and files beside a project.
- The content feed has direct creation controls for task, list, note, link, location, and file attachment.

**What the current UI makes harder than it should:**

- The first viewport is dominated by banner, set-banner, print/PDF, markdown export, display settings, metadata, relationship forms, recent activity, tab management, and tab previews before the operator reaches the main work feed.
- The safe next work action is not visually dominant; `Quick Start (Task)` and feed creation controls appear only after substantial chrome.
- Relationship state is not confidence-building: the visual controls exist, but prior PSE-206 evidence recorded a relationship confirmation caveat.
- Cards repeat many controls and metadata rows, making daily scanning slower.

**What should be fixed first:**

- PSE-216 should make the first viewport work-first: title/status/next task/recent activity/linked contacts plus a clear add-work action; print/export/display/banner/tab management should move behind secondary disclosure.
- PSE-215 should improve card/input scanability and hit targets.
- PSE-219 should ensure route feedback and toasts do not obscure project work.

**Evidence:**

- `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/06-project-content-created.png`
- `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/17-persistence-project.png`
- `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-project-feed.png`
- `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-project-feed-after-scroll.png`

### 3. Contact detail

**Primary operator goal:** see a person/client, their related projects and work, and use the contact as a living work container.

**What the current UI makes easy:**

- Contacts are represented in navigation and recent tabs.
- Contact creation passed in the PSE-206 manual journey, and contact screens are part of the shell model.

**What the current UI makes harder than it should:**

- The screenshot evidence is visually contradictory for operator trust: `03-contact-created.png` and PSE-209 contact detail evidence show a `Contact not found` state while a contact tab/recent item is visible.
- The visible error message is understandable, but from a primary-operator perspective it undermines confidence that contact pages can act as reliable work containers.
- There is no strong visual evidence in this baseline of a contact detail page with related notes/tasks/files/links visible beside the contact.

**What should be fixed first:**

- Treat contact detail as a P1 visual-confidence gap for the HUX pass. PSE-216 should include shared project/contact container patterns where feasible, or PSE-220 should require a focused follow-up if contact parity remains outside PSE-216 scope.
- PSE-219 should verify navigation/recent-tab state cannot route the operator into a stale `not found` page without a clear recovery path.

**Evidence:**

- `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/03-contact-created.png`
- `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-contact-detail.png`

### 4. Today

**Primary operator goal:** decide what to do today, capture/adjust a small set of daily tasks, and recover overdue/backlog work without being overwhelmed.

**What the current UI makes easy:**

- Today has a clear planner, summary, focus mode, and Today/Tomorrow/Backlog lanes.
- The run-created task is visible in Today, and the page supports quick date actions like Today, Tomorrow, Later today, Complete, and Remove due.
- It supports the product loop step of planning the day better than most admin-heavy screens.

**What the current UI makes harder than it should:**

- Some labels describe the feature mechanics (`Keyboard planner`, guardrails) more than the operator's simple daily question: what should I do today?
- Task-card controls can become dense and overlap visually in screenshots, especially when action controls are expanded.
- Sizing is acceptable for internal use but not yet comfortably calm for daily repeated use.

**What should be fixed first:**

- PSE-215 should improve task-card control spacing, input comfort, and result/card readability.
- PSE-219 should ensure completion/toast feedback does not cover planning cards and that Today remains oriented after actions.

**Evidence:**

- `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/12-today-planning.png`
- `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-today.png`

### 5. Dashboard

**Primary operator goal:** get a fast overview of due work, overdue recovery, recent activity, favorite work, and project health.

**What the current UI makes easy:**

- The dashboard clearly groups Today, Overdue, Upcoming, Pinned & Favorites, Recent Activity, and Project Health.
- It supports review of timelines/dashboards and helps the operator return to active work.
- Cards include human-readable labels rather than raw implementation concepts.

**What the current UI makes harder than it should:**

- Task action controls inside overview cards make the dashboard feel partly like another task editor, not just a review surface.
- Recent Activity can become tall and dense, pushing project health and other summary information down.
- Print/edit/refresh controls are present at the top; useful, but not the daily priority for most operators.

**What should be fixed first:**

- PSE-215 should improve card readability and scanability.
- PSE-219 should verify dashboard route/sidebar active state and toast placement, especially after bulk completions or settings actions.

**Evidence:**

- `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/13-dashboard.png`
- `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-dashboard.png`

### 6. Search

**Primary operator goal:** find anything instantly and trust the visible result enough to open the right thing.

**What the current UI makes easy:**

- Search has a dedicated page, global top-bar search, filters, saved search, and local-only query scope.
- PSE-209 evidence shows bounded search result counts at scale, and the service/API evidence proves indexed content exists.
- Search is clearly positioned as a main navigation item.

**What the current UI makes harder than it should:**

- PSE-206 recorded that the query was entered but synthetic submit did not update route/results, while the API found the note. The screenshot shows typed query text while the result panel still says `No query`; that is not visually trustworthy for a human operator.
- Result cards are not yet strong enough as proof: the operator needs type, container, snippet/match, and date/status hierarchy in the visible result area.
- Empty/no-query/loading states are understandable but can appear inconsistent with visible typed input.

**What should be fixed first:**

- PSE-217 must make keyboard and click search visibly reliable, make query state obvious, and provide larger grouped/contextual result cards with match context.
- PSE-215 should improve result-card sizing.

**Evidence:**

- `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/10-search-results-saved.png`
- `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/18-persistence-search.png`
- `docs/manual-qa/screenshots/PSE-207-2026-05-16T01-24-38-683Z/14-backup-restore-search.png`
- `docs/manual-qa/screenshots/PSE-207-2026-05-16T01-24-38-683Z/24-backup-restore-after-restart-search.png`
- `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-search-fixture.png`

### 7. Settings overview

**Primary operator goal:** change appearance/readability, understand local-only privacy, and safely find backup/restore without being forced through admin tooling.

**What the current UI makes easy:**

- Settings exposes workspace health, appearance, privacy/network, keyboard shortcuts, diagnostics, maintenance, backups, exports, imports, categories, and local-only boundary.
- Privacy/local-only copy is present and explicit.
- Backup creation is reachable and produces a visible completion message.

**What the current UI makes harder than it should:**

- The page is a technical/admin wall: workspace health, schema version, search index, diagnostics, maintenance, orphan quarantine, backup, exports, imports, JSON restore, EML/Maildir, IMAP, categories, and local-only messaging all appear in one long scroll.
- Dangerous/rare/advanced actions visually compete with everyday settings.
- Backup/restore is important but buried among import/export/maintenance operations instead of being a guided safety area.
- Multiple toasts can stack over the work area after settings actions.

**What should be fixed first:**

- PSE-214 should split Settings by operator intent: Appearance & readability, Backup & restore, Privacy & local-only, Imports & exports, Advanced maintenance, and Categories/metadata.
- PSE-218 should make recovery guided.
- PSE-219 should make completion feedback persistent without covering controls.

**Evidence:**

- `docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/05-category-created-settings.png`
- `docs/manual-qa/screenshots/PSE-207-2026-05-16T01-24-38-683Z/09-backup-created.png`
- `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-backup-created.png`

### 8. Backup / restore area

**Primary operator goal:** create a local backup, understand where it is, restore into a safe new workspace, and know what happened after restore.

**What the current UI makes easy:**

- Manual backup works in packaged evidence.
- Restore into a new workspace works and explicitly says it does not overwrite the active workspace.
- Unsafe active-workspace restore target is blocked and explained.
- Backup rows show useful technical facts such as timestamp, attachment count, manifest size, and database size.

**What the current UI makes harder than it should:**

- Normal restore relies on a raw `Restore target folder` path field; the operator has to think like a filesystem administrator.
- Backup/restore is visually mixed with exports, JSON import restore, EML/Maildir, IMAP, maintenance, and categories.
- The success state is present but not yet a guided recovery completion view with obvious next actions such as open restored workspace, show restored folder, and show backup folder.
- Toast stacks confirm actions but can obscure settings controls.

**What should be fixed first:**

- PSE-218 should provide a guided backup/restore flow: folder picker, source/destination explanation, preview, restore confirmation, and success next actions.
- PSE-214 should move JSON/export/import/admin tooling away from the normal Backup & Restore path.
- PSE-219 should preserve completion results after toasts dismiss.

**Evidence:**

- `docs/manual-qa/screenshots/PSE-207-2026-05-16T01-24-38-683Z/11-invalid-restore-target-error.png`
- `docs/manual-qa/screenshots/PSE-207-2026-05-16T01-24-38-683Z/12-backup-restored.png`
- `docs/manual-qa/screenshots/PSE-207-2026-05-16T01-24-38-683Z/13-backup-restore-project.png`
- `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/01-1000-backup-created.png`

## Follow-up mapping to PSE-HUX sequence

| Finding | Severity | Follow-up issue | Why |
| --- | --- | --- | --- |
| Settings is a long admin/tooling wall. | P1 | PSE-214 | Split settings around operator intent and demote JSON/import/maintenance/diagnostics. |
| Text boxes, cards, and result displays are usable but too dense for daily work. | P1 | PSE-215 | Readability and sizing are core work functions, not polish. |
| Project detail foregrounds configuration/chrome before living work. | P1 | PSE-216 | Project pages must lead with next work, content, context, and relationships. |
| Contact detail lacks trustworthy screenshot evidence as a living work container. | P1 | PSE-216, then PSE-220 if still unresolved | Use shared container patterns where possible; final gate should require contact evidence or a focused follow-up. |
| Backup/restore works but is path/admin-oriented. | P1 | PSE-218 | Recovery is local-only trust infrastructure and needs guided safe flow. |
| Search is service-backed but not visually trustworthy enough. | P1 | PSE-217 | Query submission/result proof must be visible and human-readable. |
| Toasts and orientation can obscure or confuse work. | P2 | PSE-219 | Feedback should confirm actions without covering the active surface. |
| Relationship/tag confirmation is not obvious enough. | P2 | PSE-216 and PSE-219 | Relationships need visible state; feedback should confirm changes in context. |
| Welcome/recent workspace noise can distract from continuing work. | P2 | PSE-220 follow-up if still visible after HUX pass | Not a first implementation priority, but should be reviewed at the final gate. |

## Risk register

| ID | Severity | Risk | Evidence | Expected disposition |
| --- | --- | --- | --- | --- |
| HUX-AUDIT-R1 | P1 | Settings visually prioritizes admin/import/export/maintenance tools beside everyday settings. | Settings screenshots from PSE-206/PSE-207/PSE-209. | Fix in PSE-214. |
| HUX-AUDIT-R2 | P1 | Project detail does not yet lead with living project work. | PSE-206 project content screenshot; PSE-209 project feed screenshots. | Fix in PSE-216. |
| HUX-AUDIT-R3 | P1 | Search can be API-proven while visible state is inconclusive. | PSE-206 search caveat and `No query` screenshot despite typed query. | Fix in PSE-217. |
| HUX-AUDIT-R4 | P1 | Backup/restore exposes raw path/admin thinking in normal recovery path. | PSE-207 restore screenshots; PSE-209 settings/backup screenshot. | Fix in PSE-218. |
| HUX-AUDIT-R5 | P1 | Contact detail evidence does not prove a reliable contact work container. | Contact screenshots show `Contact not found`. | Address through shared container work or final-gate follow-up. |
| HUX-AUDIT-R6 | P1 | Default sizing/card density still taxes daily reading and scanning. | Project, Search, Today, Settings screenshots. | Fix in PSE-215. |
| HUX-AUDIT-R7 | P2 | Relationship and tag changes are not visually confirmatory enough. | PSE-206 caveats and project screenshots. | Improve in PSE-216/PSE-219. |
| HUX-AUDIT-R8 | P2 | Toast stacks can obscure primary work and settings controls. | PSE-207/PSE-209 settings screenshots. | Fix in PSE-219. |
| HUX-AUDIT-R9 | P2 | Welcome/recent workspace state can become noisy. | PSE-206/PSE-209 welcome screenshots. | Revisit in PSE-220 or later focused issue. |
| HUX-AUDIT-R10 | P3 | Some copy still describes feature mechanics before operator outcomes. | Today and Settings screenshots. | Opportunistic copy cleanup during PSE-215/PSE-219. |

## Baseline verdict

Pseudico has working local-only features and enough packaged-app evidence to continue the Primary Operator UX sequence, but the current visible product is **not yet primary-operator ready**.

The strongest blockers are not missing backend capability. They are product-fit blockers: Settings is admin-first, Project/Contact work containers do not yet visually foreground the living work loop, Search lacks visible trust, Backup/Restore needs guided recovery, and daily reading/scanning needs a sizing pass.

Proceed with PSE-214 next, then PSE-215, PSE-216, PSE-218, PSE-217, PSE-219, and use PSE-220 as the final acceptance/regression gate with fresh screenshot evidence.

## Validation

- Docs-only change for PSE-213.
- No React, Electron, SQLite, IPC, repository, service, or schema behavior changed.
- Validation should confirm `docs/PRIMARY_OPERATOR_WORKFLOW_AUDIT.md` exists and that `docs/session_log.md` records docs-only validation.
