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

Packaging-related tickets should also run the desktop packaging command when
the current OS supports it:

```bash
pnpm package
```

The current package command builds the Electron app and runs
`electron-builder --dir`, producing an unpacked development package under
`apps/desktop/dist-packaged/`. This verifies the app bundle shape without code
signing, Windows executable metadata editing, installer generation, auto-update,
or release CI. It allows `electron-builder` to rebuild native dependencies for
the packaged Electron runtime, then rebuilds the local development install back
for Node/Vitest. Manual QA should confirm that workspace paths are still
user-selected and that workspace databases, attachments, backups, and exports
are not bundled into the app.

For docs-only changes, `pnpm build` is still useful because it proves workspace
packages remain buildable after repository edits.

Targeted package checks are useful while working on test infrastructure:

```bash
pnpm --filter @local-work-os/test-utils test
pnpm --filter @local-work-os/db test
pnpm --filter @local-work-os/desktop test
```

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

## Current Baseline

The initial monorepo scaffold includes Vitest and a smoke test. Future tickets
should expand this baseline as real domain, database, IPC, and renderer behavior
is added.
