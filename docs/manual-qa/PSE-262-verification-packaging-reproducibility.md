# PSE-262 Verification And Packaging Reproducibility Evidence

Date: 2026-05-23  
Scope: nontechnical beta-readiness gate hardening, not public release.

## Root cause assessment

- Root `pnpm test` was not failing because `better-sqlite3` could not load in
  the isolated worktree after install; shell Node reported ABI 127 and both
  `packages/db` and `apps/desktop` `better-sqlite3@12.9.0` loaded successfully.
- Root `pnpm test` did fail under the sandbox with Vite `spawn EPERM`; the
  approved rerun outside the sandbox exposed two real release-gate failures:
  integrated smoke tests timed out at Vitest's default 5-second timeout.
- The long smoke tests passed when rerun with `--testTimeout=30000`, so the fix
  keeps the product tests in scope and gives the root gate a realistic timeout
  rather than hiding those suites.
- Package smoke/normal-launch cleanup was too dependent on `child.kill()`.
  On Windows that can leave Electron child processes running and can lock the
  generated `dist-packaged` tree.

## Changes made

- Root Vitest now excludes disposable/generated locations and sets a 30-second
  global test timeout for release-gate smoke tests.
- Root ESLint now excludes disposable/generated worktrees/evidence helpers while
  preserving lint coverage for product source.
- `pnpm package` stops stale generated-package `Local Work OS.exe` processes by
  exact executable path before deleting/rebuilding `dist-packaged`.
- `pnpm package:smoke` stops stale generated-package processes before and after
  smoke, and terminates its spawned Windows process tree on timeout/failure or
  after the bounded normal-launch proof.
- Testing and packaging docs now state the Node-vs-Electron `better-sqlite3`
  ABI expectations and explicit rebuild recovery command.

## Evidence log

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | Pass | Required network escalation once; lockfile unchanged. |
| Native ABI diagnostic | Pass | Node `v22.21.1`, modules `127`; `better-sqlite3` loaded in `packages/db` and `apps/desktop`. |
| `pnpm lint` before patch | Pass | Isolated worktree had no duplicate local evidence folders. |
| `pnpm typecheck` before patch | Pass | No type errors. |
| `pnpm test` under sandbox | Blocked | Vite config load failed with `spawn EPERM`; rerun outside sandbox was required. |
| `pnpm test` outside sandbox before patch | Fail | 236 files passed, 2 smoke files failed due 5-second timeouts. |
| Targeted smoke rerun with `--testTimeout=30000` | Pass | Confirmed slow release-gate tests, not product assertions, were the failure. |
| `pnpm test` after root timeout patch | Fail | The large container-grouping seed test had an explicit 20-second timeout and timed out at ~22.7 seconds during setup in the full root suite. |
| `pnpm lint` after implementation | Pass | Product source linted; disposable/generated paths excluded by policy. |
| `pnpm typecheck` after implementation | Pass | Workspace packages typechecked. |
| `pnpm test` after implementation | Pass | 238 files / 921 tests after rebase onto latest main. |
| `pnpm build` | Pass | Required sandbox escalation because `electron-vite`/`esbuild` process spawn is blocked in the default sandbox. |
| `pnpm package` | Pass | First patched run exposed and fixed a Windows shell/pipeline quoting bug in process cleanup; rerun passed. |
| `pnpm package:smoke` | Pass | Fresh package smoke plus normal launch rendered welcome window. |
| `pnpm package:smoke` again | Pass | Immediate second smoke passed. |
| Generated-package process check | Pass | No `Local Work OS.exe` process remained with executable path under this worktree's generated `dist-packaged/win-unpacked/`. |
| Node ABI diagnostic after package/smoke | Pass | Shell Node still loaded both development `better-sqlite3` copies after Electron packaging. |
| `pnpm package` after two smokes | Pass | Rebuilt `dist-packaged` without manual process cleanup or native-module lock cleanup. |
| `pnpm release:package-check` | Pass | Wrote fresh artifact metadata/checksums; executable SHA-256 `1621afe75195bd64dd6cbbd45f8b45afc71a22a567219d02944d09036c8807b6`, `app.asar` SHA-256 `45a0eab9c2827f1171376bb5d55981e782e1bef6b9cfcd55f87f75a307c920f8`. |
| `pnpm audit:dependencies` | Pass | 47 runtime dependencies, 14 release-tooling dependencies, 1 documented warning. |

The implementation kept that performance test in scope and increased only its
explicit setup timeout to 60 seconds; the assertion that grouped facet reads
complete within 250 ms remains unchanged.

## Final PSE-262 status

Pass for the PSE-262 implementation branch. The intended clean command sequence
was proven in the isolated worktree after installing locked dependencies:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm package
pnpm package:smoke
pnpm package:smoke
pnpm package
pnpm release:package-check
pnpm audit:dependencies
```

No generated-package `Local Work OS.exe` process from this worktree remained
after the repeated package-smoke checks.

## Caveats

- This evidence is Windows-local and scoped to the current unsigned unpacked
  package. It does not claim public-release signing, installer, or auto-update
  readiness.
- Sandbox `spawn EPERM` is an execution-environment limitation for Vitest/Vite
  and Electron build. The release gate still needs a process-spawn-capable local
  or CI runner; this branch records approved reruns outside the sandbox.
- `pnpm package` may still print registry timing warnings during `pnpm deploy`
  metadata resolution and the existing Electron Builder duplicate rebuild
  advisory. These were non-blocking in this run.
