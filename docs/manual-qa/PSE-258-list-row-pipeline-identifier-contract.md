# PSE-258 — List row and pipeline identifier contract

Status: PASS on `2026-05-23`.

## Operator-facing problem

Rows and lists could be created successfully, but follow-up lifecycle and pipeline calls rejected identifiers when the caller reused app-returned summary objects instead of manually extracting string IDs.

## Change

- List IPC handlers now normalize stable identifiers from either strings or returned summaries for complete, reopen, indent, outdent, pipeline enable/view/disable, move row, and move pipeline card operations.
- Move operations also normalize summary objects supplied in `listId`, `listItemId`, `cardId`, and `targetStageId` fields.
- Service/database boundaries remain unchanged; IPC validates and normalizes inputs before calling feature services.

## Evidence

- `apps/desktop/tests/main/ipc-handlers.test.ts` creates a list and rows, then reuses returned summaries for complete/reopen, pipeline enable/view/disable, card move, indent/outdent, and row move — PASS.
- Root `pnpm test` — PASS, 238 files / 921 tests.

## Risks / follow-up

- P2: perform one packaged-app checklist/pipeline click-through against the complete-examination workspace before release sign-off.
