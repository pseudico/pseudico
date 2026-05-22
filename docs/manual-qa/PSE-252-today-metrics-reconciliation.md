# PSE-252 — Today metrics reconciliation evidence

- Route/workflow: production route `#/today`.
- Operator intent: compare Today summary numbers with visible Today/Tomorrow/Backlog lanes after task changes.
- Before: summary metrics looked contradictory because manual daily-plan counts and due-date lane counts were unlabeled together.
- Change: summary labels now say `Manually planned` and `Manual plan lanes`; a separate `Visible work lanes / Due-date lane counts` panel reconciles visible lane totals.
- Tests: `apps/desktop/tests/renderer/todayPage.test.tsx`; full `pnpm test`.
- Screenshot/action status: packaged CDP capture for Today timed out before successful workspace-store state could be reused; completing/postponing task screenshots remain P2 manual evidence follow-up.
- Status: code/test pass for label/scope reconciliation; full manual action proof remains blocked by capture automation, not by a failing test.
