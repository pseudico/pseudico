# Workflows beta contract and scaffold audit

Status: WF-001 implementation note for the first nontechnical beta workflow loop.

## Current scaffold state

- `packages/features/src/workflows/WorkflowSchema.ts` defines a local-only workflow
  schema with manual and event-style triggers plus registered local actions.
- `WorkflowService`, `WorkflowActionExecutor`, and `WorkflowRunHistoryService`
  can validate, preview, execute, and record run history for service-level
  workflow definitions.
- The packaged `apps/desktop/src/renderer/pages/WorkflowsPage.tsx` currently
  presents Workflow Lab as scaffold-only and does not expose a safe operator
  choose/preview/confirm/result/run-history loop.
- SQLite already has `workflow_definitions` and `workflow_runs`; run records are
  durable and survive restart/reopen.
- Existing task, note, tag, category, relationship, activity, and search services
  already implement the required local write flow for created work objects.

## Supported beta workflow model

The beta Workflows surface supports only predefined guided templates:

1. Project review for `House Renovation and Fit-Out 2026`.
2. Contact follow-up for the known renovation contacts.
3. Approval/decision review for unresolved balcony and bathroom decisions.

Supported nontechnical inputs are intentionally small:

- Project review: project plus optional focus (`all`, balcony approvals,
  painting, electrical, bathroom, or budget risk).
- Contact follow-up: contact, related project, follow-up type (`call`, `email`,
  `quote`, `approval`, or `availability`), and an optional local due date.
- Approval/decision review: project plus approval area (`all`, balcony,
  bathroom, or electrical).

The beta loop is:

```text
choose predefined template
  -> fill a small form when needed
  -> preview planned creates/links
  -> confirm
  -> execute through services/repositories
  -> record activity/search/run history
  -> show result summary and object links
```

## Explicit exclusions

- No background execution.
- No user-authored scripts or arbitrary action JSON in the operator UI.
- No webhooks, shell commands, cloud sync, accounts, telemetry, remote storage, or
  hosted workflow services.
- Preview must be read-only and must not create workflow definitions, runs, tasks,
  notes, tags, relationships, or search records.

## Files likely to change

- `packages/features/src/workflows/*`
- `packages/features/tests/*workflow*`
- `apps/desktop/src/preload/api.ts`
- `apps/desktop/src/main/ipc/*workflow*`
- `apps/desktop/src/main/ipc/index.ts`
- `apps/desktop/src/renderer/api/desktopApiClient.ts`
- `apps/desktop/src/renderer/pages/WorkflowsPage.tsx`
- `apps/desktop/tests/renderer/workflowsPage.test.tsx`
- `docs/help/templates-workflows.md`
- `docs/OPERATOR_RUNBOOK.md`

## Risks and assumptions

- The first beta templates are intentionally household-renovation-specific so the
  feature is useful and testable without exposing a general automation builder.
- Created tasks and notes are linked to the project by container placement; contact
  follow-up items also create local relationships to the selected contact.
- Full packaged screenshot evidence requires a runnable packaged app and a safe
  copy of the household QA workspace.

## Test and evidence plan

- Unit-test template definitions and allowed inputs.
- Prove preview does not mutate database rows.
- Prove execution creates tasks/notes, activity events, search records, workflow
  run history, and contact relationships where applicable.
- Prove optional inputs affect planned changes without enabling arbitrary
  actions or non-local behavior.
- Update renderer tests for template selection, preview, confirmation, results,
  and run history wording.
- Run lint/typecheck/test/build/package/package-smoke where the local environment
  allows, then record any blockers.
