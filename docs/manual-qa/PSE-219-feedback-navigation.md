# PSE-219 feedback, toasts, and navigation orientation evidence

Linear issue: PSE-219 — PSE-HUX-007: Polish feedback, toasts, and navigation orientation
Date: 2026-05-17
Environment: built Electron app launched locally from `apps/desktop/dist/main/index.js` with a temporary demo workspace at `.tmp/pse-219-evidence-workspace`.

## Operator goal

A primary operator should be able to move around the local workspace, see where they are, understand what just happened after safe local actions, and recover important completion details after temporary toasts disappear.

## What changed

- Sidebar active state now uses shared route-parent mapping, so detail routes and top-level pages keep the correct operator orientation.
- Top bar title/actions now preserve a readable page title while letting action controls wrap instead of crushing the current location label.
- Toasts are capped to the two newest visible notifications plus a summary item, placed in the left rail near navigation rather than over primary work content.
- Settings keeps backup/export/restore/search-maintenance completion details in a persistent Recent Settings activity summary after toast dismissal.

## Screenshot evidence

Screenshots are in `docs/manual-qa/screenshots/PSE-219-2026-05-17T01-10-00-000Z/`:

1. `01-today-after-several-completions.png` — Today remains usable while multiple completions are grouped in the navigation rail.
2. `02-dashboard-after-several-completions.png` — Dashboard remains visually dominant; feedback does not cover primary dashboard cards.
3. `03-settings-persistent-activity-after-toast-dismissal.png` — Settings retains backup/export/search rebuild results after visible toasts are dismissed.
4. `04-project-tags-active-nav.png` — Project Tags route has a clear top-bar title and the matching sidebar item remains active.

## Manual QA answers

- Primary operator task: complete local backup/export/search maintenance actions, then continue planning/reviewing without losing orientation or result details.
- Visually dominant: current page title, active sidebar item, and page content; feedback is supportive and recoverable.
- Secondary/advanced: maintenance/import/export actions remain inside Settings sections; repeated toasts collapse into a summary.
- Next safe action: Recent Settings activity provides Review buttons back to the relevant section; sidebar and top bar show current location.
- Comfort: toast stack is bounded, text wraps inside cards, and top-bar route names no longer collapse to one word per line.
- Confirmation: completion messages remain visible as toasts briefly and as Settings activity entries for backup/export/search rebuild.
- Local Work OS loop: the change supports daily planning/review/navigation confidence without adding cloud, telemetry, or remote storage.

## Acceptance checklist

- [x] Feedback/toasts support confidence and recovery without adding noise.
- [x] Important Settings completions remain findable after toast dismissal.
- [x] Navigation orientation is clear for Today, Dashboard, Project Tags, Search, Settings, Projects, and project detail routes via route tests.
- [x] Actual app UI screenshots produced for affected workflow surfaces.
- [x] Local-only architecture constraints preserved; no IPC, DB, filesystem, or network behavior changed.

## Known risks

- P0: none.
- P1: none.
- P2: `pnpm package` remains blocked in this clean linked worktree by electron-builder treating pnpm workspace package symlink targets outside `apps/desktop` as unsafe system paths; built Electron evidence was used instead because PSE-219 changes are renderer-only.
- P3: Future polish could add an in-app notification history beyond Settings-specific recovery events.
