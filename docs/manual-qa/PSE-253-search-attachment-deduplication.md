# PSE-253 — Search attachment deduplication evidence

- Route/workflow: production route `#/search?q=balcony`.
- Operator intent: find balcony files without seeing duplicate-looking attachment cards that look like duplicate data.
- Before: file item and attachment index rows could render as two indistinguishable results for the same stored file.
- Change: search results deduplicate attachment rows when a matching visible file item result points at the same attachment parent item.
- Realistic data asserted: `balcony_screen_concept.png`; `balcony_defect_reference.png`.
- Tests: `packages/features/tests/searchService.test.ts` adds a file/attachment pair dedupe case; full `pnpm test`.
- Screenshot status: packaged CDP capture for this route timed out after workspace-state automation; no misleading screenshot is attached.
- Status: code/test pass; manual packaged screenshot remains P2 evidence follow-up.
