# PSE-221 packaged release QA

Date: 2026-05-17 13:45 Australia/Sydney  
Linear: PSE-221 - Release packaging hardening: fix electron-builder/pnpm unsafe `.tsbuildinfo` packaging failure

## Root cause

`pnpm package` ran Electron Builder from `apps/desktop`, while pnpm stored workspace and dependency package contents outside that app directory. Electron Builder followed pnpm links while building `app.asar` and rejected files such as `packages/core/dist/.tsbuildinfo` and declaration maps as unsafe paths outside the package boundary.

## Fix summary

- Desktop packaging now builds the app, deploys a temporary self-contained production staging app at `apps/desktop/.package-app/`, runs Electron Builder from that staging directory, writes output back to `apps/desktop/dist-packaged/`, then deletes the staging directory.
- Local workspace package imports remain bundled through Vite aliases instead of being packaged as pnpm workspace symlinks.
- Package TypeScript build info is emitted under repo-root `.tsbuildinfo/` instead of package `dist/` folders, and Electron Builder excludes TypeScript build cache files.
- `better-sqlite3` is rebuilt for the packaged Electron runtime in staging and copied into `app.asar.unpacked` so packaged workspace creation/opening works.
- The package script restores development `better-sqlite3` modules after packaging so Vitest/Node checks continue to use the correct native module ABI.

## Command evidence

- `pnpm install --frozen-lockfile` - pass in clean PSE-221 worktree after lockfile update.
- `pnpm lint` - pass.
- `pnpm typecheck` - pass.
- `pnpm test` - pass, 230 files / 886 tests.
- `pnpm build` - pass.
- `pnpm package` - pass; output: `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`.
- `pnpm package:smoke` - pass; packaged executable creates a temporary local workspace, writes SQLite data, attaches a file, creates a backup, and normal-launch smoke renders the welcome window.
- `pnpm release:package-check` - pass; wrote `docs/release/package-artifact-check.json`.

## Package contents spot-check

Machine-readable check: `docs/manual-qa/PSE-221-package-contents-check.json`.

Results:

- `.tsbuildinfo` files on disk under packaged output: `0`.
- `.tsbuildinfo` files inside `resources/app.asar`: `0`.
- Main bundle, preload bundle, renderer HTML, `better-sqlite3` package, and Electron-native `better_sqlite3.node` are present.
- `node_modules/@local-work-os/*` workspace symlinks are absent from the package; local workspace code is bundled into app output.

## Packaged UI evidence

Screenshots captured from the actual packaged executable with a fresh Electron user-data directory:

- `docs/manual-qa/screenshots/PSE-221-2026-05-17T03-45-00/01-packaged-welcome.png` - packaged welcome screen / local-only status.
- `docs/manual-qa/screenshots/PSE-221-2026-05-17T03-45-00/02-packaged-workspace-open.png` - packaged app opened `PSE-221 Package Smoke` workspace with database connected and workspace health visible.

Machine-readable UI evidence: `docs/manual-qa/PSE-221-packaged-ui-evidence.json`.

## Risks

| Severity | Risk | Status |
| --- | --- | --- |
| P0 | Package cannot be produced from a clean worktree. | Fixed; `pnpm package` passes. |
| P1 | Packaged app launches but cannot create/open a local workspace. | Fixed after Electron-native rebuild/copy in staging; packaged UI and `package:smoke` pass. |
| P2 | Packaging depends on a pnpm staging command that can contact the registry when store metadata is cold. | Accepted for local release packaging; `pnpm install --frozen-lockfile` still validates lockfile reproducibility first. |
| P3 | Current artifact remains unsigned unpacked development output, not an installer. | Existing release limitation; out of scope for PSE-221. |
