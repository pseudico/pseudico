# PSE-247 Full-app visual QA gate

## Summary

Ran the final full-app production Electron capture with route identity assertions for every regular production route at 1440x1000 and 1280x800. Final screenshots are under `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/` with `route-identity-results.md` and `contact-sheet.png`.

## Route status

| Route | Screenshot key | Primary operator task | Classification | Evidence |
| --- | --- | --- | --- | --- |
| `/welcome` | `welcome` | Open/create workspace | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/welcome-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/welcome-1280x800.png` |
| `/workspace` | `workspace-home` | Scan and choose work | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/workspace-home-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/workspace-home-1280x800.png` |
| `/today` | `today` | Plan day and inspect selected task | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/today-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/today-1280x800.png` |
| `/inbox` | `inbox` | Capture and triage unassigned work | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/inbox-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/inbox-1280x800.png` |
| `/projects` | `projects` | Browse/open project containers | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/projects-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/projects-1280x800.png` |
| `/projects/:projectId` | `project-detail` | Work in mixed project feed | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/project-detail-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/project-detail-1280x800.png` |
| `/project-tags` | `project-tags` | Browse projects by tag | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/project-tags-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/project-tags-1280x800.png` |
| `/contacts` | `contacts` | Browse/open contact containers | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/contacts-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/contacts-1280x800.png` |
| `/contacts/:contactId` | `contact-detail` | Review contact work room | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/contact-detail-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/contact-detail-1280x800.png` |
| `/contact-labels` | `contact-labels` | Browse contacts by labels | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/contact-labels-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/contact-labels-1280x800.png` |
| `/collections` | `collections` | Manage saved local views | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/collections-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/collections-1280x800.png` |
| `/tags-categories` | `tags-categories` | Manage metadata filters | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/tags-categories-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/tags-categories-1280x800.png` |
| `/templates` | `templates` | Review/use local templates | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/templates-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/templates-1280x800.png` |
| `/search?q=operator%20handoff` | `search` | Find and verify matches | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/search-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/search-1280x800.png` |
| `/dashboard` | `dashboard` | Review actionable summaries | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/dashboard-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/dashboard-1280x800.png` |
| `/timeline` | `timeline` | Scan dated work | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/timeline-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/timeline-1280x800.png` |
| `/calendar` | `calendar` | Review calendar schedule | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/calendar-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/calendar-1280x800.png` |
| `/workflows` | `workflows` | Understand scaffold boundary | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/workflows-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/workflows-1280x800.png` |
| `/help` | `help` | Read local help | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/help-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/help-1280x800.png` |
| `/settings` | `settings` | Manage local settings safely | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/settings-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/settings-1280x800.png` |
| `/trash` | `trash` | Review/restore soft deletes | pass | `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/trash-1440x1000.png`; `docs/manual-qa/screenshots/PSE-247-full-app-visual-qa-gate/trash-1280x800.png` |

## Acceptance checklist

- Full-app screenshot set exists for 1440x1000 and 1280x800: met.
- Every screenshot has route identity assertions: met, see `route-identity-results.md`.
- Each page has boundedness/readability/action clarity/long-data/cohesion notes: met in this doc plus PSE-242 through PSE-246 docs.
- No P0/P1 remains untracked: met; none found.
- PSE-241 can be updated with final state and follow-up tickets: met.
- Manual QA docs added under `docs/manual-qa/`: met.

## Risk register

- P0: none.
- P1: none.
- P2: none.
- P3: optional future polish for compact tag/contact label jump lists and broader direct adoption of JSX operator primitives beyond the CSS-normalized frame.

## Checks

- Full production Electron/Playwright-style capture via Electron dev mode: passed.
- Route identity/capture tests: passed.
- `pnpm --filter @local-work-os/desktop typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: initially failed because Electron capture left `better-sqlite3` compiled for Electron ABI 145 while Node tests require ABI 127; rebuilt the native module with `npm exec -- node-gyp rebuild --release`, reran, and the full suite passed (238 files / 916 tests).
- `pnpm build`: passed.
