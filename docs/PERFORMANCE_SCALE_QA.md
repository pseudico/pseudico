# Performance Scale QA Report

PSE-203 / PSE-OR-008 established service-layer large-workspace evidence.
PSE-209 added packaged-app UI evidence for representative 1k/10k local
workspaces. PSE-226 remains the focused follow-up for the 10k Today memory
caveat.

## Current verdict

**Internal pilot ready for 1k/10k scale with a P2 Today-memory caveat.**

Automated service evidence covers deterministic local SQLite fixtures and
service-layer timings. PSE-209 then exercised the packaged Windows app with
1k/10k fixtures through workspace open, search, dashboard, Today, timeline,
calendar, project feed scroll, contact detail, backup, export, and search
rebuild. No P0/P1 freeze, crash, unbounded result dump, or missing completion
state was observed.

Do not overclaim broad low-memory or nontechnical handoff readiness from this:
the 10k Today route increased summed packaged working set to roughly **2.29 GB**
in one run. That app stayed responsive, but the memory headroom requirement is a
P2 caveat tracked by PSE-226.

## Automated service evidence gate

Run:

```bash
pnpm benchmark:large -- --sizes=1000,10000 --out=docs/performance/reports/operator-readiness-pse-203.json
```

Release-candidate full gate:

```bash
pnpm benchmark:large -- --sizes=1000,10000,100000 --out=docs/performance/reports/full.json
```

The report is local-only and records environment, seed timing, operation
timings, pass/fail budget status, row counts, and process memory snapshots. Do
not upload it automatically or add telemetry.

### PSE-203 service benchmark evidence

Report: `docs/performance/reports/operator-readiness-pse-203.json`

Generated on 2026-05-15 against a local Windows workspace fixture. Both 1k and
10k service-level gates passed.

| Size | Open | Search | Dashboard | Today | Export | Memory RSS after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1k | 0.30 ms / 200 ms | 0.93 ms / 150 ms | 0.77 ms / 250 ms | 0.43 ms / 300 ms | 18.04 ms / 1,000 ms | 65.41 MB |
| 10k | 1.34 ms / 500 ms | 9.98 ms / 350 ms | 5.45 ms / 750 ms | 5.17 ms / 900 ms | 173.67 ms / 6,000 ms | 160.85 MB |

These timings are service/SQL timings, not packaged renderer measurements.
Use the PSE-209 evidence below for current packaged UI status.

## Packaged UI evidence (PSE-209)

Manual/packaged artifact: `docs/manual-qa/PSE-209-packaged-ui-performance.md`
Machine-readable run summary: `docs/manual-qa/PSE-209-run-summary.json`
Screenshots: `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/`

PSE-209 launched the actual packaged Electron executable with local CDP control,
opened retained 1k/10k fixtures, captured screenshots, and measured route/action
wall-clock times.

| Size | Action | UI elapsed | Result |
| --- | --- | ---: | --- |
| App | startup to Welcome | 448.52 ms | Pass |
| 1k | workspace open | 166.22 ms | Pass |
| 1k | search `fixture` first results | 12.67 ms | Pass |
| 1k | dashboard load | 102.27 ms | Pass |
| 1k | Today load | 8.87 ms | Pass |
| 1k | project feed open + scroll | 156.80 ms | Pass |
| 1k | create backup | 165.72 ms | Pass |
| 1k | export JSON | 171.85 ms | Pass |
| 1k | rebuild search index | 254.37 ms | Pass |
| 10k | workspace open | 247.99 ms | Pass |
| 10k | search `fixture` first results | 5.40 ms | Pass |
| 10k | dashboard load | 191.97 ms | Pass |
| 10k | Today load | 6.51 ms | Pass with memory caveat |
| 10k | project feed open + scroll | 514.73 ms | Pass |
| 10k | create backup | 170.05 ms | Pass |
| 10k | export JSON | 67.46 ms | Pass |
| 10k | rebuild search index | 1797.14 ms | Pass |

Memory observation from the same run:

| Milestone | Working set MB | Private MB |
| --- | ---: | ---: |
| after 10k Dashboard | 877.83 | 724.21 |
| after 10k Today | 2285.14 | 2138.59 |
| after later 10k rebuild | 2314.27 | 2187.47 |

The app remained responsive and did not show continuous growth in that single
run, but this memory jump is not acceptable to hide behind a simple pass/fail.
Before broader low-memory handoff, complete PSE-226 by bounding Today loading,
adding a clear operator cap/mitigation, or recording owner acceptance.

## Manual UI performance QA script

Use this script for future release-candidate runs or when PSE-226 changes Today
loading. Use a packaged or production-like desktop build and a temporary local
workspace. Prefer the same machine class expected for the operator handoff.

### Setup

1. Run the 1k/10k benchmark command and save the JSON report under
   `docs/performance/reports/`.
2. Create or retain a 1k and 10k local workspace fixture. If using the CLI, add
   `--keep` and note retained `workspaceRoot` values from the report.
3. Open each workspace in the packaged app.
4. Keep an OS task manager/activity monitor visible for CPU and memory observations.
5. Do not enable optional network features; performance evidence must stay local-only.

### Checks for each 1k and 10k workspace

| Area | Operator action | Pass standard | Evidence to record |
| --- | --- | --- | --- |
| Startup/open | Open workspace from the workspace picker. | App becomes usable without looking frozen; workspace health is visible. | Approximate seconds, memory after open, visible loading state if delayed. |
| Search | Search for `fixture`. | First result page appears within the documented budget class; no unbounded result dump. | Seconds to first results, count shown/page size. |
| Dashboard | Open Dashboard. | Widgets show loading/empty/error states and bounded item lists. | Seconds to widgets, any frozen controls. |
| Today | Open Today planning. | Due/backlog/tomorrow sections load with readable loading state and bounded lists; memory headroom is recorded. | Seconds to usable view, slow section if any, process memory before/after. |
| Project feed | Open a large project/container feed and scroll. | Feed uses virtualization/windowing or bounded sections; scrolling remains responsive. | Scrolling notes, max memory observed. |
| Contact feed | Open contacts/contact detail where applicable and scroll linked items/timeline. | Lists remain bounded or virtualized; loading indicators are understandable. | Seconds and any jank. |
| Backup | Create a manual backup. | Operation shows progress/busy feedback or clear completion/failure message. | Duration, backup path, error if any. |
| Export | Export workspace JSON / supported bundle. | Operator sees busy/completion feedback; output file appears where expected. | Duration, export path, file size. |
| Maintenance | Run search rebuild/integrity checks. | Long-running job reports status and logs result; app remains recoverable. | Duration and final maintenance log status. |

## Blocker policy

Create a separate P0/P1 fix ticket if any of these occur:

- App window becomes unresponsive for more than 10 seconds without loading/progress text.
- Search, Dashboard, or Today loads unbounded full result sets into the renderer.
- Backup/export/maintenance can be started twice concurrently without a clear disabled/busy state.
- A long-running local job fails without an operator-readable error or recovery instruction.
- Memory grows continuously after repeated open/search/dashboard cycles and does not settle after closing the workspace.

## Existing automated UI evidence

- `packages/ui/tests/virtualizedFeed.test.tsx` verifies large item, grouped result, and activity lists are windowed instead of rendering every row.
- `packages/ui/tests/itemComponents.test.tsx` verifies loading, error, empty, and populated feed states.
- `packages/features/tests/largeWorkspaceBenchmarkService.test.ts` verifies benchmark budgets and deterministic service-level report behavior.
- `packages/features/tests/collectionService.test.ts` verifies large collection pagination preserves total count without rendering every result at once.

## Known limitations

- The service benchmark is not a substitute for packaged UI measurement.
- PSE-209 is packaged/CDP evidence, not a purely hands-on stopwatch run.
- The 10k Today memory jump is tracked by PSE-226 and should be treated as a P2 caveat until fixed or explicitly accepted.
- The 100k gate is intended for release-candidate validation, not every small PR.
- CPU and memory observations are local manual evidence, not telemetry.
- The benchmark fixture is deterministic but not a perfect copy of every future operator workspace.
