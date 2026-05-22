# PSE-250 — Search result loading fix evidence

- Route/workflow: production route `#/search?q=retrospective` and `#/search?q=Painting%20weekend`.
- Operator intent: retrieve completed renovation history and retrospective notes after project completion.
- Before: Search could show a count while the body remained in `Searching local index...`, leaving results unretrievable.
- Change: a new live search clears stale result state and count state before setting loading, then only marks the active query settled after the current response resolves.
- Realistic data asserted: `Retrospective: House Renovation and Fit-Out 2026`; `Painting weekend: prep and first coat @calendar`.
- Tests: `packages/features/tests/searchService.test.ts`; full `pnpm test`.
- Screenshot status: packaged CDP capture for this route timed out after the workspace-store automation step; no misleading screenshot is attached.
- Status: code/test pass; manual packaged screenshot remains P2 evidence follow-up before final operator handoff.
