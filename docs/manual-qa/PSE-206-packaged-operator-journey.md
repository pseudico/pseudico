# PSE-206 packaged operator journey manual QA

Date/time: 2026-05-16 10:14-10:15 Australia/Sydney (2026-05-16 00:14-00:15 UTC)
OS: Microsoft Windows 10.0.26200 x64
App artifact path: `C:\Users\AlastairLacey\Pseudico\apps\desktop\dist-packaged\win-unpacked\Local Work OS.exe`
Packaged app bundle: `C:\Users\AlastairLacey\Pseudico\apps\desktop\dist-packaged\win-unpacked\resources\app.asar`
Artifact timestamp: `Local Work OS.exe` / `app.asar` last modified 2026-05-16 09:48 local after PSE-212 rebuild
App version / commit: package version `0.0.0`; repo commit `5c68155b8341a6204260d7785abdd87d9bf295b3`
Workspace path used: `C:\tmp\PSE-206-2026-05-16T00-14-23-908Z-workspace`
Source attachment path prepared: `C:\tmp\PSE-206-2026-05-16T00-14-23-908Z-source-attachment.txt`
Run summary: `docs/manual-qa/PSE-206-run-summary.json`

## Result

**Final gate result: Pass with caveats.**

PSE-212 is resolved for the PSE-206 blocker: a project created from packaged Quick Start now opens in packaged project detail and shows created project content. The packaged run completed through workspace creation, contact/project/note/task/list/category/link creation, attachment storage verification, collection, Today, dashboard, timeline/calendar, app restart, and persistence checks.

OR-R1 can be treated as closed for the original packaged project-opening blocker, but this evidence includes P2/P3 caveats below. Do not change the overall program verdict to Operator ready because OR-R2/OR-R3/OR-R4 remain open.

## Test data names used

| Data | Name/value |
| --- | --- |
| Workspace | `PSE-206 Workspace 2026-05-16` |
| Contact | `Avery PSE-206 Operator` |
| Project | `PSE-206 Launch Project` |
| Category | `PSE-206 Operator QA` |
| Note | `PSE-206 operator-ready note` |
| Search token | `PSE-206-query` |
| Task | `PSE-206 verify packaged journey task` |
| List/checklist | `PSE-206 operator checklist` |
| Link | `https://example.com/pse-206-operator-reference` |
| Collection | `PSE-206 Operator Smoke Collection` |

## Step-by-step pass/fail table

| # | Operator journey step | Result | Evidence / notes |
| --- | --- | --- | --- |
| 1 | Launch packaged app | Pass | Normal packaged welcome screen rendered. |
| 2 | Create/open workspace | Pass | Fresh disposable workspace outside bundle at `C:\tmp\PSE-206-2026-05-16T00-14-23-908Z-workspace`. |
| 3 | Add contact | Pass | Quick Start saved `Avery PSE-206 Operator`. |
| 4 | Add project | Pass | Quick Start saved and routed to `PSE-206 Launch Project`; PSE-212 project-open blocker no longer reproduced. |
| 5 | Add note | Pass | Created note appears in project tab preview and content feed. |
| 6 | Add task | Pass | Created dated task appears in project and Today. |
| 7 | Add list/checklist | Pass | Created list shell appears in project content. |
| 8 | Add category | Pass | Settings category `PSE-206 Operator QA` created and used on content. |
| 9 | Add external link | Pass | Link item appears in project content. |
| 10 | Relate records | Pass with caveat | Relationship controls were exercised, but final API summary still reported `relatedCount: 0`; see P2 issue. |
| 11 | Attach local file | Pass with caveat | Attachment verified at workspace-relative `attachments/...`; OS dialog automation fell back to packaged IPC. |
| 12 | Add tag/category to item | Pass with caveat | Category applied; item tag affordance was not visible in this run. |
| 13 | Search created content | Pass with caveat | Query entered on Search page; packaged search API returned the created note. Synthetic form submit did not update route/results. |
| 14 | Save/open saved view or collection | Pass | Collection `PSE-206 Operator Smoke Collection` created/opened. |
| 15 | Use Today planning | Pass | Today showed the run-created planned task. |
| 16 | Open dashboard | Pass | Dashboard opened. |
| 17 | Open timeline/calendar | Pass | Timeline and Calendar opened. |
| 18 | Close/reopen packaged app | Pass | Packaged app restarted and same workspace opened via UI. |
| 19 | Confirm persistence after reopen | Pass | Project/contact/search/collection/attachment persisted after restart. |

## Screenshots

Major packaged-app screenshots are under:

`docs/manual-qa/screenshots/PSE-206-2026-05-16T00-14-23-908Z/`

Key files: `01-welcome.png`, `02-workspace-created.png`, `04-project-created.png`, `06-project-content-created.png`, `08-file-attached.png`, `11-collection-opened.png`, `12-today-planning.png`, `13-dashboard.png`, `14-timeline.png`, `15-calendar.png`, `17-persistence-project.png`, `18-persistence-search.png`.

## Issues found

| Severity | Issue | Evidence | Follow-up |
| --- | --- | --- | --- |
| P2 | Relationship UI was exercised, but final summary did not confirm persisted contact relationship (`relatedCount: 0`). | `07-relationships-linked.png`; `PSE-206-run-summary.json`. | Add focused relationship UI persistence follow-up if owner requires OR-R1 to include persisted relationship proof beyond existing smoke/API evidence. |
| P2 | Attachment OS file dialog could not be completed by the automation harness; packaged IPC fallback verified workspace-relative storage. | `attachmentVerify.ok: true`; stored under workspace `attachments/...`, not app bundle. | Manual human file-dialog spot-check recommended in backup/restore/manual file QA. |
| P3 | Item tag affordance was not visible in the project item view; category controls were visible and used. | `09-tag-category-inspector.png`. | UX polish follow-up; not a PSE-212 blocker. |
| P3 | Search page accepted query text, but synthetic submit did not update UI route/results; packaged search API verified the created note. | `10-search-results-saved.png`; `uiSearchApiCheck`. | Manual human click/Enter spot-check recommended. |

No P0/P1 issue was found in this successful rerun.

## Operator-facing friction

- Quick Start now opens the created project/contact, resolving the prior PSE-212 dead end.
- Tags vs categories are not obvious: category controls are visible, but item tag entry was not discoverable in this path.
- Relationship and search controls should receive a human spot-check because the automation harness could not conclusively prove their persisted UI behavior despite packaged API/state evidence.

## Runbook sufficiency

The runbook is sufficient for an internal technical operator to complete the packaged journey with the caveats above. It is not enough to declare full nontechnical Operator ready because the remaining readiness gates (backup/restore UI, no-network monitor, packaged UI performance) are still open.

## Gate decision

OR-R1: **Closed with caveats** for the original packaged-app operator journey blocker. PSE-212 is resolved by this rerun. Overall Operator-ready verdict remains **not yet** until OR-R2/OR-R3/OR-R4 are complete.

## Post-run validation

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm lint` | Pass | Ran after PSE-212 code changes. |
| `pnpm typecheck` | Pass | Ran after PSE-212 code changes. |
| `pnpm --filter @local-work-os/desktop test -- tests/renderer/quickAddModal.test.tsx tests/renderer/projectsPage.test.tsx` | Pass | Focused renderer regression coverage. |
| `pnpm package` | Pass | Rebuilt current packaged artifact. |
| `pnpm package:smoke` | Pass | Includes package data-boundary and normal packaged welcome-window launch. |
| `node C:\tmp\pse206-runner.mjs` | Pass with caveats | Packaged app journey completed and persisted after restart. |
| `pnpm test` | Pass | Full suite: 226 files / 868 tests. |
| `pnpm build` | Pass | Full workspace build passed. |
