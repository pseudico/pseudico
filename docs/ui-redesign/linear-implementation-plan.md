# Space-budget UI implementation Linear plan

This file records the Linear ticket pack created from the option-10 space-budgeted operator UI pass.

## Ticket standard observed

Recent Pseudico Linear tickets use a strong implementation-ready format:

- Problem
- Evidence to read first
- Goal
- Scope
- Out of scope
- Architecture / safety constraints where relevant
- Acceptance criteria
- Tests / QA
- PR / Linear update requirements where relevant
- Done means
- Labels for area/risk/quality/agent/type
- Parent/related issue structure for programs and exit gates

The SBUX tickets follow that standard and keep the same emphasis on screenshots, manual QA, validation commands, and local-only constraints.

## Program

- PSE-230 — SBUX program: Implement space-budgeted operator UI across Pseudico

## Child tickets

| Issue | Purpose | Notes |
| --- | --- | --- |
| PSE-231 | Shared UI primitives and long-data guardrails | Foundation for route work. |
| PSE-232 | App shell, command/search, Quick Add, navigation | Blocked by PSE-231. |
| PSE-233 | Today planning readable lanes and rapid capture | Blocked by PSE-231/PSE-232. |
| PSE-234 | Project detail mixed-content work container | Blocked by PSE-231/PSE-232. |
| PSE-235 | Search, Collections, saved views command surface | Blocked by PSE-231/PSE-232. |
| PSE-236 | Timeline, calendar, pipeline readable planning | Blocked by PSE-231/PSE-232. |
| PSE-237 | Workspace home, dashboard, projects library | Blocked by PSE-231/PSE-232. |
| PSE-238 | Contacts and maintenance routes | Blocked by PSE-231/PSE-232. |
| PSE-239 | Final acceptance/regression review | Blocked by PSE-231 through PSE-238. |

## Implementation sequence

1. PSE-231: create the primitives and long-data fixtures.
2. PSE-232: fix the persistent shell so every route inherits usable command/capture/navigation space.
3. PSE-233 through PSE-238: implement route families in parallel or in priority order.
4. PSE-239: run the exit review against real rendered production UI.

## Core principle carried forward

Information expectation determines container size. If a task title, note, filename, path, search query, or calendar event cannot fit the available component, the design must change pattern rather than shrink text into nonsense.
