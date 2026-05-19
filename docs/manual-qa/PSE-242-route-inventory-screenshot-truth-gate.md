# PSE-242 Route inventory and screenshot truth gate

## Summary

Added a production route manifest in `apps/desktop/src/shared/productionRouteManifest.ts` and a PSE-241 capture gate in `apps/desktop/src/main/pse241Capture.ts`. The capture gate resolves dynamic project/contact IDs from seeded local demo data, navigates actual production hash routes, asserts the expected path, heading, and landmarks before saving screenshots, and writes `route-identity-results.md` beside the screenshots.

The referenced `full-ui-review-2026-05-19` directory was not present in the checkout, so it is treated as replaced by the new verified PSE-247 capture set.

## Distinct route proof

Project Detail, Dashboard, Calendar, Timeline, Search, and Projects now have distinct route paths, screenshot keys, headings, and verified screenshots under `docs/manual-qa/screenshots/PSE-242-route-inventory-screenshot-truth-gate/`.

## Route inventory

| Route | Screenshot key | Primary operator task | Status | Final evidence |
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

## Tests / checks

- `pnpm --filter @local-work-os/desktop test -- tests/renderer/productionRouteManifest.test.ts` ? passed.
- `pnpm --filter @local-work-os/desktop typecheck` ? passed.
- `LOCAL_WORK_OS_CAPTURE_PSE241=1 LOCAL_WORK_OS_CAPTURE_ISSUE=PSE-247-full-app-visual-qa-gate pnpm --filter @local-work-os/desktop dev` ? passed and produced verified route screenshots.

## Risks

- P0/P1/P2: none known after the final capture.
- P3: the capture harness is a local QA hook and remains env/CLI gated.
