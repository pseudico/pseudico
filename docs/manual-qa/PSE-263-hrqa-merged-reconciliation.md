# PSE-263 — HRQA merged reconciliation

Date: 2026-05-23 (Australia/Sydney)  
Scope: nontechnical beta-readiness HRQA trust-bug reconciliation, not public release readiness.

## PR / merge state

- Fix PR: [#227](https://github.com/pseudico/pseudico/pull/227) — `PSE-249..254 household renovation QA corrective fixes`.
- Merge commit: `8c4d06b5ae591220d67436b179fc3eaebaba3079`.
- Review outcome: merged before this reconciliation; current pass reviewed the merged PR body, evidence docs, screenshots, and Linear comments for beta gate completeness.
- Command baseline recorded on PR #227: targeted Vitest, `pnpm typecheck`, `pnpm lint`, full `pnpm test`, `pnpm build`, and `pnpm package` passed.

## Per-ticket reconciliation

| Issue | Root cause / fix summary | Evidence status | Beta gate status |
| --- | --- | --- | --- |
| PSE-249 | Contact navigation did not consistently target `/contacts/:contactId`; related cards/search destinations now open direct contact routes and preserve true not-found handling. | Packaged screenshots exist for direct DJ DeRiu route, project relationship open action, and polished contact/relationship cards. | Pass; no P0/P1 known. |
| PSE-250 | Search could visually retain stale count/results while a new query was loading; live search now clears stale result/count state at search start. | Automated tests and evidence doc pass; packaged screenshots for `retrospective` and `Painting weekend` are still missing. | Code pass with P2 evidence gap. |
| PSE-251 | Project display settings submitted an incomplete/invalid preference payload and surfaced internal validation wording; typed preferences and operator-facing errors are now used. | Packaged screenshots show Display settings and compact-mode preference persisted without the internal API-shaped error. | Pass; no P0/P1 known. |
| PSE-252 | Today metrics mixed manual planning and due-date lane scopes without enough labels; UI now separates manual-plan metrics from visible due-date lane counts. | Automated tests and evidence doc pass; packaged complete/postpone/reopen transition screenshots are still missing. | Code pass with P2 evidence gap. |
| PSE-253 | Search projected attachment rows alongside identical-looking file item rows; attachment rows are deduplicated when the file item already represents the same attachment. | Automated tests and evidence doc pass; packaged `balcony` search screenshot is still missing. | Code pass with P2 evidence gap. |
| PSE-254 | Project metadata renderer still showed placeholder tag copy; project detail now loads tag data and renders `@tag` badges or an intentional empty state. | Packaged screenshots show no placeholder and real project tags. | Pass; no P0/P1 known. |

## Residual risks

- P0: none known from merged PR #227 evidence and command results.
- P1: none known from merged PR #227 evidence and command results.
- P2: packaged user-visible evidence is still missing for PSE-250, PSE-252, and PSE-253; this prevents truthful final HRQA gate closure. Follow-up Linear ticket: [PSE-267](https://linear.app/pseudico/issue/PSE-267/beta-hrqa-capture-packaged-evidence-for-search-today-and-attachment).
- P3: PSE-254 tag header refresh is load-based; no inline tag editor was added in the scoped fix.

## Decision

Do not mark PSE-263 complete yet. The merged code and tests remove the known P0/P1 trust failures, but the nontechnical beta gate still needs packaged evidence for the Search, Today transition, and balcony attachment workflows or an explicit owner acceptance of those P2 evidence gaps.

## Next actions

1. Complete PSE-267 by capturing packaged production-route screenshots for PSE-250 (`retrospective`, `Painting weekend`), PSE-252 (initial Today plus complete/postpone/reopen clarity), and PSE-253 (`balcony`).
2. Update PSE-250/PSE-252/PSE-253 final Linear comments with screenshot paths or record owner acceptance if screenshots cannot be captured.
3. Only then close PSE-263 and proceed to PSE-264 complete packaged beta functionality pass.
