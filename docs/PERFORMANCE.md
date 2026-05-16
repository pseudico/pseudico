# Performance

Local Work OS treats large local workspaces as a supported operating mode. The
large-workspace benchmark harness measures service-layer flows against generated
SQLite workspaces without telemetry, network upload, or cloud dependencies.

## Large workspace budgets

Budgets are defined in `packages/features/src/performance/` and are enforced by
the local benchmark report as pass/fail thresholds.

| Workspace size | Open | Search | Dashboard | Today | Workspace JSON export |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1k items | 200 ms | 150 ms | 250 ms | 300 ms | 1,000 ms |
| 10k items | 500 ms | 350 ms | 750 ms | 900 ms | 6,000 ms |
| 100k items | 1,500 ms | 1,000 ms | 2,000 ms | 3,000 ms | 45,000 ms |

The budgets focus on service-level operations:

- **Open**: workspace row lookup plus bounded startup counts.
- **Search**: indexed search and hydration for the first 25 results.
- **Dashboard**: default local widget data pages.
- **Today**: due/backlog/tomorrow planning projections and summary data.
- **Export**: in-memory workspace JSON assembly; file writes are outside this
  benchmark.

## Operator-readiness QA

`PERFORMANCE_SCALE_QA.md` contains the release-candidate manual UI script for
1k/10k workspaces, the 100k full-gate guidance, loading/progress expectations,
and the P0/P1 blocker policy for scale issues.

## Running the benchmark

Build packages first, then run the local-only benchmark script:

```bash
pnpm benchmark:large -- --sizes=1000,10000 --out=docs/performance/reports/latest.json
```

The full release-gate run is:

```bash
pnpm benchmark:large -- --sizes=1000,10000,100000 --out=docs/performance/reports/full.json
```

Generated workspaces are created in the OS temporary directory and deleted after
each size finishes. Add `--keep` to keep the generated local workspace folders
for manual inspection.

For PSE-203 operator-readiness evidence, save the 1k/10k report as:

```bash
pnpm benchmark:large -- --sizes=1000,10000 --out=docs/performance/reports/operator-readiness-pse-203.json
```

The report records local environment details, seed timing, operation timing,
budget status, row counts, and process memory snapshots. These are local QA
artifacts only; do not add telemetry or remote reporting.

## Fixture shape

The fixture utility seeds:

- project containers distributed across the workspace;
- task, note, and list items;
- task detail rows with date/priority data for Today and dashboard projections;
- note detail rows;
- checklist list rows;
- search index rows;
- activity log rows for seeded items.

This makes the benchmark closer to real workspace data than a flat item table
while keeping the fixture deterministic and local.

## Report artifacts

Benchmark reports are JSON files under `docs/performance/reports/`. The example
report documents the schema expected from `scripts/run-large-workspace-benchmark.mjs`.
Commit only intentional baseline/example reports; ad hoc local benchmark output
can be written elsewhere or left untracked.
