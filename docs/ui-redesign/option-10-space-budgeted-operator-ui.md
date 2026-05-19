# Option 10 - Space-Budgeted Operator UI

## Design thesis

This pass is built from information budgets first. The page structure is allowed to look plain because the purpose is to prove that the operator can read, enter, move, inspect, and act on realistic Pseudico data before colour, ornament, or final visual identity are considered.

## What changed from earlier passes

- Timeline bars no longer try to carry full task titles when they are narrow.
- Today tasks use readable rows with two-line title allowance and explicit move/snooze/open actions.
- Quick capture inputs are wide and tall enough for real multi-line capture.
- Project detail prioritises a readable mixed feed and inspector instead of decorative cards.
- Search uses a command-sized input, filter rail, readable results, and a preview/why-matched panel.
- At 1280px the project outline collapses before the feed or inspector becomes unusable.

## Space-budget decisions

| Surface | Budget applied |
| --- | --- |
| Workspace pinned work | Cards remain wide enough for title, one next-action line, and status. |
| Today rapid input | Minimum multiline capture area, not a small single-line field. |
| Today columns | Today gets the widest work column; Tomorrow/Backlog remain readable; inspector is fixed-width. |
| Project mixed feed | Central feed stays above 620px; outline collapses at small widths. |
| Project inspector | 340px desktop panel; long title/body fields get real text space. |
| Search | Command input targets 640px+; results remain central; preview explains match. |
| Timeline | 330px row label, 58px day cells, date/status bars. |

## Screenshot index

- `screenshots/option-10/01-workspace-home.png`
- `screenshots/option-10/02-today-planning.png`
- `screenshots/option-10/03-project-detail-mixed-feed.png`
- `screenshots/option-10/04-search-collections.png`
- `screenshots/option-10/05-timeline-calendar.png`

## Critical self-review

This is not visually final. It is intentionally a structural pass. It still needs better final typography, icons, selection/focus states, and a more distinctive local-work identity. The main success criterion is that real text and real inputs are no longer being forced into impossible boxes.

Risks:

- The light palette is serviceable but not yet emotionally strong.
- Some surfaces may feel more conventional than distinctive.
- Search and project detail still need richer selected-item behaviour.
- Timeline month/year modes need their own separate density rules.
- Contacts and maintenance pages are specified in the budget doc but not yet separately rendered.

## Implementation notes for later

Likely future tickets:

- Define reusable layout primitives: `ReadableTaskRow`, `InspectorPanel`, `CommandInput`, `MixedFeedItem`, `TimelineRow`.
- Add route-level responsive fallbacks based on space budgets.
- Add long-title fixture tests or screenshot assertions for Today, timeline, project feed, and search.
- Replace decorative buttons with real keyboard/action affordance states.
- Apply the same space-budget model to contacts, settings, backup/export/import, trash, and workflow lab.
