# PSE-224 Workflow Scaffold QA

Date: 2026-05-17  
Issue: PSE-224 — Clarify and complete workflows operator UX for pilot handoff  
Decision: **Scaffold only for internal pilot**

## Environment

- Branch: `codex/pse-224-workflows-operator-ux`
- Base commit: `16912ead` (`PSE-223 Add packaged importer QA coverage (#204)`)
- OS: Microsoft Windows NT 10.0.26200.0, Codex desktop environment
- Node/pnpm: Node `v22.21.1`, pnpm `10.25.0`
- App mode: built source renderer served locally for screenshot; packaged app
  build/smoke also run

## Operator UX result

The Workflows route is now a **Workflow Lab** reference surface. It tells a
primary operator that workflow automation is not pilot-supported daily
automation and that there is no packaged create/edit/run/history workflow UI.

## Evidence

| Evidence | Path | Result |
|---|---|---|
| Workflow Lab final UI screenshot | `docs/manual-qa/screenshots/PSE-224-workflow-scaffold/workflow-lab.png` | Pass; shows Workflow Lab nav label, Future/scaffold status, no-run-UI warning, and unsupported webhook rejection |
| Renderer scaffold-copy test | `apps/desktop/tests/renderer/workflowsPage.test.tsx` | Pass |
| Workflow service/loop guard tests | `packages/features/tests/workflowService.test.ts`, `packages/features/tests/workflowSchema.test.ts` | Pass via targeted feature test run |
| Packaged app smoke | `pnpm package:smoke` | Pass |

## Acceptance notes

- Primary operator status is explicit: future/scaffold, no run UI.
- Unsupported non-local workflow triggers/actions remain visibly rejected.
- Activity/search/loop guard behavior remains service-tested rather than newly
  exposed in the renderer.
- Out of scope remains unchanged: no cloud automation, hosted webhooks, team
  workflows, remote storage, or broad no-code builder.

## Visual/operator assessment

- Primary operator goal: understand whether workflows can be used for daily
  automation during the pilot.
- Visually dominant: "Not pilot-supported for daily automation" appears before
  registry details and validation examples.
- Secondary: service registry, rejected network workflow example, and run
  history/rollback details remain maintainer evidence.
- Next safe action: copy directs the operator back to Today, tasks, lists,
  templates, and manual review.
