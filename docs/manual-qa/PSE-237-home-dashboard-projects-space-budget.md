# PSE-237 manual QA — workspace, dashboard, and projects library space budget

## Scope

Production-built renderer route evidence:

- `#/workspace-dashboard-projects-space-budget-fixture`

Screenshots:

- `docs/manual-qa/screenshots/PSE-237-home-dashboard-projects/01-home-dashboard-projects-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-237-home-dashboard-projects/02-home-dashboard-projects-1280x800.png`
- `docs/manual-qa/screenshots/PSE-237-home-dashboard-projects/03-dashboard-projects-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-237-home-dashboard-projects/04-projects-library-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-237-home-dashboard-projects/05-dashboard-projects-1280x800.png`
- `docs/manual-qa/screenshots/PSE-237-home-dashboard-projects/06-projects-library-1280x800.png`

## Operator review

- Primary job: open Pseudico and decide where to go next from pinned/recent work, Today context, project health, and project/category browsing.
- Dominant information: full project names, next action/description lines, Today/overdue counts, recent movement, category labels, status/category/date metadata.
- Secondary information: settings, backup/export, trash, print/PDF, dashboard layout editing, and other maintenance actions remain visible but visually secondary.
- Next safe action: Open Today, Projects, Search, Dashboard, or a project row/card from the same screen.
- Sizing: pinned cards use 260–320px columns; workspace feed keeps a 520px primary column; dashboard summary starts with a 420px daily-work panel; project category columns use 240–300px horizontal-scroll lanes; project rows keep a 320px title/next-action column.
- 1280x800 behavior: shell side navigation collapses to icon rail, pinned/category surfaces keep readable cards, and secondary panels wrap below daily work rather than shrinking text into nonsense.
- Feedback: visible counts, dates, status/category metadata, and readable recent activity explain what the operator is seeing after navigation or updates.
- Local Work OS loop: the screen supports capture/review/open-project/search flow instead of promoting maintenance or decorative metrics.

## Acceptance reconciliation

- Pinned/recent items show title, next action, status/category/date in a readable budget: pass.
- Dashboard distinguishes daily work from maintenance/tools: pass.
- Projects library supports category/tag browsing and table/list browsing with long project names: pass; category browser and project tag browser link are visible, and rows keep long names/next actions readable.
- Category columns/cards do not shrink below readable thresholds: pass; CSS uses 240–300px horizontal-scroll category columns.
- 1440x1000 and 1280x800 screenshots show realistic populated data: pass.

## Risks and notes

- P0/P1: none known.
- P2: screenshot evidence uses a deterministic hidden production renderer fixture; live pages share the new production classes/structures and continue to use existing service/repository paths.
- P3: richer persisted dashboard layout defaults and user-customized project library presets can be polished later.

## Validation

- Targeted renderer tests passed for workspace/dashboard/projects fixture, dashboard page, projects page, and readability styles.
- `pnpm --filter @local-work-os/desktop typecheck` passed.
- `pnpm lint` passed.
- `pnpm --filter @local-work-os/desktop build` passed after rerunning outside the sandbox because Electron/Vite subprocess spawn was blocked.
