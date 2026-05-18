# PSE-235 manual QA — Search, Collections, and saved views space budget

Date: 2026-05-19

## Scope

Production-built renderer route evidence:

- `#/search-collections-space-budget-fixture`
- `#/search-collections-space-budget-fixture?surface=collections`

Evidence:

- `docs/manual-qa/screenshots/PSE-235-search-collections/01-search-results-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-235-search-collections/02-search-results-1280x800.png`
- `docs/manual-qa/screenshots/PSE-235-search-collections/03-collections-saved-view-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-235-search-collections/04-collections-saved-view-1280x800.png`

## Operator review

- Primary job: search across local tasks, notes, files, links, projects,
  contacts, tags/categories, then reuse understandable saved views.
- Dominant information: command-sized query, readable result title, object type,
  container context, why-matched explanation, result preview, saved-view name,
  and explicit filters.
- Secondary information: filters, recent/saved view controls, view-mode controls,
  PDF/print, and inline collection add form.
- Next safe action: Search, Save as view, Open result, Refresh collection, and
  Add task are labeled controls; disabled actions are visibly secondary.
- Sizing: search command carries a 640px desktop budget with a 420px fallback;
  result and collection panels reserve 620px; preview/detail uses a 320px
  minimum and moves under results instead of squeezing titles.
- Long-data behavior: long task title, long note preview, long filename with
  extension, long link title/domain, long project/contact names, tags, and saved
  smart-list criteria remain readable in row or preview context.
- 1280x800 behavior: shell navigation collapses to icon rail; the search input,
  filters, results, and collections remain usable without syllable wrapping or
  tiny primary controls.
- Feedback/trust: why-matched copy, local-index copy, active filter chips, result
  counts, and collection active state explain what happened and why.
- Local Work OS loop: supports find → inspect → open local container or save a
  reusable view without introducing remote search, cloud sync, or maintenance as
  the dominant workflow.

## Result

Pass with caveat: screenshots use a hidden production renderer fixture for
deterministic long-data evidence. Live Search and Collections still use the same
renderer components and existing service/repository write paths; the ticket did
not rewrite search indexing or saved-view storage.

