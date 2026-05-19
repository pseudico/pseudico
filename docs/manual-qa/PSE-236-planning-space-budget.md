# PSE-236 manual QA — Timeline, Calendar, and Pipeline planning space budget

Date: 2026-05-19

Production-built renderer route evidence:

- `#/planning-space-budget-fixture`
- `#/planning-space-budget-fixture?surface=calendar`
- `#/planning-space-budget-fixture?surface=pipeline`

Evidence:

- `docs/manual-qa/screenshots/PSE-236-planning/01-timeline-planning-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-236-planning/02-timeline-planning-1280x800.png`
- `docs/manual-qa/screenshots/PSE-236-planning/03-calendar-agenda-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-236-planning/04-calendar-agenda-1280x800.png`
- `docs/manual-qa/screenshots/PSE-236-planning/05-pipeline-planning-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-236-planning/06-pipeline-planning-1280x800.png`
- `docs/manual-qa/screenshots/PSE-236-planning/07-timeline-row-detail-1280x800.png`
- `docs/manual-qa/screenshots/PSE-236-planning/08-calendar-agenda-detail-1280x800.png`

## Operator review

- Primary job: understand dated workload, calendar agenda, and pipeline stage movement without losing the full identity of the work.
- Dominant information: timeline row labels, selected timeline detail, calendar agenda rows, month cell workload counts/dots, and pipeline/kanban card titles.
- Secondary/hidden information: bars carry date/status only; month cells show compact count/dots; full detail lives in adjacent agenda/selected detail or source item.
- Next safe action: timeline rows and bars open/select source work; calendar items open source work; pipeline cards expose stage movement while preserving list mode as fallback.
- Sizing: timeline uses a 330px label gutter and 58px day budget; calendar week columns use 180px minimum and agenda fallback; pipeline/kanban columns use 280–320px horizontal-scroll lanes.
- Long-data behavior: long task titles, long project/container names, body previews, and metadata remain readable in row labels, agenda/detail, or cards rather than syllable-wrapped in bars/cells.
- 1280x800 behavior: shell nav collapses to icon rail; planning surfaces horizontally scroll or move agenda/detail below the primary view before shrinking primary text into tiny controls.
- Feedback: workload counts, selected timeline panel, calendar scheduled counts/dots, agenda rows, and stage/card counts show what is represented.
- Local Work OS loop: supports plan → inspect → open source work without adding cloud, account, telemetry, or remote search behavior.

## Acceptance reconciliation

- No syllable-wrapped timeline task labels: pass; titles live in fixed row labels/detail, not narrow bars.
- Day columns do not collapse below budget: pass; CSS sets 58px timeline day budget and horizontal scroll for the track.
- Long task title readable somewhere on same screen: pass; timeline selected detail/row labels and calendar agenda hold full long titles.
- Calendar and pipeline remain conventional and legible: pass; month/week/day calendar plus agenda; pipeline/kanban columns use standard horizontal-scroll lanes.
- 1280x800 fallback avoids nonsense text: pass; evidence includes 1280 screenshots and scrolled detail captures.

## Risks and notes

- P0/P1: none known.
- P2: screenshot evidence uses a hidden production renderer fixture for deterministic long-data data; live routes use the same production components and existing service/repository write paths.
- P3: future route-specific polish can add richer selected-item drawer behavior, but the ticket intentionally avoids domain/storage rewrites.

## Validation

- Targeted renderer tests passed for timeline, calendar, planning fixture, and readability styles.
- `pnpm --filter @local-work-os/desktop typecheck` passed.
- `pnpm --filter @local-work-os/desktop build` passed after rerunning outside the sandbox because Electron/Vite subprocess spawning was blocked by sandbox EPERM.
