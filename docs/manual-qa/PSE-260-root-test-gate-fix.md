# PSE-260 — Root test gate fix

Status: PASS on `2026-05-23` from `C:\tmp\Pseudico-pse255-260`.

## Operator/release-gate problem

The complete-examination gate could not trust root `pnpm test` because accidental duplicated worktree/evidence suites and renderer/service regressions made root discovery noisy.

## Change

- `vitest.config.ts` now excludes `.tmp`, `.worktrees`, `.codex-output`, `.playwright-mcp`, `dist-packaged`, and manual-QA evidence artifacts from root test discovery.
- Current-worktree renderer/service regressions are covered by the existing root suite plus targeted new regressions for contact detail, list identifiers, CSV tag parity, and long portable bundle filenames.
- No product tests were deleted or skipped to make the gate green.

## Evidence

- Targeted: `pnpm test -- packages/features/tests/csvImportService.test.ts packages/features/tests/exportService.test.ts apps/desktop/tests/main/ipc-handlers.test.ts apps/desktop/tests/renderer/projectsPage.test.tsx` — PASS, 61 tests.
- Root: `pnpm test` — PASS, 238 files / 921 tests.
- `pnpm typecheck` — PASS.
- `pnpm build` — PASS after rerun outside sandbox for esbuild process spawning.

## Risks / follow-up

- P3: sandboxed command runners can block Vite/Rolldown/esbuild helper process spawning with EPERM; escalated local command execution is required for truthful gate verification in this environment.
