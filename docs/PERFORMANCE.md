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

## Running the benchmark

Build packages first, then run the local-only benchmark script:

```bash
pnpm benchmark:large -- --sizes 1000,10000 --out docs/performance/reports/latest.json
```

The full release-gate run is:

```bash
pnpm benchmark:large -- --sizes 1000,10000,100000 --out docs/performance/reports/full.json
```

Generated workspaces are created in the OS temporary directory and deleted after
each size finishes. Add `--keep` to keep the generated local workspace folders
for manual inspection.

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
