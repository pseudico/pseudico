# PSE-209 Packaged UI Performance Evidence

Ticket: PSE-209 - PSE-OR-014 packaged UI scale and responsiveness evidence
Date/time: 2026-05-16 12:05-12:06 Australia/Sydney (run started 2026-05-16T02:05:13.399Z)
Result: **Pass with caveats** - OR-R4 can close with packaged UI evidence; no P0/P1 freeze/crash/no-feedback blocker was observed.

## Environment

| Field | Value |
| --- | --- |
| OS | Microsoft Windows NT 10.0.26200.0, x64 |
| Machine | ASUSV16-V3607VH |
| CPU | Intel64 Family 6 Model 186 Stepping 2, GenuineIntel; 16 logical processors |
| Memory | 32,363.51 MB total physical memory; 17,488.51 MB available before fixture prep measurement |
| App artifact | `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe` |
| Artifact size / modified | 222973952 bytes / 2026-05-15T23:48:18.425Z |
| UI harness | Packaged Electron executable launched with local `--remote-debugging-port=9369`; CDP drove the real packaged renderer and captured screenshots. |
| Raw run summary | `docs/manual-qa/PSE-209-run-summary.json` |
| Screenshots | `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/` |

## Fixture/loading method

1. Ran `pnpm benchmark:large -- --sizes=1000,10000 --out=docs/performance/reports/pse-209-fixtures.json --keep` to retain PSE-203-compatible 1k/10k SQLite fixtures. The first sandboxed attempt failed at `electron-vite build` with `spawn EPERM`; the command passed when rerun with approved local escalation.
2. Copied retained benchmark workspaces under `.tmp/PSE-209-2026-05-16T01-57-21-630Z/`, added `workspace.json` manifests and required workspace folders, then augmented locally with contacts, tags/categories, and small attachment files.
3. Marked migration version 1 in the copied fixture databases because the benchmark script applies the initial schema directly; the packaged app then applied normal pending migrations on first open.
4. Opened each fixture through the packaged Welcome screen path field and `Open workspace` button. Measurements below are UI wall-clock timings from route/action start until visible rendered text or completion feedback appeared.

## Workspace size summary

| Size | Fixture path | Projects | Contacts | Items | Tasks | Notes | Lists | List rows | Tags | Categories | Attachments | Search records | Activity events |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | .tmp/PSE-209-2026-05-16T01-57-21-630Z/workspace-1000 | 100 | 250 | 1020 | 800 | 100 | 100 | 300 | 60 | 60 | 20 | 1270 | 1270 |
| 10000 | .tmp/PSE-209-2026-05-16T01-57-21-630Z/workspace-10000 | 100 | 250 | 10020 | 8000 | 1000 | 1000 | 3000 | 60 | 60 | 20 | 10270 | 10270 |

Representative attachments were intentionally small text files to prove attachment UI/storage presence without adding excessive disk use.

## Measurement methods

- Startup: packaged executable spawn to CDP page ready, `window.localWorkOs` present, and Welcome text visible.
- Workspace open: Welcome path field plus `Open workspace` click until `/workspace` displayed the fixture path.
- Search/Dashboard/Today/Timeline/Calendar: hash-route navigation until expected page/widget/lane text was visible, with screenshot captured after a short settle.
- Project/contact responsiveness: opened seeded detail routes; project feed was scrolled for 36 `requestAnimationFrame` ticks and max/average frame interval recorded.
- Backup/export/maintenance: Settings UI buttons (`Create backup`, `Export JSON`, `Rebuild search index`) until visible completion/status text appeared; disabled/busy or text-change feedback was recorded separately.
- Memory: Windows `Get-Process -Name 'Local Work OS'` summed working set/private memory across the packaged process tree after key milestones.

## Measurements

| Size | Action | UI elapsed | Method | Gate result | Notes |
| --- | --- | ---: | --- | --- | --- |
| App | startup_to_welcome | 448.52 ms | spawn packaged exe to CDP page ready and welcome text visible | Pass |  |
| 1000 | workspace_open_from_welcome | 166.22 ms | welcome path field + Open workspace click to /workspace showing fixture path | Pass |  |
| 1000 | search_fixture_first_results | 12.67 ms | hash route /search?q=fixture to first rendered result/empty state | Pass |  |
| 1000 | dashboard_load | 102.27 ms | hash route /dashboard until widget text visible | Pass |  |
| 1000 | today_load | 8.87 ms | hash route /today until lane/planner text visible | Pass |  |
| 1000 | timeline_load | 22.11 ms | hash route /timeline until title/filter text visible | Pass |  |
| 1000 | calendar_load | 9.86 ms | hash route /calendar until title/month text visible | Pass |  |
| 1000 | project_feed_open_and_scroll | 156.80 ms | open large project detail then RAF scroll 36 frames | Pass | RAF scroll max 14 ms, avg 6.92 ms; scrollY 10804.8 / height 11765 |
| 1000 | contact_detail_load | 93.44 ms | open seeded contact detail route | Pass |  |
| 1000 | settings_create_backup | 165.72 ms | Settings UI Create backup button to completion message/list row | Pass | Busy/disabled or status change observed: True |
| 1000 | settings_export_json | 171.85 ms | Settings UI Export JSON button to completion message | Pass | Busy/disabled or status change observed: True |
| 1000 | settings_rebuild_search_index | 254.37 ms | Settings UI Rebuild search index button to maintenance completion/log | Pass | Busy/disabled or status change observed: True |
| 10000 | workspace_open_from_welcome | 247.99 ms | welcome path field + Open workspace click to /workspace showing fixture path | Pass |  |
| 10000 | search_fixture_first_results | 5.40 ms | hash route /search?q=fixture to first rendered result/empty state | Pass |  |
| 10000 | dashboard_load | 191.97 ms | hash route /dashboard until widget text visible | Pass |  |
| 10000 | today_load | 6.51 ms | hash route /today until lane/planner text visible | Pass |  |
| 10000 | timeline_load | 191.41 ms | hash route /timeline until title/filter text visible | Pass |  |
| 10000 | calendar_load | 465.49 ms | hash route /calendar until title/month text visible | Pass |  |
| 10000 | project_feed_open_and_scroll | 514.73 ms | open large project detail then RAF scroll 36 frames | Pass | RAF scroll max 12.41 ms, avg 7.07 ms; scrollY 23414.4 / height 44633 |
| 10000 | contact_detail_load | 26.08 ms | open seeded contact detail route | Pass |  |
| 10000 | settings_create_backup | 170.05 ms | Settings UI Create backup button to completion message/list row | Pass | Busy/disabled or status change observed: True |
| 10000 | settings_export_json | 67.46 ms | Settings UI Export JSON button to completion message | Pass | Busy/disabled or status change observed: True |
| 10000 | settings_rebuild_search_index | 1797.14 ms | Settings UI Rebuild search index button to maintenance completion/log | Pass | Busy/disabled or status change observed: True |

Pass/fail above uses the packaged UI blocker policy in `docs/PERFORMANCE_SCALE_QA.md`: no >10s unresponsive window without progress, no crash, no missing recovery/completion state for long local jobs, and no observed runaway memory cycle. These UI timings are intentionally separate from service-level budgets in `docs/PERFORMANCE.md`.

## Memory observations

| Milestone | Process count | Working set MB | Private MB |
| --- | ---: | ---: | ---: |
| before_launch | 0 | 0 | 0 |
| after_startup | 4 | 405.68 | 274.12 |
| after_open_1000 | 4 | 442.14 | 306.45 |
| after_search_1000 | 4 | 508.55 | 365.49 |
| after_dashboard_1000 | 4 | 530.7 | 380.54 |
| after_today_1000 | 4 | 729.26 | 579.86 |
| after_project_scroll_1000 | 4 | 886 | 734.89 |
| after_backup_1000 | 4 | 854.79 | 703.16 |
| after_export_1000 | 4 | 860.01 | 708.25 |
| after_rebuild_1000 | 4 | 864.05 | 713.15 |
| after_open_10000 | 4 | 872 | 718.75 |
| after_search_10000 | 4 | 874.88 | 721.3 |
| after_dashboard_10000 | 4 | 877.83 | 724.21 |
| after_today_10000 | 4 | 2285.14 | 2138.59 |
| after_project_scroll_10000 | 4 | 2287.11 | 2136.43 |
| after_backup_10000 | 4 | 2279.22 | 2128.01 |
| after_export_10000 | 4 | 2306.84 | 2157.12 |
| after_rebuild_10000 | 4 | 2314.27 | 2187.47 |
| after_shutdown_attempt | 0 | 0 | 0 |

Memory caveat: the 10k Today route increased summed packaged working set from about 878 MB after Dashboard to about 2.29 GB after Today. The app remained responsive and later actions did not show continuous growth in this single run, but this is a P2 follow-up candidate for Today renderer/windowing or payload bounding before broad low-memory-machine handoff.

## UX responsiveness observations

- Startup and workspace open were visibly quick; Welcome and Workspace pages were understandable during the run.
- Search showed a bounded first page (`30 results`) for `fixture`; no unbounded result dump was visible.
- Dashboard widgets loaded with recognizable widget sections and bounded visible lists.
- Today/Timeline/Calendar loaded without a visible freeze. Today is the main caveat because of the 10k memory jump.
- Project feed scrolling stayed smooth in the harness: 10k project feed RAF max frame interval was 12.41 ms and average was 7.07 ms while scrolling a tall rendered feed.
- Settings backup/export/search rebuild actions exposed busy/disabled or status text changes and completion messages; no double-submit/no-recovery state was observed.
- No app crash, blank window, confusing empty-state during load, or unresponsive click lasting over 10 seconds was observed.

## Screenshots/logs

Final run screenshots are under `docs/manual-qa/screenshots/PSE-209-2026-05-16T02-05-13-399Z/`. Useful files include:

- `00-startup-welcome.png`
- `01-1000-workspace-open.png`, `02-10000-workspace-open.png`
- `01-1000-search-fixture.png`, `02-10000-search-fixture.png`
- `01-1000-dashboard.png`, `02-10000-dashboard.png`
- `01-1000-today.png`, `02-10000-today.png`
- `01-1000-project-feed-after-scroll.png`, `02-10000-project-feed-after-scroll.png`
- `01-1000-backup-created.png`, `02-10000-backup-created.png`
- `01-1000-export-json.png`, `02-10000-export-json.png`
- `01-1000-search-rebuild.png`, `02-10000-search-rebuild.png`

Raw JSON logs:

- `docs/manual-qa/PSE-209-run-summary.json`
- `docs/manual-qa/PSE-209-fixture-summary.json`
- `docs/performance/reports/pse-209-fixtures.json`

## Comparison with PSE-203 service benchmark

PSE-203 remains service/SQL evidence only; PSE-209 adds packaged renderer and Settings UI evidence on the same 1k/10k scale class.

| Size | PSE-203 open | PSE-203 search | PSE-203 dashboard | PSE-203 Today | PSE-203 export | PSE-203 RSS after |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | 0.3 ms | 0.93 ms | 0.77 ms | 0.43 ms | 18.04 ms | 65.41 MB |
| 10000 | 1.34 ms | 9.98 ms | 5.45 ms | 5.17 ms | 173.67 ms | 160.85 MB |

Packaged UI timings are naturally higher/different because they include renderer route transitions, React rendering, CDP observation, screenshots, and visible Settings actions. They do not replace the service budgets; they confirm that the packaged UI remained usable and understandable at representative larger workspace sizes.

## Findings

| Severity | Finding | Evidence | Follow-up |
| --- | --- | --- | --- |
| P2 | 10k Today route has high packaged-app memory headroom requirement. | Working set rose from ~877.83 MB after 10k Dashboard to ~2,285.14 MB after 10k Today; app stayed responsive and settled around 2.3 GB. | Focused follow-up to bound/window Today lanes or reduce renderer payload before low-memory nontechnical handoff. |
| P3 | CDP harness was used for repeatable packaged UI measurement. | App was still the packaged executable, but launched with local `--remote-debugging-port=9369`. | Repeat one purely hands-on stopwatch run if owner wants non-automation corroboration. |
| P3 | Benchmark fixtures needed manifest/migration adaptation for packaged open. | PSE-203 harness produces service DBs; PSE-209 copied them, added manifests/folders, and marked migration 1 before packaged app applied pending migrations. | Consider adding a documented `--keep-workspace-manifest` benchmark option later. |

No P0/P1 packaged UI performance blocker was found in this run.

## Final gate result

Final gate result: **Pass with caveats**.

- OR-R4 can be closed with this packaged UI evidence.
- Overall Operator-ready verdict must still wait for PSE-210 owner acceptance and any explicit owner decision on the P2 Today memory caveat.
- Next recommended ticket if no owner-blocking concern remains: PSE-210 owner acceptance.
