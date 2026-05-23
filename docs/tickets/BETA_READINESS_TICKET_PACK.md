# Pseudico Nontechnical Beta Readiness Ticket Pack

Created: 2026-05-23  
Audience: nontechnical beta testers  
Linear project: [Pseudico Nontechnical Beta Readiness](https://linear.app/pseudico/project/pseudico-nontechnical-beta-readiness-a30dca03eaad)

## Beta-ready definition

Pseudico is beta-ready for nontechnical testers only when:

1. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm package`,
   `pnpm package:smoke`, `pnpm release:package-check`, and
   `pnpm audit:dependencies` pass from a clean workspace.
2. PSE-249 through PSE-254 are fixed, reviewed, merged, and rechecked against
   their original household-renovation evidence.
3. Complete deliberate packaged-app QA has no unresolved P0/P1 blocker.
4. A fresh beta artifact has package metadata/checksums and a nontechnical
   tester handoff pack.
5. Owner records a final go/no-go decision.

## Linear ticket sequence

| Issue | Purpose | Current beta disposition |
| --- | --- | --- |
| PSE-261 | Master nontechnical beta gate | Spec Ready; final owner decision remains required. |
| PSE-262 | Clean verification/package reproducibility | Done; PR #229 merged (`5e59de10761c8acc5a5ac8989e3ec187058340c1`) after Codex review. |
| PSE-263 | Coordinate HRQA trust-bug closure | In progress; PR #227 merged, PSE-249/PSE-251/PSE-254 have packaged evidence, and PSE-250/PSE-252/PSE-253 still need packaged user-visible evidence before final HRQA gate closure. |
| PSE-264 | Complete deliberate packaged-app functionality pass | Pending PSE-262 and HRQA reconciliation. |
| PSE-265 | Tester handoff package/checksums/runbook/rollback | Pending fresh beta candidate package. |
| PSE-266 | Final go/no-go/docs sync/merge audit | Pending prior beta gates. |

## Existing HRQA tickets under beta workstream

| Issue | Problem | Beta disposition |
| --- | --- | --- |
| PSE-249 | Contact detail route showed `Contact not found`. | Implemented/merged in PR #227 with packaged direct-route and project-relationship evidence; no P0/P1 known. |
| PSE-250 | Search count appeared while cards remained loading. | Implemented/merged in PR #227; code/tests pass, but packaged `retrospective` / `Painting weekend` screenshots remain a P2 evidence gap. |
| PSE-251 | Project Display settings save failed. | Implemented/merged in PR #227 with packaged persisted Compact-mode evidence; no P0/P1 known. |
| PSE-252 | Today metrics did not reconcile with visible lanes. | Implemented/merged in PR #227; PR body recorded P2 packaged transition-evidence gap. |
| PSE-253 | Duplicate-looking attachment search results. | Implemented/merged in PR #227; PR body recorded P2 packaged screenshot gap. |
| PSE-254 | Project header showed `TAGS Placeholder`. | Implemented/merged in PR #227 with packaged real-tag/header evidence; no P0/P1 known. |
| PSE-267 | Capture remaining HRQA packaged evidence for Search/Today/attachments. | Created as the explicit P2 follow-up for PSE-250/PSE-252/PSE-253 evidence gaps before PSE-263 can close. |

## PR / merge standard for beta tickets

A beta ticket should not be marked done until its final Linear comment includes:

- PR URL.
- Review status/outcome.
- Merge commit or merge confirmation.
- Commands run.
- Manual QA/screenshot evidence paths where user-visible.
- Root-cause and fix assessment.
- Residual caveats or explicit “none known”.

## Non-goals for beta

- Public release readiness.
- Code signing/notarization unless separately approved.
- Auto-update, hosted accounts, cloud sync, telemetry, mobile apps, billing,
  public sharing, or team collaboration.
