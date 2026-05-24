# Beta handoff status — 2026-05-24

## Verdict

**Go with explicit internal-beta caveats for nontechnical testers.** The PSE-268 Search-route blocker has been fixed and rerun against the final Windows unpacked package. Automated release gates, package smoke, package launch, release package checks, dependency audit, and the HRQA Search/Today production-route evidence now pass.

This is **not** a public release: the build is unsigned, unpacked, manually distributed, and has no installer, auto-update, public support process, or signing/notarization.

## Candidate under test

- Worktree: `C:\tmp\Pseudico-beta-candidate`
- Branch: `codex/beta-candidate-handoff`
- Package folder: `C:\tmp\Pseudico-beta-candidate\apps\desktop\dist-packaged\win-unpacked`
- Run: `C:\tmp\Pseudico-beta-candidate\apps\desktop\dist-packaged\win-unpacked\Local Work OS.exe`
- Executable SHA-256: `e3c131148ffd8da8964b17aff72800441cc6b2758c58858912981d9b9a22198f`
- app.asar SHA-256: `761e44b39ae1631ec448776aa9221f947435e2df336a5b6fca742e36148eee56`
- Artifact metadata: `docs/release/package-artifact-check.json`

## Gates run after the PSE-268 fix

| Gate | Result | Notes |
| --- | --- | --- |
| `pnpm lint` | Pass | Includes the fixed route-evidence harness. |
| `pnpm typecheck` | Pass | All workspace projects. |
| `pnpm test` | Pass | 238 files / 921 tests. |
| Targeted Search tests | Pass | `apps/desktop/tests/renderer/projectsPage.test.tsx` and `packages/features/tests/searchService.test.ts`; 21 tests. |
| `pnpm build` | Pass | Production Electron/Vite build. |
| `pnpm package` | Pass | Fresh Windows unpacked package built after the fix. |
| `pnpm package:smoke` | Pass twice | Workspace creation, SQLite, attachments, backup, import smoke, and normal launch. |
| `pnpm package` after smoke | Pass | Rebuild after smoke confirmed package output was not locked. |
| `pnpm qa:packaged-launch` | Pass | Final welcome screenshot captured. |
| `pnpm release:package-check` | Pass | Final checksums written. |
| `pnpm audit:dependencies` | Pass with 1 warning | Existing `simple-get` network-capable dependency remains documented and outside normal runtime. |
| `git diff --check` | Pass | Line-ending warnings only. |

## Evidence captured

- Final Welcome launch: `docs/manual-qa/screenshots/beta-handoff-2026-05-24/final/welcome.png`
- Final HRQA route evidence JSON: `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa-fixed-scrolled-route-evidence.json`
- Final HRQA screenshots:
  - `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa-fixed-scrolled/01-search-retrospective.png`
  - `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa-fixed-scrolled/02-search-painting-weekend.png`
  - `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa-fixed-scrolled/03-search-balcony.png`
  - `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa-fixed-scrolled/04-today.png`
- Earlier blocker/preflight evidence retained for traceability:
  - `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa-route-evidence-workspace-api.json`
  - `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa/01-search-retrospective.png`

## PSE-268 resolution

PSE-268 was caused by unstable default array props on `SearchPage`: `initialKinds = []` created a new dependency identity every render, so the live route search effect repeatedly restarted/cancelled even though direct Search IPC returned results quickly. The fix uses stable empty constants and a stable `initialKindsKey` dependency for filter derivation.

Packaged production-route rerun results:

| Route | Result |
| --- | --- |
| `#/search?q=retrospective` | Pass; 2 visible Search result cards. |
| `#/search?q=Painting%20weekend` | Pass; 2 visible Search result cards. |
| `#/search?q=balcony` | Pass; 30 Search result cards in DOM summary and visible note result cards in screenshot. |
| `#/today` | Pass; Today planning summary rendered. |

## Decision and caveats

Proceed with a controlled nontechnical internal beta handoff using `docs/NONTECHNICAL_BETA_HANDOFF_DRAFT.md` as the tester-facing handoff note.

Required caveats to include with the handoff:

1. Unsigned unpacked Windows development package; Windows warnings are expected.
2. No installer, auto-update, public signing/notarization, or public support process.
3. Testers must keep workspace folders outside the app/package folder.
4. Testers must run an in-app backup before importing real data or moving to a newer build.
5. Optional network-capable features remain off by default; no packaged OS firewall/no-network monitor was run in this pass, so public-release local-only claims still require that manual monitor.
6. Workflows remain scaffold/lab only; do not present them as daily automation.

## Required human action before sending

Owner should copy or zip the entire `win-unpacked` folder, include the tester handoff note, and explicitly accept the unsigned/internal-beta caveats above. No P0/P1 blocker remains from this rerun.
