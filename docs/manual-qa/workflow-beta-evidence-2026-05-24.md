# Workflow beta evidence — 2026-05-24

Product decision: **Workflows are beta-supported with caveats** for predefined guided local household-renovation workflows only.

## Evidence source

- Linear sequence: PSE-269 through PSE-274 (WF-001 through WF-006).
- Packaged screenshot directory: `docs/manual-qa/screenshots/WF-006-guided-workflows-beta-2026-05-24T08-10-32-915Z/`.
- Packaged evidence summary: `docs/manual-qa/WF-006-guided-workflows-beta.md`.
- Source workspace used for safe-copy QA: `C:\tmp\Pseudico-beta-handoff-house-renovation-workspace`.

## Verified operator loop

- Select a predefined workflow template.
- Fill simple inputs: project, optional review focus, contact/follow-up type/optional due date, or approval area.
- Preview planned creates/links before mutation.
- Confirm explicitly before execution.
- Execute through local services/repositories.
- Show result summary and links to created objects.
- Retrieve created output in Search.
- Show durable workflow run history after restart/reopen evidence where practical.

## Local-only caveats

- No arbitrary scripting, shell commands, background automation, webhooks, cloud sync, hosted accounts, telemetry, remote execution, public sharing, or team workflows.
- User-authored workflow builders and workflow scheduling remain future scope.
- The beta templates are intentionally narrow and household-renovation-specific.

## Automated verification

- `pnpm --filter @local-work-os/features test -- guidedWorkflowService.test.ts` — pass; includes template, mutation-free preview, execution, activity/search/run-history, optional input, invalid input, and blocked preview coverage.
- `pnpm --filter @local-work-os/desktop test -- workflowsPage.test.tsx` — pass; covers nontechnical guided workflow UI copy and preview/confirmation/history states.
- `pnpm typecheck` — pass.

## Remaining risks

- P0: none found.
- P1: none found in automated workflow loop evidence.
- P2: packaged screenshots predate the optional-input polish; automated tests cover the new inputs, but fresh screenshots should be captured if the final PR needs visual proof of those controls.
- P3: broader workflow builder, scheduling, and reusable cross-domain templates remain future enhancements.
