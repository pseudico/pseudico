# PSE-215 Readability and Control Sizing Manual QA Evidence

Linked issue: PSE-215 — PSE-HUX-003: Readability and control sizing pass for primary work surfaces
Date: 2026-05-17

## Evidence method

Captured final UI states with the built desktop renderer stylesheet after the
PSE-215 sizing pass. The Settings screenshot was captured from the built
renderer route with a mocked local preload workspace. Project detail, Search,
Today, and large-font evidence use the same built renderer CSS and app shell
class structure with representative local work content so the visual sizing
changes are reviewable without changing database/service behavior.

## Screenshots

- Project detail / item cards / quick task input: `docs/manual-qa/screenshots/PSE-215-2026-05-17T06-20-00/01-project-detail-readability.png`
- Search input and result cards: `docs/manual-qa/screenshots/PSE-215-2026-05-17T06-20-00/02-search-results-readability.png`
- Today planner inputs and task cards: `docs/manual-qa/screenshots/PSE-215-2026-05-17T06-20-00/03-today-readability.png`
- Settings overview and controls: `docs/manual-qa/screenshots/PSE-215-2026-05-17T06-20-00/04-settings-readability.png`
- Large-font preference example on project surface: `docs/manual-qa/screenshots/PSE-215-2026-05-17T06-20-00/05-large-font-project-readability.png`

## Operator UX review

| Surface | Operator is trying to | Visually dominant | Secondary / advanced | Safe next action obvious? | Result |
|---|---|---|---|---|---|
| Project detail | Read project context and capture/review work beside it. | Long project title, quick task input, readable task/note cards. | Card metadata and More actions are available but not dominant. | Yes: Add task and card actions meet larger hit-target sizing. | Pass for sizing; broader project IA remains PSE-216. |
| Search | Enter a query and trust visible result context. | Large search input and result hierarchy: type, title, snippet, context. | Filters remain in the side panel. | Yes: Search and selectable result cards are comfortable. | Pass for sizing; deeper search trust remains PSE-217. |
| Today | Plan day from readable inputs and task cards. | Planner inputs and Today/Tomorrow/Backlog lanes. | Refresh and metadata chips are secondary. | Yes: lane cards and planner fields are larger. | Pass; no Today data/model behavior changed. |
| Settings | Adjust comfort/safety settings without cramped controls. | Operator-intent Settings overview and larger section tabs/buttons. | Advanced tools remain demoted from PSE-214 IA. | Yes: Backup & Restore remains discoverable. | Pass. |
| Large font | Confirm appearance preference still scales surfaces. | Same project surface with `font-large` class. | Compact mode remains available separately. | Yes: layout wraps rather than clipping long titles. | Pass. |

## Risks / follow-ups

- P1 project work hierarchy is still owned by PSE-216; this ticket only improves sizing/readability.
- P1 search trust and contextual grouping are still owned by PSE-217; this ticket only improves visual comfort.
- P2 evidence for Project/Search/Today uses a built renderer visual harness with real CSS rather than a packaged seeded workspace because this ticket changed styling only and avoided data/service changes.
