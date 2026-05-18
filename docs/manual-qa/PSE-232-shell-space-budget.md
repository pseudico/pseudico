# PSE-232 shell space-budget manual QA

Date: 2026-05-18  
Build: local production Electron build from `codex/pse-232-shell`  
Workspace: demo workspace created through the app preload API

## Evidence

Screenshots captured from the running production Electron UI:

- `docs/manual-qa/screenshots/PSE-232-shell/01-workspace-shell-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-232-shell/02-today-shell-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-232-shell/03-project-detail-shell-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-232-shell/04-workspace-shell-1280x800.png`
- `docs/manual-qa/screenshots/PSE-232-shell/05-today-shell-1280x800.png`
- `docs/manual-qa/screenshots/PSE-232-shell/06-project-detail-shell-1280x800.png`
- `docs/manual-qa/screenshots/PSE-232-shell/07-project-detail-quick-add-1280x800.png`

The capture helper completed the screenshot writes, then timed out during Electron shutdown; the local Electron processes were stopped afterward. The screenshots above are the final evidence.

## Operator review

- Primary job: keep the operator in a local workspace with command/search, Quick Start capture, route context, and recent navigation available without stealing space from primary work.
- Dominant information: current route title, command/search field, Quick Start, active/recent context, and the selected workspace/project body.
- Secondary information: full side navigation, maintenance routes, navigation history, and command shortcut hints compress before search or Quick Start.
- Next safe action: search, Quick Start, Commands, Recent, and the active route are always visible at desktop widths; disabled states still reflect workspace availability.
- Sizing: command/search keeps a 420px minimum budget at 1280px; Quick Start remains a readable button; the Quick Add task capture is a multiline textarea for real task names.
- Long data: app tabs preserve full labels through title text and allow active tab wrapping; sidebar icon rail keeps accessible labels/titles when labels are hidden.
- 1280x800 behavior: the sidebar becomes an icon rail, navigation history compacts, and command/search plus Quick Start remain usable.
- Feedback: route title, active nav state, app tab strip, and modal state make navigation and capture outcomes visible.
- Local Work OS loop: the shell favors capture, retrieval, and context switching while keeping maintenance secondary unless explicitly opened.

## Risks

- P2: PSE-230 references uncommitted `docs/ui-redesign/*` source artifacts that were available only in the original working checkout, not on `origin/main`.
- P3: the screenshot helper should be converted into a reusable checked-in QA harness if more SBUX tickets need repeated production UI captures.

## Validation

- `pnpm --filter @local-work-os/ui test -- quickAddForm.test.tsx appTabStrip.test.tsx` passed.
- `pnpm --filter @local-work-os/desktop test -- tests/renderer/readabilityStyles.test.ts tests/renderer/navigationHistory.test.tsx tests/renderer/quickAddModal.test.tsx` passed.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed after rebuilding `better-sqlite3` back to the Node ABI used by Vitest; the earlier failure was caused by Electron screenshot setup rebuilding the native module for Electron.
- `pnpm build` passed.
