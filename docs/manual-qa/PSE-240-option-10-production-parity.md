# PSE-240 Option-10 Production Parity Manual QA

Linear issue: PSE-240 — SBUX-010: Implement option-10 rendered UI parity across production routes.

## Summary

PSE-240 is the corrective SBUX pass that treats the rendered option-10 screenshots as hard production visual/layout baselines. The evidence below was captured from the built Electron production routes with a local demo workspace plus long realistic operator data seeded locally for the capture run. It is not design-preview-only evidence and it is not a hidden fixture-route screenshot set.

Screenshot directory: `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/`

## Evidence matrix

| Route | Option-10 target | 1440x1000 production screenshot | 1280x800 production screenshot | What changed to match target | Long-data proof |
| --- | --- | --- | --- | --- | --- |
| Workspace Home | `docs/ui-redesign/screenshots/option-10/01-workspace-home.png` | `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/workspace-home-1440x1000.png` | `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/workspace-home-1280x800.png` | Default shell now uses the narrow dark icon rail and compact context strip. Home first viewport now presents pinned work, operator feed, Today panel, active contacts, and maintenance as secondary. | Long operator task, contact handoff name, project names, and maintenance copy remain readable; 1280 keeps cards in row/columns without using the old wide left nav. |
| Today Planning | `docs/ui-redesign/screenshots/option-10/02-today-planning.png` | `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/today-planning-1440x1000.png` | `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/today-planning-1280x800.png` | Today uses the compact shell, a rapid day-planner band, Today/Tomorrow/Backlog lanes, and a selected-task inspector in the first workbench. Secondary planning/preferences stay below the core loop. | Long Today and Tomorrow task titles wrap in row/card space; selected inspector exposes the title/body/project/due/status rather than forcing all meaning into lane cards. |
| Project Detail | `docs/ui-redesign/screenshots/option-10/03-project-detail-mixed-feed.png` | `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/project-detail-1440x1000.png` | `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/project-detail-1280x800.png` | Project detail is visually compressed toward the option-10 header, quick actions, section rail, central mixed feed, and inspector composition with flatter panels and less card shadow. | Long task title, note preview, link title/domain, tags, activity, and inspector body remain readable; 1280 preserves central feed before secondary panels dominate. |
| Search / Collections | `docs/ui-redesign/screenshots/option-10/04-search-collections.png` | `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/search-collections-1440x1000.png` | `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/search-collections-1280x800.png` | Search presents a command-sized query, saved/filter rail, readable results, and a why-matched inspector at 1440 instead of waiting for ultra-wide layouts. | Query `operator handoff` shows matched text, result shape, context, container, notes, active filters, and long contact/project titles without truncating primary meaning. |
| Timeline / Calendar | `docs/ui-redesign/screenshots/option-10/05-timeline-calendar.png` | `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/timeline-calendar-1440x1000.png` | `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/timeline-calendar-1280x800.png` | Timeline keeps the fixed row label gutter, time grid, date/status bars, and selected agenda/detail pattern under the compact option-10 shell. | Long timeline task title is readable in the row/detail area; narrow bars keep date/status only and do not carry the full task title. |

Contact sheet: `docs/manual-qa/screenshots/PSE-240-option-10-production-parity/contact-sheet.png`

## Per-surface operator review answers

### Workspace Home

- Primary operator goal: open the workspace and decide what to work on next.
- Baseline: `01-workspace-home.png`.
- Before: previous evidence showed a wide left navigation, large top command strip, elevated cards, and maintenance/dashboard-feeling composition.
- Changed: narrow dark rail, compact context strip, pinned row, operator feed, Today panel, contacts panel, and secondary maintenance panel.
- Dominant information: pinned/recent work, recent movement, Today counts/tasks, and active people/handoffs.
- Secondary/hidden: maintenance, settings, backup/export/trash, and onboarding help.
- Next safe action: open a pinned project, open Today, search, or open contacts/settings from clearly labeled controls.
- Daily sizing: cards and rows remain comfortable; long project/contact/task names wrap without syllable-breaking.
- 1280x800 behavior: the old wide nav remains gone; the home grid keeps the Today panel visible while the page scrolls vertically.
- Action feedback: route navigation and linked rows make the destination obvious.
- Local Work OS loop: supports scan -> choose work -> plan/search/maintain.

### Today Planning

- Primary operator goal: rapidly capture and arrange the day’s work.
- Baseline: `02-today-planning.png`.
- Before: Today proved readability but did not match the option-10 dense planner/lanes/inspector composition.
- Changed: planner band and lane workbench are first; selected task inspector is present; preferences/summary are secondary below.
- Dominant information: capture input, Today/Tomorrow/Backlog lanes, selected task detail, and action buttons.
- Secondary/hidden: exported planning summary and preferences.
- Next safe action: type in the planner, use lane actions, or open selected source.
- Daily sizing: long task rows and action groups remain readable.
- 1280x800 behavior: lane grid and inspector remain visible with vertical scrolling, not a compressed wide-sidebar layout.
- Action feedback: lane badges, due/status metadata, and selected inspector show what happened/what is selected.
- Local Work OS loop: supports capture -> plan -> inspect -> act.

### Project Detail

- Primary operator goal: work inside a mixed-content project room.
- Baseline: `03-project-detail-mixed-feed.png`.
- Before: production used larger cards/elevated panels and a less option-10-like first viewport.
- Changed: flatter compact header, quick actions, section rail, central mixed feed, and inspector column under the option-10 shell.
- Dominant information: project title/status, next work, mixed feed items, and selected inspector details.
- Secondary/hidden: tab preferences and advanced details.
- Next safe action: add work, review content, inspect a selected item, or navigate back to projects.
- Daily sizing: long tasks, note previews, link domains, activity, and tags remain readable.
- 1280x800 behavior: feed/inspector remain usable; secondary panels no longer consume left-nav width.
- Action feedback: selected inspector and route links show context.
- Local Work OS loop: supports project review -> add/update work -> inspect/reconcile context.

### Search / Collections

- Primary operator goal: find cross-object work and understand why it matched.
- Baseline: `04-search-collections.png`.
- Before: preview/detail panel was not part of the standard 1440 first-viewport composition.
- Changed: 1440 layout now includes filter rail, command/result surface, and why-matched inspector.
- Dominant information: query, saved/filter controls, result title/body/context, why-matched detail.
- Secondary/hidden: advanced saved-view editing.
- Next safe action: open source, add to Today, refine filters, or save search.
- Daily sizing: long contact/project/result text wraps in result and inspector panels.
- 1280x800 behavior: three-column layout remains usable with vertical scroll and without title truncation.
- Action feedback: result count, selected preview, filters, and highlighted text show state.
- Local Work OS loop: supports find -> verify context -> open/act/save.

### Timeline / Calendar

- Primary operator goal: understand scheduled workload without losing task meaning.
- Baseline: `05-timeline-calendar.png`.
- Before: PSE-236 fixed long-data bars but the route still sat inside the old visual shell and less target-like panel density.
- Changed: compact shell, flatter filter/status bars, fixed label gutter, date grid, status-only bars, and agenda/detail panel.
- Dominant information: row label/title, time grid, date/status bars, and selected detail.
- Secondary/hidden: advanced filters and saved-view controls.
- Next safe action: inspect a row/detail, refresh, change range/grouping, or save a filter.
- Daily sizing: long task title is readable in the row/detail, not inside narrow bars.
- 1280x800 behavior: horizontal/vertical scrolling preserves grid and label budgets.
- Action feedback: selected detail and row/bar state make the chosen item clear.
- Local Work OS loop: supports schedule scan -> inspect due work -> return to project/Today.

## Acceptance criteria status

- Workspace Home option-10 parity: met within implementation tolerance.
- Today option-10 parity: met within implementation tolerance.
- Project Detail option-10 parity: met within implementation tolerance.
- Search/Collections option-10 parity: met within implementation tolerance.
- Timeline/Calendar option-10 parity: met within implementation tolerance.
- Persistent shell uses dark icon rail/top context strip, not previous wide left nav: met.
- 1440x1000 production screenshots for all five target surfaces: met.
- 1280x800 production screenshots for all five target surfaces: met.
- Evidence is from production routes, not hidden fixture routes/design previews: met.
- Long realistic data remains readable: met.
- P0/P1 regressions: none found.

## Risk register

- P0: none.
- P1: none.
- P2: Calendar month/week route has prior PSE-236 evidence; PSE-240 final paired baseline uses the Timeline route as the timeline/calendar composition surface.
- P2: The PSE-240 capture harness is env-gated production Electron QA code; keep it documented and avoid invoking it in normal app startup.
- P3: Further typography/icon polish can improve exact visual closeness, but should preserve these accepted budgets.
