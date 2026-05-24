# PSE-267 — HRQA packaged evidence capture attempt

Date: 2026-05-23 (Australia/Sydney)  
Scope: packaged production-route evidence for remaining HRQA P2 gaps after PR #227 and PR #230.

## Environment

- Branch: `codex/pse-267-hrqa-packaged-evidence` from merged `main` at `d8d72fc7`.
- Package artifact: `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`.
- Workspace source: `C:\Users\AlastairLacey\Pseudico\.tmp\house-renovation-qa-20260522-v2`.
- Workspace used for capture: copied to `C:\tmp\Pseudico-pse267-house-renovation-workspace` to avoid mutating the original QA workspace.
- Packaged app launch used an isolated Chromium user data directory because the default user-data path could render an empty body under the local automation session.

## Commands / checks

- `pnpm install --frozen-lockfile` — passed.
- `pnpm package` — passed.
- `pnpm package:smoke` — passed.
- Packaged Welcome and `/workspace` route opened successfully against the copied household-renovation workspace.

## Capture results

| Issue | Route / workflow | Result |
| --- | --- | --- |
| PSE-250 | `#/search?q=retrospective` | Failed: after navigating from the packaged app to the production Search route, CDP `Runtime.evaluate` timed out while waiting for result text; a later attempt to screenshot after 10 seconds also timed out. |
| PSE-250 | `#/search?q=Painting%20weekend` | Not completed because the first Search route attempt froze/hung the packaged renderer/CDP session. |
| PSE-253 | `#/search?q=balcony` | Not completed because Search route screenshot capture timed out in the same route-capture harness. |
| PSE-252 | `#/today` | Failed: packaged route navigation did not reach the expected `Daily and weekly summary` / `Visible work lanes` text within the capture window. |

## Classification

- P0: none proven; no data loss or local-only/security violation observed.
- P1: packaged production-route evidence is blocked for Search/Today, so PSE-263 cannot close and PSE-264 should not start as a clean beta pass.
- P2: screenshot/manual evidence remains missing for PSE-250/PSE-252/PSE-253.

## Decision

Do not claim HRQA packaged evidence complete. The fresh package and smoke gate are healthy, but production-route capture failed for the exact remaining Search/Today workflows. Treat this as an active PSE-267 blocker and keep PSE-250/PSE-252/PSE-253 In Progress until a human-visible packaged route pass succeeds or a root-cause fix lands.

## Next actions

1. Debug packaged Search route freeze/hang on `retrospective` using the copied household-renovation workspace.
2. Debug packaged Today route not reaching expected metric labels.
3. Re-run PSE-267 capture and attach screenshots only after production routes visibly resolve.

## Clean beta handoff rerun � 2026-05-24

- Worktree: `C:\tmp\Pseudico-beta-candidate` on `codex/beta-candidate-handoff`.
- Base: `origin/main` / `55311c874a61d0417a297c8c126c50e667fe8d2f`.
- Package artifact: `C:\tmp\Pseudico-beta-candidate\apps\desktop\dist-packaged\win-unpacked\Local Work OS.exe`.
- Workspace copy: `C:\tmp\Pseudico-beta-handoff-house-renovation-workspace`.
- Fresh package, two package smoke runs, rebuild-after-smoke, release package check, and dependency audit passed.
- Packaged API preflight passed: direct Search IPC returned `retrospective` = 2 results, `Painting weekend` = 2 results, `balcony` = 30 results, and recent searches = 6.
- Production Search route evidence still failed: `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa/01-search-retrospective.png` shows `Searching local index...`, and later route captures timed out after Search route navigation.

### Classification update

- P0: none proven.
- P1: **PSE-268** created. Nontechnical beta handoff is blocked because packaged production Search routes do not yet produce reliable human-visible retrieval evidence.
- P2: PSE-250/PSE-253/PSE-267 packaged screenshots remain incomplete.

### Decision update

Do not proceed to final nontechnical beta candidate until PSE-268 is fixed and PSE-267 Search/Today evidence is rerun successfully or explicitly owner-accepted. Owner acceptance is not recommended for this blocker because Search is a primary retrieval workflow.
