# PSE-251 — Project Display settings save evidence

- Route/workflow: packaged app `#/projects/container_mpg4xp68_0703fc0zpbr`, advanced project options, Display settings panel.
- Operator intent: save project container display preferences such as Compact mode and see the chosen layout persist.
- Before: visible settings controls failed with an internal API-shaped `updateContainerPreferences requires...` error.
- Change: the project route now submits the full typed preferences draft, stores returned preferences, and maps internal validation wording to an operator-facing message.
- Evidence: `docs/manual-qa/screenshots/PSE-251-project-display-settings-fix/project-display-settings.png`; `docs/manual-qa/screenshots/PSE-251-project-display-settings-fix/project-display-settings-compact-persisted.png` (packaged project route with Display settings entry and compact preferences persisted without internal API-shaped error).
- Tests: `apps/desktop/tests/renderer/projectsPage.test.tsx`; `pnpm typecheck`; full `pnpm test`.
- Status: pass for packaged settings panel visibility after persisted compact-mode preference; no internal API-shaped error visible.
