# Linear Master Issue — Codex Project Manager Setup

Use this only after the validation issue succeeds.

## Title

LWO-PM-001 — Prepare M0/M1 ticket wave for supervised Codex execution

## Goal

Have Codex act as a project-management helper to prepare the first implementation wave, without writing production code.

## Scope

- Read the M0/M1 ticket pack.
- Identify exact tickets for Wave 1.
- Confirm suggested order and dependencies.
- Identify tickets that should be plan-only.
- Identify tickets that can be parallelised later.
- Produce a Linear import/checklist summary.

## Out of scope

- No production code.
- No automatic assignment of all tickets.
- No importing M2+ tickets yet.
- No changes to repository files unless explicitly requested.

## Codex prompt

```text
@Codex please act as project manager for the first implementation wave only.

Goal:
Prepare M0/M1 tickets for supervised execution.

Read:
- AGENTS.md
- docs/CODEX_AUTOPILOT_RUNBOOK.md
- docs/PROJECT_MANAGER_AGENT_INSTRUCTIONS.md
- docs/M0_M1_SCAFFOLD_DATABASE_TICKET_PACK.md
- docs/MASTER_TICKET_INVENTORY.md if present

Do not write production code.
Do not start implementation tickets.
Do not import/create M2+ issues.

Output:
1. M0/M1 ticket list in recommended order.
2. Dependencies for each ticket.
3. Which tickets should be plan-only first.
4. Which tickets are safe to run in parallel later.
5. Suggested labels/status/estimate for each.
6. Recommended first real implementation ticket.
7. Risks the owner should watch.

If you have Linear issue creation access, do not create issues until I approve your prepared list.
```
