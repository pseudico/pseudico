# Primary Operator UX Acceptance Review (PSE-220)

Date: 2026-05-17 12:17 Australia/Sydney  
Linear: PSE-220 — PSE-HUX-008: Primary operator UX acceptance and regression review  
Scope: final acceptance/regression gate for PSE-213, PSE-214, PSE-215, PSE-216, PSE-217, PSE-218, and PSE-219.

## Verdict

**Verdict: pilot-ready for primary-operator handoff with documented P2/P3 caveats.**

PSE-220 did not identify any remaining P0/P1 blocker after the targeted regression fixes in this PR. The reviewed UI now supports a human primary operator through the core Local Work OS loop: capture, organise, connect, plan, review, search, keep files/notes beside work, and recover local data safely.

This is **not** a public-release certification. Packaging, accessibility, performance, and broader production hardening remain separate release gates.

## Regression fixes made during PSE-220

PSE-220 is primarily a review gate, but the final actual-app pass found narrow regressions that would have blocked a truthful acceptance verdict:

- **P1 fixed:** app tab strip consumed the main content area after multiple tabs because the shell grid only allocated two rows. The shell now reserves `top bar / tab strip / main content` rows explicitly.
- **P1 fixed:** container IPC handlers were registered without unwrapping the Electron invoke event, so container preferences APIs received the event object instead of the input. Contact detail rendered as “Contact not found” when preference loading failed. Container IPC registrations now forward `input` explicitly.
- **P1 fixed:** contact detail reused the two-column project header grid while rendering avatar, colour rail, identity, and actions; the name wrapped vertically. Contact detail now has a contact-specific grid.

These are targeted acceptance-regression fixes, not broad PSE-220 redesign work.

## Evidence produced

Final actual Electron UI screenshots are under:

`docs/manual-qa/screenshots/PSE-220-2026-05-17T02-17-15-998Z/`

| Surface | Evidence | Operator question answered | Result |
|---|---|---|---|
| Welcome / workspace open | `01-welcome.png` | Is the local-only boundary and next safe action clear? | Pass; recent-workspace list can still become noisy (P3). |
| Project detail | `02-project-detail.png` | Does project detail support living work: next work, linked context, content, activity? | Pass. |
| Contact detail | `03-contact-detail.png` | Can an operator understand a contact/client context and edit usable profile fields? | Pass after PSE-220 regression fixes. |
| Today | `04-today.png` | Can an operator plan the day quickly and recover task state? | Pass. |
| Dashboard | `05-dashboard.png` | Can an operator review workload and act from cards? | Pass. |
| Search | `06-search-results.png` | Are query, scope, grouping, and result context trustworthy? | Pass; duplicate file-result edge remains P3 from PSE-217. |
| Settings overview | `07-settings-overview.png` | Are settings organised by operator intent and are admin tools secondary? | Pass. |
| Backup / guided restore | `08-backup-restore.png` | Is restore guided, safe, and visibly non-destructive? | Pass; native OS folder picker still needs human OS-level confirmation (P2). |

Machine-readable evidence summary: `docs/manual-qa/PSE-220-final-acceptance-summary.json`.

## Primary-operator work loop assessment

| Work-loop need | Status | Evidence / notes |
|---|---|---|
| Capture quickly | Pass | Quick Start remains globally available; Today keyboard planner supports rapid day capture. |
| Organise by project/contact/inbox | Pass | Project and contact detail screens are readable and connected; Inbox remains part of the nav loop. |
| Connect related things | Pass | Project linked context and contact related-project flows remain visible and usable. |
| Plan the day | Pass | Today shows rapid planner, daily/weekly summary, and recovery lanes. |
| Review timelines/dashboards | Pass | Dashboard cards expose due, overdue, and upcoming actions with safe reschedule controls. |
| Find anything instantly | Pass | Search shows local scope, query chip, grouped results, and result-shape trust copy. |
| Keep files and notes beside work | Pass | Project detail shows content counts and work-focused linked/context areas; contact detail keeps fields and related work beside the person. |
| Recover local data safely | Pass with P2 caveat | Guided restore preview clearly creates a new workspace and refuses overwrites; OS folder chooser automation remains outside CDP evidence. |

## PSE-HUX ticket reconciliation

| Ticket | Acceptance result |
|---|---|
| PSE-213 — baseline audit | Complete; `docs/PRIMARY_OPERATOR_WORKFLOW_AUDIT.md` established the operator baseline and reusable evidence frame. |
| PSE-214 — Settings IA | Complete; Settings is intent-led, with imports/exports and advanced maintenance secondary. |
| PSE-215 — readability/sizing | Complete; final surfaces use larger controls, readable card spacing, and comfortable daily inputs. |
| PSE-216 — project living work loop | Complete; project detail is work-first with next work, task/content/activity, and linked context. |
| PSE-217 — search trust | Complete; search has visible local scope, result hierarchy, context, and useful trust copy. |
| PSE-218 — backup/restore | Complete; backup/restore is guided, non-destructive, and previewed before action. |
| PSE-219 — feedback/navigation | Complete after PSE-220 shell regression fix; tabs, recent navigation, toasts, and activity feedback no longer obscure the main workflow. |
| PSE-220 — acceptance gate | Complete pending PR/Linear reconciliation and final checks; review evidence and targeted regressions are included here. |

## Architecture and local-only safety confirmation

- No cloud sync, hosted account, telemetry, remote storage, billing, or collaboration scope was added.
- React code still uses preload/renderer API clients rather than direct SQLite access.
- Renderer code does not add Node filesystem access.
- Filesystem-sensitive backup/restore flows continue through Electron main/preload IPC.
- Electron sandbox/context isolation/disabled Node integration were not changed.
- The data-changing fixes in this PR are limited to correcting existing IPC routing and layout; no new write path was introduced by PSE-220.
- The container IPC fix restores repository/service-backed container preference access rather than bypassing it.

## Validation summary

| Check | Result |
|---|---|
| Targeted Vitest: `apps/desktop/tests/main/containerIpcRegistration.test.ts` and `apps/desktop/tests/renderer/readabilityStyles.test.ts` | Pass — 2 files, 4 tests. |
| `pnpm lint` | Pass. |
| `pnpm typecheck` | Pass. |
| `pnpm test` | Pass — 229 files, 883 tests. |
| `pnpm build` | Pass. |
| `pnpm package` | Fail — known packaging/tooling blocker: electron-builder refuses `packages/core/dist/.tsbuildinfo` as an unsafe pnpm-linked path outside the desktop package. |

## Risk register

| Severity | Risk | Owner / action |
|---|---|---|
| P0 | None remaining after this review. | No action. |
| P1 | None remaining after the tab-strip, container IPC, and contact header fixes in this PR. | Verify in CI/manual evidence. |
| P2 | `pnpm package` previously failed in the clean linked worktree because electron-builder refused a pnpm-linked `.tsbuildinfo` path outside the package. | Release/tooling follow-up; do not treat as operator UI failure, but it blocks packaged-artifact confidence if reproduced. |
| P2 | OS-native restore folder picker cannot be fully exercised through CDP screenshots. | Human packaged-app QA should confirm native dialog path selection. |
| P2 | This is a pilot-readiness UX gate, not full accessibility/performance/public-release certification. | Separate release gate. |
| P3 | Search can still show duplicate file rows when both item and attachment metadata match. | Search relevance polish follow-up. |
| P3 | Welcome recent-workspaces can accumulate noisy test/worktree entries. | Welcome recents cleanup/curation follow-up. |

## Recommended follow-up tickets

1. **Release packaging hardening:** fix electron-builder/pnpm linked-worktree package output so `pnpm package` passes from clean worktrees without unsafe symlink errors.
2. **Restore picker packaged QA:** human packaged-app confirmation of native restore folder chooser and restore-to-new-workspace flow.
3. **Search result dedupe polish:** collapse duplicate file rows when item and attachment metadata match the same local object.
4. **Welcome recent workspace curation:** hide missing/test workspaces or add cleanup affordance.

## Final acceptance checklist

- [x] Prior PSE-HUX outputs reviewed before changing code.
- [x] Actual app UI screenshots captured for required surfaces.
- [x] P0/P1 findings fixed or classified; no remaining P0/P1 accepted.
- [x] Architecture/local-only rules preserved.
- [x] Acceptance evidence documented.
- [ ] Final command results, PR status, Linear status, and merge state to be reconciled after validation.
