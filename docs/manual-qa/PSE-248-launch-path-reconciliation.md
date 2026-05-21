# PSE-248 packaged launch path reconciliation

Date: 2026-05-22 Australia/Sydney
Linear: PSE-248 — Reconcile Pseudico launch paths and prove QA uses the current packaged app

## Problem

During a realistic household-renovation functionality QA setup, Codex attempted
to start Pseudico through a sandboxed/background `pnpm dev` path. The launch did
not reach a clear app-ready state and an attempted packaged smoke run inside the
sandbox produced Windows/Electron display errors:

- `No displays detected`
- `platform_channel`
- `Access is denied`

The product was not proven broken by that failure. The launch method was
ambiguous and the QA instructions did not make the authoritative packaged-app
path obvious enough.

## Decision

For release/operator manual QA and screenshots, the canonical launch proof is:

```bash
pnpm qa:packaged-launch -- --screenshot=docs/manual-qa/screenshots/<ticket>/welcome.png
```

This helper uses the packaged executable under
`apps/desktop/dist-packaged/`, verifies the welcome shell rendered, captures an
optional screenshot, prints artifact metadata, and exits within a bounded
timeout. Use `pnpm dev` only for active source development unless a ticket
explicitly says it is testing dev mode.

## What changed

- Added `apps/desktop/scripts/run-packaged-launch-check.mjs`.
- Added root and desktop `qa:packaged-launch` scripts.
- Updated `docs/QA_SCRIPTS.md` with the canonical launch matrix, display/sandbox
  caveat, and stale-process cleanup guidance.
- Updated `docs/OPERATOR_RUNBOOK.md` with a "Which Pseudico build am I opening?"
  section for non-expert operators and Codex agents.
- Updated `docs/RELEASE_CANDIDATE_PACKAGING.md` so release verification includes
  packaged launch proof as well as package smoke and package checks.

## Expected evidence

The launch helper prints JSON containing:

- packaged executable path;
- `resources/app.asar` path;
- SHA-256 checksums;
- file modified times and sizes;
- package names/versions;
- git SHA when available;
- screenshot path when requested; and
- stderr tail for display/sandbox diagnosis.

## Manual QA rule

If a sandbox/no-display run fails, do not keep retrying an unbounded background
dev launch. Stop, record the failure, and rerun the packaged helper from a
display-capable session.

## Verification on this branch

Validated in `codex/pse-248-launch-paths`:

- `node --check apps/desktop/scripts/run-packaged-launch-check.mjs` — pass.
- `git diff --check` — pass.
- `pnpm package` — pass with display/build-capable execution after sandboxed
  spawn was denied.
- `pnpm package:smoke` — pass with display-capable execution.
- `pnpm qa:packaged-launch -- --screenshot=docs/manual-qa/screenshots/PSE-248-packaged-launch-check/welcome.png`
  — pass with display-capable execution.
- `pnpm release:package-check` — pass; generated report was reviewed but not
  committed because it contains machine-local artifact paths.
- `pnpm lint` — pass.
- `pnpm typecheck` — pass.
- `pnpm test` — pass with 238 files / 916 tests after sandboxed Vitest spawn
  was denied.
- `pnpm qa:packaged-launch -- --timeout=3000` from the normal sandbox — failed
  quickly with `spawn EPERM` and printed the operator hint rather than hanging.

Screenshot evidence:

- `docs/manual-qa/screenshots/PSE-248-packaged-launch-check/welcome.png`
