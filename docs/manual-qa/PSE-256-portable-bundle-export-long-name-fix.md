# PSE-256 — Portable bundle export long-name path fix

Status: PASS on `2026-05-23`.

## Operator-facing problem

Portable HTML/CSV/TSV/Markdown bundle export failed on Windows when realistic long project/contact names were copied directly into Markdown filenames, causing path/ENOENT failures.

## Change

- Portable bundle container Markdown filenames now keep normal short names unchanged and shorten only overlong project/contact slugs.
- Shortened filenames include a stable source-id suffix, while the bundle manifest preserves `sourceType: container` and the exact source `sourceId` mapping for retrieval.
- JSON export, project Markdown export, task CSV/TSV export, planning export, and bundle manifest generation remain on existing export paths.

## Evidence

- `packages/features/tests/exportService.test.ts` long realistic project/contact name regression verifies shortened filenames, written outputs, and manifest source mapping — PASS.
- Root `pnpm test` — PASS, 238 files / 921 tests.
- `pnpm build` — PASS.

## Risks / follow-up

- P2: run one packaged-app long-data export against the complete-examination workspace before release sign-off to capture final operator-facing export evidence.
