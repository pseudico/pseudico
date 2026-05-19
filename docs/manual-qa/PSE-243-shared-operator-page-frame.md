# PSE-243 Shared operator page frame and bounding primitives

## Summary

Added shared renderer primitives in `apps/desktop/src/renderer/components/OperatorPageFrame.tsx`: `OperatorPage`, `OperatorPageHeader`, `OperatorWorkbench`, and `OperatorPanel`. The primitives carry route identity, panel role, primary/rail layout contracts, and CSS-backed fallbacks for 1440x1000 and 1280x800.

`HelpPage` and `WorkflowsPage` use the new frame directly. Global operator CSS also normalizes existing production surfaces so route migrations can share bounded square panels without broad data or IPC changes.

## Representative evidence

- `docs/manual-qa/screenshots/PSE-243-shared-operator-page-frame/help-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-243-shared-operator-page-frame/help-1280x800.png`
- `docs/manual-qa/screenshots/PSE-243-shared-operator-page-frame/workflows-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-243-shared-operator-page-frame/contact-detail-1440x1000.png`

## Contract status

- Primary content gets the first grid budget; rails stack/collapse before primary panels compress below useful width.
- Panels are bordered, square, and visibly bounded.
- Primary text wraps with `overflow-wrap:anywhere`; no line-clamp/ellipsis is used on work surfaces.
- Secondary metadata may still use existing compact badges where it is not the primary work text.

## Tests / checks

- `pnpm --filter @local-work-os/desktop test -- tests/renderer/operatorPageFrame.test.tsx` ? passed.
- `pnpm --filter @local-work-os/desktop typecheck` ? passed.

## Risks

- P0/P1/P2: none known.
- P3: future polish can move more routes from CSS-normalized frames to direct JSX primitives.
