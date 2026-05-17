# PSE-226 Packaged Today Memory Bounding Evidence

Ticket: PSE-226 - Bound or document 10k-workspace Today memory usage before broader pilot
Date/time: 2026-05-18 07:38 Australia/Sydney (run generated 2026-05-17T21:38:56.901Z)
Result: **Pass** - the 10k Today route is now bounded for initial packaged UI loading, with operator-visible partial-data messaging and load-more control.

## Environment

| Field | Value |
| --- | --- |
| OS | Microsoft Windows NT 10.0.26200.0 |
| Node / pnpm | v22.21.1 / 10.25.0 |
| Branch / base | `codex/pse-226-today-memory` from `061aee8f870e598ac1795407cbeb45d12f083575` |
| App mode | Packaged Windows app with local CDP harness |
| App artifact | `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe` |
| Raw summary | `docs/manual-qa/PSE-226-packaged-today-memory-summary.json` |
| Screenshot | `docs/manual-qa/screenshots/PSE-226-packaged-today-memory/10k-today-bounded.png` |
| Service benchmark rerun | `docs/performance/reports/pse-226-main-remeasure.json` |

## Fixture and measurement method

1. Re-ran the local-only 1k/10k benchmark with `pnpm benchmark:large -- --sizes=1000,10000 --out=docs/performance/reports/pse-226-main-remeasure.json --keep`.
2. Prepared the retained 10k benchmark SQLite workspace for packaged-app opening by adding `workspace.json`, required workspace folders, and the initial migration marker.
3. Launched the packaged executable with a local remote-debugging port, opened the retained 10k workspace through the Welcome screen path field and `Open workspace` button, then visited Dashboard and Today.
4. Measured the packaged process tree working set/private memory using local Windows process APIs. No telemetry, network upload, or hosted service was used.

## Baseline service remeasurement on latest main

The service-level rerun on current `main`/PSE-226 base passed for both sizes.

| Size | Open | Search | Dashboard | Today | Export | RSS after |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1k | 0.19 ms / 200 ms | 0.57 ms / 150 ms | 0.43 ms / 250 ms | 0.23 ms / 300 ms | 10.79 ms / 1,000 ms | 56.05 MB |
| 10k | 0.60 ms / 500 ms | 5.01 ms / 350 ms | 3.00 ms / 750 ms | 2.37 ms / 900 ms | 99.14 ms / 6,000 ms | 146.08 MB |

This confirmed the memory pressure was not the service query itself; it was the packaged renderer receiving/rendering large Today lanes.

## Packaged Today result after bounding

| Milestone | Process count | Working set MB | Private MB |
| --- | ---: | ---: | ---: |
| Welcome rendered | 4 | 403.66 | 265.64 |
| 10k workspace opened | 4 | 445.46 | 303.31 |
| Dashboard rendered | 4 | 478.55 | 335.73 |
| Today rendered | 4 | 994.38 | 874.20 |

PSE-209 measured the same class of 10k Today route at about **2,285.14 MB** working set after Today. This PSE-226 run measured **994.38 MB**, a reduction of about **1.29 GB / 56%** on the same machine class.

## Operator-visible behavior

Today now loads the earliest 50 tasks per lane by default and shows clear counts/copy when a lane has more tasks:

- Today: `50/502`
- Tomorrow: `50/502`
- Backlog: `50/5019`
- Total rendered task cards: 150

The page displays: "Large Today list detected" and explains that the earliest tasks are loaded first so urgent due/overdue work stays visible. Each capped lane includes a "Show 50 more" control. This is an intentional cap, not hidden data.

## Correctness and safety notes

- Today service totals still count the complete due-today, tomorrow, and overdue/backlog lanes; the renderer receives a bounded first page plus lane totals.
- Sort order remains earliest due/start first, so urgent due and overdue tasks are not hidden behind later work.
- Due today, overdue, tomorrow/upcoming, completed-summary, reschedule, project/contact/tag/category-associated task behavior remains covered by Today service and renderer tests.
- The change is read-path only for Today view loading. Existing task/list mutation paths still use their existing services and reload Today after writes.
- No cloud sync, telemetry, hosted service, renderer filesystem access, or renderer SQLite access was added.

## Remaining caveats

| Severity | Finding | Disposition |
| --- | --- | --- |
| P2 | Loading beyond 500 tasks per lane remains intentionally capped. | Operator can use Search or narrower planning/backlog windows for very large lanes; broader virtualization/pagination can be future polish if needed. |
| P3 | Packaged run used a local CDP harness rather than a purely hands-on stopwatch. | Acceptable for repeatable internal pilot evidence; screenshot shows actual packaged UI. |

## Final gate

**Pass for internal pilot 10k Today memory bounding.** The prior P2 memory caveat is materially improved and becomes a documented large-lane cap/mitigation rather than a hidden high-memory requirement.
