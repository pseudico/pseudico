# PSE-227 package metadata and release caveats

Date: 2026-05-18 08:03 Australia/Sydney  
Linear: PSE-227 - Polish package metadata and document non-public-release caveats  
Branch: `codex/pse-227-package-metadata`  
Base commit: `516416d08a796a72f101042c3066b087a5f2fc31`

## Scope

PSE-227 is package/release polish only. It does not add signing, notarization,
installers, auto-update, telemetry, billing, licensing, hosted release
infrastructure, cloud sync, or remote storage.

## Package metadata

- Added desktop package description: `Local-only desktop work operating system for internal pilot use.`
- Added desktop package author: `Pseudico`.
- Existing Electron Builder product metadata remains `productName: Local Work OS`
  and `appId: com.pseudico.localworkos`.
- Re-ran `pnpm package`; the prior Electron Builder warnings for missing
  description and missing author did not recur.

Non-blocking advisories still observed:

- `pnpm deploy --legacy` shared-lockfile/registry timing warnings can appear
  while preparing the temporary staging app.
- Electron Builder still prints an `@electron/rebuild` duplicate-use advisory.
  This is intentionally documented rather than changed because PSE-221's native
  module rebuild/copy path keeps packaged `better-sqlite3` working.

## Command evidence

- `pnpm install --frozen-lockfile` - pass in fresh PSE-227 worktree.
- `pnpm package` before the fix - pass, reproduced missing description/author
  Electron Builder warnings.
- `pnpm package` after the fix - pass; missing description/author warnings
  resolved; output: `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`.
- `pnpm release:package-check` - pass; wrote
  `docs/release/package-artifact-check.json`.
- `pnpm lint` - pass.
- `pnpm typecheck` - pass.
- `pnpm test` - pass, 230 files / 888 tests.
- `pnpm build` - pass.
- `pnpm package:smoke` - pass; packaged app created a temporary local workspace,
  wrote SQLite data, attached a file, created a backup, exercised importer smoke
  paths, and completed normal-launch welcome smoke.

## Package output and cleanliness

- Package output: `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`.
- Package artifact check: `docs/release/package-artifact-check.json`.
- Generated artifact check reports `publish: null`, unsigned Windows development
  package status, no installer, local-only data boundary, and current executable
  / `app.asar` checksums.
- Package contents spot-check: `*.tsbuildinfo` files in packaged output: `0`;
  `*.tsbuildinfo` entries inside `resources/app.asar`: `0`.
- Release package check reports no forbidden workspace artifacts inside the
  package.

## Internal-pilot caveats

This remains an **internal pilot / operator-readiness** package only:

- Windows package is unsigned (`signAndEditExecutable: false`).
- No installer is produced (`target: dir`).
- No auto-update or release feed is configured (`publish: null`).
- Public release still requires owner decisions for signing/notarization,
  installer targets, published checksums, legal/support process, and any update
  channel.

## Risk classification

| Severity | Risk | Status |
| --- | --- | --- |
| P0 | Package cannot be produced from clean main. | Not present; package passed after dependency install. |
| P1 | Package contains workspace data or TypeScript build cache artifacts. | Not present; checks found no workspace artifacts and no `.tsbuildinfo`. |
| P2 | Internal pilot recipients may mistake unsigned/unpacked output for public release. | Mitigated in `docs/RELEASE_CANDIDATE_PACKAGING.md`. |
| P3 | Packaging still prints non-metadata tooling advisories. | Documented; no operator runtime impact observed. |
