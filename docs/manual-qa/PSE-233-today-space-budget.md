# PSE-233 manual QA — Today space-budget planning

Date: 2026-05-19

## Scope

Production renderer route evidence: `/today-space-budget-fixture`.

Evidence:

- `docs/manual-qa/screenshots/PSE-233-today/01-today-planning-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-233-today/02-today-planning-1280x800.png`
- `docs/manual-qa/screenshots/PSE-233-today/03-today-lanes-long-data-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-233-today/04-today-lanes-long-data-1280x800.png`
- `docs/manual-qa/screenshots/PSE-233-today/05-today-actions-1280x800.png`

## Operator review

- Primary job: capture realistic daily work, see Today/Tomorrow/Backlog groups,
  and complete, snooze, reschedule, move, remove, or open the source item.
- Dominant information: multiline capture fields, active lane/destination/due
  feedback, readable task title/body, destination, due date, planned lane, and
  safe next action.
- Secondary information: planning summary and preferences sit above the lanes
  but do not replace the task rows as the daily work surface.
- Next safe action: capture feedback says how to submit; task rows expose
  Today/Tomorrow/Remove, snooze presets, custom date, Complete/Reopen, and Open
  source without icon-only controls.
- Sizing: capture textareas are multi-line; Today lanes reserve a 420px target
  while Tomorrow/Backlog reserve 340px+ and wrap before shrinking primary text
  into unreadable cards.
- Long-data behavior: 18+ word titles, long note/body previews, long project
  names, overdue/backlog work, tomorrow work, and completed/reopen state remain
  visible in row context.
- 1280x800 behavior: shell collapses to icon rail and all three lanes remain
  readable; controls wrap to additional rows instead of becoming tiny buttons.
- Feedback: active lane, destination, due date, focus-count status, completion
  summary, and row state chips show what will happen or what changed.
- Local Work OS loop: route supports capture → plan → act/reschedule → recover
  overdue work without making dashboard/maintenance concerns visually primary.

## Result

Pass with caveat: screenshots use a hidden production renderer fixture for
deterministic long-data evidence; the route uses the same Today components as
the live `/today` screen, but fixture submissions are intentionally disabled
because no local workspace is open in that evidence route.
