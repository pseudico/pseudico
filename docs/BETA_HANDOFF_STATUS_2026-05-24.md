# Beta handoff status — 2026-05-24

## Verdict

**Go with explicit internal-beta caveats for nontechnical testers.** The PSE-268 Search-route blocker is fixed, the PSE-269 through PSE-274 guided Workflow beta loop is merged, and the workflow-enabled Windows unpacked package has package smoke, package metadata, dependency audit, workflow tests, GitHub CI, HRQA Search/Today evidence, and packaged Workflow evidence.

This is **not** a public release: the build is unsigned, unpacked, manually distributed, and has no installer, auto-update, public support process, or signing/notarization.

## Candidate under test

- Worktree used for latest package evidence: `C:\tmp\pse-269-review-merge`
- Merged code: `origin/main` at `6c7ce43dc3583d8be89ee34936dc460fa49690ae`
- Package folder: `C:\tmp\pse-269-review-merge\apps\desktop\dist-packaged\win-unpacked`
- Run: `C:\tmp\pse-269-review-merge\apps\desktop\dist-packaged\win-unpacked\Local Work OS.exe`
- Executable SHA-256: `6f4886ad03ab6f097d8adaceb419535d1c13eb5202ee53eaf76e629585d06cb9`
- app.asar SHA-256: `3d144627764840e218b27b2eee86bdfa9cf32bb663d25d30b90cc1612f968b66`
- Artifact metadata: `docs/release/package-artifact-check.json`

## Gates and evidence now in scope

| Gate / evidence | Result | Notes |
| --- | --- | --- |
| GitHub CI for PR #235 | Pass | `lint / typecheck / test / build` passed before merge. |
| `pnpm package:smoke` | Pass | Re-run against workflow-enabled package on 2026-05-24. |
| `pnpm release:package-check` | Pass | Final workflow-enabled checksums are listed above. |
| `pnpm audit:dependencies` | Pass with 1 warning | Existing `simple-get` network-capable dependency remains documented and outside normal runtime. |
| Guided workflow service tests | Pass | `guidedWorkflowService.test.ts` coverage includes template, mutation-free preview, execution, activity/search/run-history, optional input, invalid input, and blocked preview behavior. |
| Guided workflow renderer test | Pass | `workflowsPage.test.tsx` covers nontechnical UI copy and preview/confirmation/history states. |
| HRQA Search/Today evidence | Pass | PSE-268 rerun remains valid for Search route and Today route behavior. |
| Packaged guided Workflow evidence | Pass with caveats | WF-006 captured select -> preview -> confirm -> result -> search/history -> restart evidence using a safe copy of the household renovation workspace. |

## Evidence captured

Search/Today beta evidence:

- `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa-fixed-scrolled-route-evidence.json`
- `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa-fixed-scrolled/`

Guided Workflow beta evidence:

- `docs/WORKFLOWS_BETA_CONTRACT.md`
- `docs/manual-qa/workflow-beta-evidence-2026-05-24.md`
- `docs/manual-qa/WF-006-guided-workflows-beta.md`
- `docs/manual-qa/screenshots/WF-006-guided-workflows-beta-2026-05-24T08-10-32-915Z/`

## Workflow beta decision

Workflows are no longer scaffold-only for this internal beta. They are **beta-supported with caveats** for predefined guided local household-renovation workflows only:

1. Project review workflow.
2. Contact follow-up workflow.
3. Approval / decision review workflow.

Workflow caveats:

- No arbitrary scripting.
- No background automation or scheduling.
- No webhooks, cloud sync, accounts, telemetry, hosted services, public sharing, or team workflows.
- No broad user-authored workflow builder.
- Preview is read-only; execution requires explicit confirmation.

## Decision and caveats

Proceed with a controlled nontechnical internal beta handoff using `docs/NONTECHNICAL_BETA_HANDOFF_DRAFT.md` as the tester-facing handoff note.

Required caveats to include with the handoff:

1. Unsigned unpacked Windows development package; Windows warnings are expected.
2. No installer, auto-update, public signing/notarization, or public support process.
3. Testers must keep workspace folders outside the app/package folder.
4. Testers must run an in-app backup before importing real data or moving to a newer build.
5. Optional network-capable features remain off by default; no packaged OS firewall/no-network monitor was run in this pass, so public-release local-only claims still require that manual monitor.
6. Workflows are limited to the predefined guided beta templates and must not be presented as broad automation.

## Required human action before sending

Owner should copy or zip the entire workflow-enabled `win-unpacked` folder, include the tester handoff note, and explicitly accept the unsigned/internal-beta caveats above. No P0/P1 blocker remains from this review.
