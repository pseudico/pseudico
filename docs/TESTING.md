# Testing

Testing should scale with the risk and surface area of each ticket. Small docs
changes may need only lint/typecheck/test verification to prove the repo still
works. Domain, database, IPC, and renderer changes need targeted tests.

## Standard Commands

Run these before opening implementation PRs unless the linked issue states a
narrower verification scope:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The root Vitest config deliberately excludes disposable/generated QA locations
(`.tmp/`, `.worktrees/`, `.codex-output/`, `.playwright-mcp/`,
`dist-packaged/`, and `docs/manual-qa/`) so a root test gate does not rerun
duplicate worktree suites or generated evidence helpers. Product source and
tracked product tests remain in scope. The global test timeout is 30 seconds so
the integrated fresh-workspace and backup/restore smoke tests can run in the
full root suite on slower Windows/package-validation machines without treating
normal I/O as a product failure.

Packaging-related tickets should also run the desktop packaging command when
the current OS supports it:

```bash
pnpm package
```

The current package command builds the Electron app, deploys a temporary
self-contained desktop package staging directory with `pnpm deploy --prod
--legacy`, and then runs `electron-builder --dir` from that staging directory.
The staging directory is removed when packaging completes, and the unpacked
development package is written under `apps/desktop/dist-packaged/`. This keeps
pnpm workspace symlinks and TypeScript build-cache files out of Electron Builder
inputs while still rebuilding `better-sqlite3` for the packaged Electron runtime.
After packaging, the script explicitly rebuilds `better-sqlite3` for the
development Node runtime used by `pnpm test` (`process.versions.modules`, ABI
127 on the current Node 22 setup). The packaged app keeps its Electron ABI copy
inside `resources/app.asar.unpacked/`, while the workspace `node_modules` copy
must remain loadable by shell Node tests.
It verifies the app bundle shape without code signing, Windows executable
metadata editing, installer generation, auto-update, or release CI. Manual QA
should confirm that workspace paths are still user-selected and that workspace
databases, attachments, backups, and exports are not bundled into the app.

For docs-only changes, `pnpm build` is still useful because it proves workspace
packages remain buildable after repository edits.

Targeted package checks are useful while working on test infrastructure:

```bash
pnpm --filter @local-work-os/test-utils test
pnpm --filter @local-work-os/db test
pnpm --filter @local-work-os/desktop test
```

If a test run reports that `better_sqlite3.node` was compiled for Electron
instead of shell Node, repair the developer modules explicitly before rerunning
tests:

```bash
pnpm --filter @local-work-os/db rebuild better-sqlite3
pnpm --filter @local-work-os/desktop rebuild better-sqlite3
pnpm test
```

Do not skip failing product tests to work around an ABI mismatch; fix the
native-module state first, then rerun the same gate.

Coverage-map tickets and release-hardening reviews should also validate the
feature-to-test matrix and the local parity QA report:

```bash
pnpm coverage:map
pnpm qa:parity
```

Update `docs/TEST_COVERAGE_MAP.md` whenever a new feature family, smoke tag, or
release-critical manual QA path is added. Update
`docs/LOCAL_PARITY_QA_REPORT.md` whenever a release-hardening QA pass changes
feature status, gap severity, or follow-up scope.
Operator-readiness failure testing is tracked in
`docs/FAILURE_MODE_MATRIX.md`; update that matrix when adding or changing
recoverable local-only failure behavior.

Large-workspace performance tickets should run the local benchmark harness after
the standard checks:

```bash
pnpm benchmark:large -- --sizes=1000,10000 --out=docs/performance/reports/latest.json
```

Use the full `1000,10000,100000` size set for release-gate or hardware-baseline
runs. See `docs/PERFORMANCE.md` for budgets and report expectations.

## Domain Logic

Domain logic belongs in `packages/core` or `packages/features` and should be
covered with focused unit tests. Prefer testing pure functions and services
without Electron or React when possible.

## Database Work

Database tickets should verify:

- Migrations apply from an empty workspace.
- Repositories use transactions for data-changing operations.
- Activity log entries are written for data changes.
- Search index updates occur for searchable content when the search service
  exists.
- Soft delete behavior is used where expected.

Use `createTestDatabase` from `@local-work-os/test-utils` for tests that need a
temporary workspace database path. The helper creates a disposable
workspace-style `data/local-work-os.sqlite` location and cleans up the temp
folder after the test.

Use `createTestWorkspace` when a test needs the full local workspace fixture:
`workspace.json`, `data/`, `attachments/`, `backups/`, `exports/`, and `logs/`.
Use `makeTestIds` and `seedTestData` for deterministic seed inputs rather than
hand-rolled counters in each test file.

## Electron IPC

IPC tests should cover allowed calls, invalid inputs, and failure behavior.
Renderer code must use typed preload APIs rather than direct Node or SQLite
access.

## Renderer Work

Renderer changes should use React Testing Library for component behavior and
Playwright when a user workflow, routing behavior, or desktop integration needs
browser-level verification.

Current desktop smoke coverage uses Vitest server rendering for the app launch
route and renderer health surface. A true Playwright/Electron launch smoke test
is intentionally deferred until Playwright is added to the workspace; do not add
an ad hoc browser dependency inside feature tickets.

## Manual QA

Manual QA is required when a change affects desktop launch, workspace folder
selection, filesystem behavior, packaging, or visible user workflows. Document
the manual steps and outcome in the PR template.
Use `docs/FAILURE_MODE_MATRIX.md` for failure-mode manual QA cases such as
permission-denied folders, database locks/corruption, interrupted writes or
backups, large attachments, and long-running maintenance jobs.

## Current Baseline

The initial monorepo scaffold includes Vitest and a smoke test. Future tickets
should expand this baseline as real domain, database, IPC, and renderer behavior
is added.
