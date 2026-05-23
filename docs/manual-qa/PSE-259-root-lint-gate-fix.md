# PSE-259 — Root lint gate fix

Status: PASS on `2026-05-23` from `C:\tmp\Pseudico-pse255-260`.

## Operator/release-gate problem

The complete-examination gate could not trust root `pnpm lint` because disposable `.tmp`, `.worktrees`, generated package artifacts, and manual-QA helper scripts were in lint discovery scope.

## Change

- `eslint.config.js` now excludes disposable/generated workspace paths: `.tmp`, `.worktrees`, `.codex-output`, `.playwright-mcp`, `dist-packaged`, pnpm store, tsbuild info, and manual-QA JavaScript helper artifacts.
- `.gitignore` now ignores `_tmp_*` helper files emitted during Windows test runs.
- Product source directories remain linted; no product-code lint failures were suppressed.

## Evidence

- `pnpm lint` — PASS.
- `pnpm typecheck` — PASS.
- `pnpm test` — PASS, 238 files / 921 tests.
- `pnpm build` — PASS after rerun outside sandbox for esbuild process spawning.

## Risks / follow-up

- P3: original repo root remains dirty/stale with unrelated files; corrective verification used a clean main-based worktree.
