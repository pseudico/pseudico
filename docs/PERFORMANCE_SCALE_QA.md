# Performance Scale QA Report

PSE-203 / PSE-OR-008 adds operator-readiness evidence for large local workspaces. The product promise is not that every 100k-row path is instant; it is that an operator can tell the app is working, can keep using bounded pages, and can recover or escalate if a long local job is too slow.

## Current verdict

**Pilot ready for 1k/10k service-level scale, pending manual packaged UI confirmation.**

Automated evidence covers deterministic local SQLite fixtures and service-layer timings. Manual packaged-app QA is still required before declaring nontechnical operator handoff because perceived responsiveness depends on renderer, OS, disk, and machine profile.

## Automated evidence gate

Run:

```bash
pnpm benchmark:large -- --sizes=1000,10000 --out=docs/performance/reports/operator-readiness-pse-203.json
```

Release-candidate full gate:

```bash
pnpm benchmark:large -- --sizes=1000,10000,100000 --out=docs/performance/reports/full.json
```

The report is local-only and records environment, seed timing, operation timings, pass/fail budget status, row counts, and process memory snapshots. Do not upload it automatically or add telemetry.

### PSE-203 service benchmark evidence

Report: `docs/performance/reports/operator-readiness-pse-203.json`

Generated on 2026-05-15 against a local Windows workspace fixture. Both 1k and
10k service-level gates passed.

| Size | Open | Search | Dashboard | Today | Export | Memory RSS after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1k | 0.30 ms / 200 ms | 0.93 ms / 150 ms | 0.77 ms / 250 ms | 0.43 ms / 300 ms | 18.04 ms / 1,000 ms | 65.41 MB |
| 10k | 1.34 ms / 500 ms | 9.98 ms / 350 ms | 5.45 ms / 750 ms | 5.17 ms / 900 ms | 173.67 ms / 6,000 ms | 160.85 MB |

These timings are service/SQL timings, not packaged renderer measurements.
Manual UI QA below remains required before nontechnical handoff.

## Manual UI performance QA script

Use a packaged or production-like desktop build and a temporary local workspace. Prefer the same machine class expected for the operator handoff.

### Setup

1. Run the 1k/10k benchmark command and save the JSON report under `docs/performance/reports/`.
2. Create or retain a 1k and 10k local workspace fixture. If using the CLI, add `--keep` and note the retained `workspaceRoot` values from the report.
3. Open each workspace in the packaged app.
4. Keep an OS task manager/activity monitor visible for CPU and memory observations.
5. Do not enable optional network features; performance evidence must stay local-only.

### Checks for each 1k and 10k workspace

| Area | Operator action | Pass standard | Evidence to record |
| --- | --- | --- | --- |
| Startup/open | Open workspace from the workspace picker. | App becomes usable without looking frozen; workspace health is visible. | Approximate seconds, memory after open, visible loading state if delayed. |
| Search | Search for `fixture`. | First result page appears within the documented budget class; no unbounded result dump. | Seconds to first results, count shown/page size. |
| Dashboard | Open Dashboard. | Widgets show loading/empty/error states and bounded item lists. | Seconds to widgets, any frozen controls. |
| Today | Open Today planning. | Due/backlog/tomorrow sections load with readable loading state and bounded lists. | Seconds to usable view, slow section if any. |
| Project feed | Open a large project/container feed and scroll. | Feed uses virtualization/windowing; scrolling remains responsive. | Scrolling notes, max memory observed. |
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
- The 100k gate is intended for release-candidate validation, not every small PR.
- CPU and memory observations are local manual evidence, not telemetry.
- The benchmark fixture is deterministic but not a perfect copy of every future operator workspace.
