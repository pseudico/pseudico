# Complete examination issue candidates — corrective status

| Issue | Prior failure | Corrective status | Follow-up |
| --- | --- | --- | --- |
| CE-20260523-001 / PSE-255 | Valid contact route rendered `Contact not found`. | Automated renderer route regression passes on current main-based branch. | P2 screenshot recapture before release sign-off. |
| CE-20260523-002 / PSE-256 | Portable bundle export failed on long Windows paths. | Feature regression verifies shortened paths and manifest source mapping. | P2 packaged long-data export screenshot/evidence. |
| CE-20260523-003 / PSE-257 | CSV preview accepted `@tag` rows that execution rejected. | Parser now normalizes whitespace/comma/semicolon tag tokens and strips `@`; preview/execute agree. | None beyond optional packaged fixture import evidence. |
| CE-20260523-004 / PSE-258 | List lifecycle/pipeline calls rejected returned identifiers. | IPC now accepts string IDs and returned summary objects for lifecycle/pipeline calls. | P2 packaged checklist click-through before release sign-off. |
| CE-20260523-005 / PSE-259 | Root lint included disposable QA/worktree artifacts. | Lint discovery excludes disposable/generated/manual-QA helper artifacts. | None. |
| CE-20260523-006 / PSE-260 | Root test included duplicate worktrees and failed regressions. | Test discovery excludes accidental worktrees/evidence; root suite passes. | None. |
