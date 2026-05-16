# Operator Handoff Plan

Status: draft plan
Created: 2026-05-15
Goal: move Pseudico from pilot-ready toward nontechnical operator handoff

## Readiness ladder

| Level | Meaning | Current assessment |
|---|---|---|
| Not ready | Major blockers prevent safe real use | No longer the likely state based on current automated evidence |
| Pilot ready | Technical/internal operator can use with caveats | Current best-fit verdict |
| Operator ready | Nontechnical operator can use with a runbook | Target of this plan |
| Release ready | Packaged, documented, supportable, signed/audited/regression-tested | Later distribution target |

## Current blockers to nontechnical handoff

1. No complete fresh-workspace operator journey evidence through the real app.
2. Backup/restore has not been proven as a complete operator recovery path.
3. Operator runbook is not yet sufficient for nontechnical use.
4. Failure modes are not yet matrixed with recovery instructions and evidence.
5. Release dependency/license/privacy audit gate is not complete.
6. Local-only security posture needs end-to-end no-unexpected-network evidence.
7. Activity/search consistency needs cross-feature reconciliation evidence.
8. UI performance and packaged-app release-candidate checks need handoff evidence.

## Linear execution design

Use `docs/tickets/OPERATOR_READINESS_TICKET_PACK.md` as the source for Linear
issues. Suggested import order:

### Wave OR-A ? prove real use and recovery

- PSE-OR-001 ? Add full fresh-workspace operator smoke
- PSE-OR-002 ? Add backup/restore golden workflow
- PSE-OR-003 ? Write nontechnical operator runbook

Exit gate:

- A nontechnical operator can follow the draft runbook on a disposable workspace.
- Created data survives restart.
- Backup/restore into a clean workspace works with attachments.

### Wave OR-B ? prove safe failure behavior

- PSE-OR-004 ? Add failure-mode regression matrix
- PSE-OR-006 ? Verify local-only security and network behavior end to end
- PSE-OR-007 ? Add activity/search/data-integrity reconciliation audit

Exit gate:

- P0/P1 failure modes have tests or manual QA.
- No silent data-loss scenarios are known and unresolved.
- Local-only promise is backed by evidence.

### Wave OR-C ? prove supportability and release-candidate quality

- PSE-OR-005 ? Add release dependency and license audit gate
- PSE-OR-008 ? Complete large-workspace UI performance and responsiveness QA
- PSE-OR-009 ? Harden release-candidate packaging and distribution evidence

Exit gate:

- A release-candidate checklist can be run by someone other than the developer.
- Dependency/license/network risks are documented.
- Performance and packaging limits are honest.

### Wave OR-D ? final go/no-go

- PSE-OR-010 ? Produce final operator-readiness certification report

Exit gate:

- Verdict is Operator ready only if every P0/P1 issue is fixed or explicitly
  accepted by the owner with runbook coverage.

## Nontechnical handoff package

Before handoff, prepare a folder or release bundle containing:

- Packaged Pseudico build or clear launch instructions.
- `docs/OPERATOR_RUNBOOK.md`.
- `docs/OPERATOR_READINESS_REPORT.md`.
- Backup-before-use and backup-before-upgrade instructions.
- Known limitations and escalation instructions.
- Checksums/signing notes if external distribution is intended.

## Risk disposition standard

Each risk must be closed in one of four ways:

- **Fixed**: code/docs/tests changed and evidence is linked.
- **Tested acceptable**: behavior is safe and documented.
- **Owner accepted**: risk remains, but owner explicitly accepts it for pilot/operator use.
- **Blocked**: cannot hand off until resolved.

No P0 risk may remain merely "known" for operator-ready status.

## Suggested Codex operating rule

For every operator-readiness issue, require the PR body to include:

```text
Operator handoff impact:
- User journey affected:
- Data safety impact:
- Recovery/runbook impact:
- Tests/evidence:
- Remaining limitations:
```

A PR that changes behavior but does not update evidence or runbook material should
not be considered complete for this hardening program.
