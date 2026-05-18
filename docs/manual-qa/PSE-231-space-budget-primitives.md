# PSE-231 manual QA — shared space-budget primitives

Date: 2026-05-18

## Scope

Hidden production renderer route fixture: `/space-budget-primitives`.

Evidence:

- `docs/manual-qa/screenshots/PSE-231-space-budget-primitives/01-space-budget-primitives-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-231-space-budget-primitives/02-space-budget-primitives-1280x800.png`

## Operator review

- Primary operator goal: prove shared primitives can hold realistic command,
  capture, task, note, file, link, inspector, and timeline data before route
  redesign tickets consume them.
- Visually dominant information: command/search input, multiline capture,
  readable primary task title, note context, filename/link identity, selected
  inspector title/body, and timeline row label.
- Secondary information: fallback-rule explanation rail; it is collapsed in
  the fixture before the primary row/inspector budgets shrink.
- Next safe action: `Capture locally` is visually distinct; `Clear` is
  secondary.
- Text/input sizing: command stays wide, capture textarea shows multiple real
  lines, and task/feed titles get two-line primary text allowance.
- Long-data behavior: long task title, note preview, filename extension,
  link/domain, path, tags, and timeline title are rendered from deterministic
  fixtures.
- 1280x800 behavior: secondary rail is absent; command and capture remain
  readable instead of shrinking into tiny controls.
- Feedback: parse/destination feedback is visible below capture.
- Local Work OS loop: fixture supports the upcoming route work by proving the
  shared readable surfaces, not by adding a new daily-work feature.

## Result

Pass with caveat: the route is intentionally hidden and fixture-only. It exists
to capture production-rendered evidence and to guide PSE-232+ route adoption.
