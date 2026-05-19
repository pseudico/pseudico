# Space-Budget Operator UI Acceptance Review

Date: 2026-05-19
Linear issue: PSE-239
Program: PSE-230 SBUX space-budgeted operator UI
Verdict: **Pilot acceptable with caveats; ready for a next visual-identity pass, not public-release or nontechnical-handoff ready.**

## 1. Review basis

This review closes the SBUX sequence by evaluating the implemented production renderer evidence from PSE-231 through PSE-238 against `docs/ui-redesign/operator-space-budget.md` and the option-10 principle:

> Information expectation determines container size. If the component cannot fit the required information, change the pattern.

The review intentionally does **not** introduce a broad new UX implementation. It reconciles the route evidence, calls out gaps, and records small follow-up candidates.

## 2. Evidence index

All listed screenshots were captured from production Electron/production-built renderer surfaces, not design-preview-only mockups.

| Surface | Evidence | 1440x1000 | 1280x800 | Result |
| --- | --- | --- | --- | --- |
| Shared primitives | `docs/manual-qa/PSE-231-space-budget-primitives.md`; `docs/manual-qa/screenshots/PSE-231-space-budget-primitives/` | yes | yes | Pass |
| Persistent shell / Quick Add | `docs/manual-qa/PSE-232-shell-space-budget.md`; `docs/manual-qa/screenshots/PSE-232-shell/` | yes | yes | Pass |
| Workspace home | `docs/manual-qa/PSE-237-home-dashboard-projects-space-budget.md`; `docs/manual-qa/screenshots/PSE-237-home-dashboard-projects/01-home-dashboard-projects-1440x1000.png`; `02-home-dashboard-projects-1280x800.png` | yes | yes | Pass |
| Dashboard | `docs/manual-qa/PSE-237-home-dashboard-projects-space-budget.md`; `03-dashboard-projects-1440x1000.png`; `05-dashboard-projects-1280x800.png` | yes | yes | Pass |
| Today | `docs/manual-qa/PSE-233-today-space-budget.md`; `docs/manual-qa/screenshots/PSE-233-today/` | yes | yes | Pass |
| Inbox / capture and triage | PSE-232 shell Quick Add evidence; PSE-231 capture primitive evidence; PSE-206 packaged journey screenshots for capture-adjacent flow | partial | partial | Pass with P2 evidence caveat |
| Projects library | `docs/manual-qa/PSE-237-home-dashboard-projects-space-budget.md`; `04-projects-library-1440x1000.png`; `06-projects-library-1280x800.png` | yes | yes | Pass |
| Project detail | `docs/manual-qa/PSE-234-project-detail-space-budget.md`; `docs/manual-qa/screenshots/PSE-234-project-detail/` | yes | yes | Pass |
| Contacts | `docs/manual-qa/PSE-238-contacts-maintenance-space-budget.md`; `docs/manual-qa/screenshots/PSE-238-contacts-maintenance/` | yes | yes | Pass |
| Search / Collections | `docs/manual-qa/PSE-235-search-collections-space-budget.md`; `docs/manual-qa/screenshots/PSE-235-search-collections/` | yes | yes | Pass |
| Timeline / Calendar | `docs/manual-qa/PSE-236-planning-space-budget.md`; `docs/manual-qa/screenshots/PSE-236-planning/01-04,07-08*.png` | yes | yes | Pass |
| Pipeline / Kanban | `docs/manual-qa/PSE-236-planning-space-budget.md`; `05-pipeline-planning-1440x1000.png`; `06-pipeline-planning-1280x800.png` | yes | yes | Pass |
| Settings / Backup / Trash / Workflow Lab | `docs/manual-qa/PSE-238-contacts-maintenance-space-budget.md`; full-page contact-maintenance screenshot | yes | yes | Pass |

## 3. Primary workflow loop review

| Workflow step | Acceptance observation | Status |
| --- | --- | --- |
| Open workspace | Workspace home shell reserves command/search, Quick Start, pinned/recent work, and daily summaries; maintenance stays secondary. | Pass |
| Scan workspace home/dashboard | Pinned/recent/project health cards keep names, next actions, dates, and category/status readable; secondary dashboard content wraps below daily work. | Pass |
| Quick capture task/note/link/file/email | Shell Quick Start and shared capture primitives are sized for real multiline capture. Inbox email-drop and file/link behavior remain existing production flows, but no dedicated PSE-239 long-data Inbox screenshot was newly captured. | Pass with P2 caveat |
| Triage Inbox | Existing Inbox uses shared `ItemFeed`, `TaskQuickAdd`, move dialog, and inspector primitives. Evidence is indirect through shared primitives/shell and earlier packaged journey, so route-specific SBUX screenshot coverage is incomplete. | Pass with P2 caveat |
| Plan Today | Today rapid capture, Today/Tomorrow/Backlog lanes, long titles, destination context, and complete/snooze/reschedule/move actions pass at 1440 and 1280. | Pass |
| Open active project | Project detail keeps title/next action/header context, quick-start actions, central feed, related contacts, and inspector readable. | Pass |
| Work in mixed feed | Tasks, checklists, notes, files, links, locations, tags/categories, and activity are represented with long realistic data and central feed priority. | Pass |
| Inspect/tag/link item | Inspector fields use real title/body space; search/project/contact routes keep full selected title/body visible when rows must wrap. Tag/category context remains readable. | Pass |
| Link contacts / related work | Contact detail and project detail show related projects/contacts as readable context rather than chip-only decoration. | Pass |
| Search / saved view | Search input stays command-sized; result rows explain why matched and preview full selected content; saved-view filters remain readable. | Pass |
| Review timeline/calendar/pipeline | Timeline bars show date/status only while row labels/detail/agenda carry full titles; day columns and pipeline lanes scroll before shrinking below budget. | Pass |
| Export/backup/maintain | Maintenance surfaces are spacious, conventional, safety-forward, and visually secondary until deliberately opened. | Pass |

## 4. Explicit budget reconciliation

| Budget rule from `operator-space-budget.md` | Result | Evidence / note |
| --- | --- | --- |
| Global search / command: 420px minimum, collapse chrome first | Pass | PSE-232 shell at 1280x800; PSE-235 search command. |
| Quick Add one-line task: 520px x 44px or overlay/drawer | Pass | PSE-232 Quick Start and PSE-231 primitive evidence. |
| Quick Add multiline capture: 320px x 140px minimum | Pass | PSE-231 primitive and PSE-233 Today planner. |
| Sidebar navigation: 240-280px or icon rail + drawer | Pass | PSE-232 shell collapses side nav to icon rail at 1280. |
| Category browser column: 240px minimum, else list/table | Pass | PSE-237 project/category browser lanes. |
| Project/contact table row: title column >=320px | Pass | PSE-237 project rows; PSE-238 contact surfaces. |
| Pinned project card: 260px x 68px | Pass | PSE-237 pinned/recent work cards. |
| Today lane task: 360px x 72px, list fallback if smaller | Pass | PSE-233 Today lanes/rows. |
| Inspector title/body: textarea-sized real content | Pass | PSE-231, PSE-234, PSE-235, PSE-238. |
| Mixed feed item: central pane >=560px and min 86px high | Pass | PSE-234 project detail; PSE-238 contact detail. |
| Checklist/list: 520px dedicated list editor | Pass | PSE-234 mixed feed and PSE-236 pipeline/list fallback. |
| File/link item: 480px, extension/domain visible | Pass | PSE-234, PSE-235, PSE-238. |
| Location item: 480px x 96px, address first | Pass | PSE-234 location evidence. |
| Timeline row label: 300-340px fixed gutter | Pass | PSE-236 timeline. |
| Timeline day column: 52-64px/day | Pass | PSE-236 timeline, 58px day budget. |
| Timeline bar label: date/status unless bar >= readable threshold | Pass | PSE-236 bars avoid title cramming. |
| Calendar event: agenda fallback when cell is narrow | Pass | PSE-236 calendar/agenda. |
| Pipeline card: 220px x 72px, columns 260-320px | Pass | PSE-236 pipeline/kanban. |
| Search result: 620px row/card and preview detail | Pass | PSE-235 search/collections. |
| Backup/export/settings: 520px panels, boring and safe | Pass | PSE-238 maintenance fixture. |

## 5. 1440x1000 observations

- The shell has enough width for command/search, route title, Quick Start, and expanded navigation without demoting daily work.
- Workspace home and dashboard show multiple useful work summaries without turning into equal-weight metric clutter.
- Today, project detail, search, planning, and contact/maintenance routes all keep primary text at phrase/row scale rather than chip scale.
- Project and contact detail retain central feed readability while keeping inspector/context panels useful.
- Maintenance screens are intentionally less visually dominant than work surfaces.

## 6. 1280x800 observations

- The shell collapses secondary chrome before shrinking command/search and Quick Start below usable size.
- Today controls wrap; lanes remain readable rather than becoming tiny cards.
- Project/contact detail collapse secondary outline/context before squeezing the mixed feed.
- Search keeps command/results usable; filters and preview reflow instead of crowding the result title.
- Timeline/calendar/pipeline use horizontal scroll, agenda/detail, and conventional fallback surfaces before nonsense text appears.

## 7. Acceptance criteria status

| PSE-239 acceptance criterion | Status |
| --- | --- |
| Review uses real rendered production UI, not design-preview-only screenshots. | Met. Evidence comes from production Electron or production-built renderer captures committed in PSE-231..PSE-238. |
| Primary text and inputs pass the documented space budgets or have explicit fallback behavior. | Met with caveats. All documented route families pass; Inbox route-specific long-data screenshot coverage is partial but shared primitives support its capture/feed controls. |
| No P1 legibility/input blocker remains untracked. | Met. No P0/P1 found; P2/P3 risks below are tracked. |
| Follow-up tickets are small and route/workflow-specific. | Met as recommendations below; no P0/P1 follow-up required before closing SBUX. |

## 8. Risk register

| Severity | Risk | Owner / disposition |
| --- | --- | --- |
| P0 | None found. | N/A |
| P1 | None found. | N/A |
| P2 | Inbox route has indirect SBUX evidence only. The page uses shared production primitives, but the SBUX sequence did not produce a dedicated long-data Inbox triage screenshot at 1440 and 1280. | Recommend follow-up: `SBUX follow-up: capture Inbox triage long-data screenshot/evidence and tune only if gaps are visible`. |
| P2 | Most SBUX route evidence uses deterministic hidden production-renderer fixtures rather than live workspace mutation paths. | Acceptable for this UI budget gate because tests cover live component/service boundaries, but packaged seeded-workspace visual QA should be added before nontechnical handoff claims. |
| P2 | The prior Operator Readiness Report still says pilot-ready, not nontechnical-operator-ready; this SBUX pass does not close signing, installer, update, public release, or owner acceptance gates. | Keep readiness language limited to UI space-budget acceptance. |
| P3 | Visual identity, palette, iconography, selection/focus polish, and richer drawers can now proceed, but should not undo space budgets. | Next visual identity pass should treat this review as a regression checklist. |
| P3 | Advanced saved-view editing, workflow lab polish, and deeper contact-feed inspector behavior remain future improvements. | Route-specific future tickets only. |

## 9. Recommended follow-ups

1. **P2 - Inbox triage evidence pass:** capture 1440x1000 and 1280x800 production UI evidence with long Inbox task/list/note/link/file/email items; tune only if the shared primitives fail on the live route.
2. **P2 - Packaged seeded-workspace visual QA:** repeat the primary loop screenshots against one seeded packaged workspace so the program has both deterministic fixture evidence and live data-path evidence.
3. **P3 - Visual identity pass with budget lock:** improve typography, color, focus/selection states, and icon treatment without reducing any accepted minimum width/height or fallback rules.

## 10. Final verdict

PSE-231 through PSE-238 collectively move Pseudico from a functional/developer-feeling UI toward an operator-readable Local Work OS. The primary SBUX standard is met: full task/project/contact/note/file/link/search/timeline meaning is no longer forced into tiny boxes, and 1280x800 behavior generally changes pattern before primary text becomes unreadable.

**Verdict:** pilot acceptable with caveats and ready for the next visual-identity pass. Do not claim public release or nontechnical operator handoff from this review alone.

## 11. PSE-240 corrective option-10 parity addendum

PSE-240 corrected the main caveat from this PSE-239 gate: the app no longer only proves the abstract space-budget rules. The five primary production routes now have actual production-route screenshots against the option-10 hard visual/layout baselines:

- `docs/manual-qa/PSE-240-option-10-production-parity.md`
- `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/workspace-home-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/today-planning-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/project-detail-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/search-collections-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/timeline-calendar-1440x1000.png`
- Matching 1280x800 screenshots for all five surfaces in the same directory.

**Updated UI verdict after PSE-240:** option-10 production-route parity is acceptable within implementation tolerance for the scoped route family, while retaining the earlier SBUX legibility budgets and local-only constraints. This still does not claim public release, signed installer readiness, cloud sync, account/team behavior, or nontechnical handoff readiness.
