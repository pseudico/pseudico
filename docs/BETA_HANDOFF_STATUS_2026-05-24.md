# Beta handoff status — 2026-05-24

## Verdict

**No-go for nontechnical beta handoff.** A clean candidate artifact was built and most automated gates passed, but the remaining HRQA Search packaged evidence gate failed on a primary retrieval route.

## Candidate under test

- Worktree: `C:\tmp\Pseudico-beta-candidate`
- Branch: `codex/beta-candidate-handoff`
- Base SHA: `55311c874a61d0417a297c8c126c50e667fe8d2f`
- Package: `C:\tmp\Pseudico-beta-candidate\apps\desktop\dist-packaged\win-unpacked\Local Work OS.exe`
- Executable SHA-256: `149e0ec7220a7e78b2ad4d3f69b7be4ae3c2441159e37a4ee1c339c4b7543ec0`
- app.asar SHA-256: `89ac0db77f2dd1f7035a22bb4f0afa88ff0ecbc1b2980f3d9b348f1b415d61eb`
- Artifact metadata: `docs/release/package-artifact-check.json`

## Gates run

| Gate | Result | Notes |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | Pass | Required escalation due sandbox file permissions. |
| `pnpm lint` | Pass | Re-run after QA script changes. |
| `pnpm typecheck` | Pass | Clean candidate worktree. |
| `pnpm test` | Pass | 238 files / 921 tests; required escalation because sandbox blocked Vite child process spawn. |
| `pnpm build` | Pass | Required escalation because sandbox blocked Electron/Vite child process spawn. |
| `pnpm package` | Pass | Fresh unpacked Windows artifact built. |
| `pnpm package:smoke` | Pass | Passed twice consecutively. |
| `pnpm package` after smoke | Pass | Rebuilt successfully; generated package was not locked. |
| `pnpm qa:packaged-launch` | Pass after script wait fix | Welcome screenshot captured using isolated user data dir. |
| `pnpm release:package-check` | Pass | Fresh checksums written. |
| `pnpm audit:dependencies` | Pass with 1 warning | `simple-get` network-capable dependency remains documented. |

## Evidence captured

- Welcome launch: `docs/manual-qa/screenshots/beta-handoff-2026-05-24/welcome.png`
- HRQA workspace/API preflight: `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa-route-evidence-workspace-api.json`
- HRQA workspace screenshot: `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa/00-workspace.png`
- Search blocker screenshot: `docs/manual-qa/screenshots/beta-handoff-2026-05-24/hrqa/01-search-retrospective.png`

## Blocker

**PSE-268** was created as a P1 beta blocker: packaged Search route stalls renderer/CDP while direct Search IPC returns results.

Direct packaged IPC preflight against the copied household-renovation workspace returned quickly:

- `retrospective`: 2 results in 9 ms
- `Painting weekend`: 2 results in 26 ms
- `balcony`: 30 results in 39 ms
- recent searches: 6 entries in 2 ms

However, the production Search route still showed `Searching local index...` and route capture for subsequent Search routes timed out after navigation. This keeps PSE-250/PSE-253/PSE-267 open and blocks PSE-264/PSE-265/PSE-266 from final Go.

## Decision

Do not send this candidate to nontechnical testers. Use it only as an internal technical candidate for fixing PSE-268.

## Required sequence to resume handoff

1. Fix PSE-268 and capture packaged Search screenshots for PSE-250/PSE-253/PSE-267.
2. Re-run PSE-264 complete deliberate packaged-app functionality pass.
3. Produce the final PSE-265 handoff package from a clean artifact.
4. Complete PSE-266 final go/no-go and owner acceptance.
