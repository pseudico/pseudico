# PSE-217 packaged search visual trust evidence

Linked issue: PSE-217 — PSE-HUX-005: Make search visually trustworthy for the primary operator  
Date: 2026-05-17

## Evidence method

Built the packaged Electron app from this branch and drove the real packaged
renderer through CDP against a fresh local workspace. The runner created a new
project plus newly created note, task, link, and attached file records containing
the token `PSE-217-visual-token`, verified the local search API returned those
records, then captured actual Search UI screenshots.

- Packaged app: `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`
- Run summary: `docs/manual-qa/PSE-217-packaged-search-summary.json`
- Screenshot folder: `docs/manual-qa/screenshots/PSE-217-2026-05-16T23-44-02-481Z/`

## Screenshots

- Packaged welcome: `docs/manual-qa/screenshots/PSE-217-2026-05-16T23-44-02-481Z/00-packaged-welcome.png`
- Top-bar Search button route proof with note/task/file/link visible: `docs/manual-qa/screenshots/PSE-217-2026-05-16T23-44-02-481Z/01-topbar-click-search-note-task-file-link.png`
- Top-bar Enter-key route proof with note/task/file/link visible: `docs/manual-qa/screenshots/PSE-217-2026-05-16T23-44-02-481Z/02-topbar-enter-search-note-task-file-link.png`
- Empty-state recovery guidance: `docs/manual-qa/screenshots/PSE-217-2026-05-16T23-44-02-481Z/03-empty-state-guidance.png`

## Operator UX review

| Surface | Operator is trying to | Visually dominant | Secondary / advanced | Safe next action obvious? | Result |
|---|---|---|---|---|---|
| Token search | Prove newly created work is visibly findable. | Query, active local scope, result count/group count, grouped project/link/task/note/file cards, highlighted token. | Filters and recent searches stay left-side support. | Yes: each card keeps a visible Open action and local context. | Pass. |
| Button route | Search from the global top bar by click. | Search page query and matching grouped results. | Route mechanics are invisible. | Yes: the URL/query field/results stay in sync. | Pass. |
| Keyboard route | Search from the global top bar with Enter. | Same trusted result set as click. | Button remains available as a fallback. | Yes: Enter lands on the Search page with visible results. | Pass. |
| Empty search | Recover from no visible matches. | Plain-language no-match message and suggested next actions. | Archived/deleted behavior is explanatory, not dominant. | Yes: check spelling, remove filters, shorten query, or include archived. | Pass. |

## Notes / limitations

- This ticket improves visible search trust, grouping, route/query stability, and
  fallback highlighting; it does not rebuild the search engine or tune relevance.
- The packaged run returned two file search rows for the same attached file
  because both file item and attachment metadata matched the token. This is a
  P3 relevance/deduplication follow-up candidate, not a PSE-217 blocker because
  the file is visible, local, contextual, and safely openable.
