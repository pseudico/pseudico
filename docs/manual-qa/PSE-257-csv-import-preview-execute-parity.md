# PSE-257 — CSV import preview/execute tag parity

Status: PASS on `2026-05-23`.

## Operator-facing problem

CSV task import preview could show rows containing `@tag` notation as creatable, while execution later imported zero records because tag parsing and execution validation disagreed.

## Change

- CSV import tag parsing now treats comma, semicolon, and whitespace as separators and strips leading `@` characters from each tag token.
- Preview and execution use the same normalized tag list, so `@kitchen @supplier` previews and imports as `kitchen`, `supplier`.
- Successful execution still writes task records, taggings, search index records, and the CSV import activity entry through existing services.

## Evidence

- `packages/features/tests/csvImportService.test.ts` preview/execute parity regression for `@tag` notation — PASS.
- Root `pnpm test` — PASS, 238 files / 921 tests.

## Risks / follow-up

- P3: add a packaged-app fixture import screenshot using `docs/manual-qa/complete-examination-2026-05-23/fixtures/import_tasks.csv` if the release evidence set requires visual proof.
