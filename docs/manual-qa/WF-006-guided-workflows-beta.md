# WF-006 Guided Workflows beta packaged QA

Date: 2026-05-24

Packaged app evidence was captured against a safe copy of the household-renovation workspace, not the original handoff workspace.

- Source workspace: `C:\tmp\Pseudico-beta-handoff-house-renovation-workspace`
- Safe evidence workspace: `C:\tmp\Pseudico-workflows-beta-evidence-workspace-2026-05-24T08-10-32-915Z`
- Screenshot directory: `docs/manual-qa/screenshots/WF-006-guided-workflows-beta-2026-05-24T08-10-32-915Z`
- Summary JSON: `docs/manual-qa/screenshots/WF-006-guided-workflows-beta-2026-05-24T08-10-32-915Z/summary.json`

Workflows run:

1. Project review workflow against `House Renovation and Fit-Out 2026`.
2. Contact follow-up workflow for `Strata manager / owners corporation`.
3. Contact follow-up workflow for `Terry`.
4. Approval/decision workflow for balcony/bathroom approvals.

Follow-up implementation note:

- The beta UI and service now also expose the required small operator inputs:
  project review focus, contact follow-up type, optional follow-up due date, and
  approval review area. These are covered by automated service and renderer
  tests; the screenshot set below remains the packaged evidence for the core
  choose → preview → confirm → run → search/history → restart loop.

Evidence screenshots:

- `01-template-selection.png` — predefined template selection and safe beta rules.
- `02-project-review-preview.png` — read-only preview of planned note/task changes.
- `03-confirmation-checked.png` — explicit confirmation before execution.
- `04-result-summary-project-review.png` — result summary with created-object links.
- `05-run-history-after-four-runs.png` — workflow run history after project/contact/approval runs.
- `06-search-created-review-note.png` — Search retrieval of the created review note.
- `07-search-created-strata-task.png` — Search retrieval of the created Strata follow-up task.
- `08-reopen-run-history-persistence.png` — run history still visible after packaged app restart/reopen.

Verification commands completed:

- `pnpm test`
- `pnpm package`
- `pnpm package:smoke`
