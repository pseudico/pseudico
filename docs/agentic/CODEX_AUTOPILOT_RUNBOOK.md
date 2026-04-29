# Local Work OS — Codex Autopilot Runbook

Purpose: give Codex enough durable instruction to help build Local Work OS agentically while a non-technical product owner supervises.

Scope: local-only desktop app, GitHub repository, Linear work tracking, Codex implementation/review, CI validation, human merge approval.

---

# 1. Operating model

The project should run in a supervised agentic loop:

```text
Linear issue
  -> Codex plan
  -> Codex branch
  -> Codex implementation
  -> tests and CI
  -> GitHub PR
  -> Codex PR review
  -> human owner review
  -> merge by human
  -> Linear issue closed
  -> follow-up tickets proposed
```

Codex is treated as an implementation teammate, not as an unsupervised release manager.

Codex may work semi-autonomously within a ticket, but must not self-merge or bypass review.

---

# 2. Source-of-truth order

When there is a conflict, use this priority order:

1. `AGENTS.md`
2. The current Linear issue
3. `docs/PRODUCT_SPEC.md`
4. `docs/DATA_MODEL.md`
5. `docs/ARCHITECTURE.md`
6. Relevant ticket pack section
7. Existing code and tests
8. Codex assumptions

If a conflict cannot be resolved safely, Codex must stop and ask for a human decision in Linear.

---

# 3. Codex work modes

## 3.1 Planning mode

Use for:

- ambiguous tickets
- estimate 5+ tickets
- schema changes
- Electron/file-system/security work
- anything touching more than two modules

Planning output must include:

```text
Understanding
Files likely to change
Risks
Implementation plan
Test plan
Questions / assumptions
Suggested split if too large
```

## 3.2 Implementation mode

Use for scoped tickets with clear acceptance criteria.

Implementation output must include:

```text
Plan summary
Branch name
Files changed
Tests added
Commands run
Known limitations
PR link
Linear update text
```

## 3.3 Review mode

Use for PR reviews.

Review output must focus on P0/P1 issues:

```text
Architecture boundary violations
Local-only violations
Missing tests
Migration/data risks
Activity log gaps
Search-index gaps
Electron security issues
Scope creep
```

## 3.4 Fix mode

Use after CI failure or review comments.

Fix mode rules:

```text
Do not add new features.
Do not rewrite unrelated code.
Fix only the failure/review item.
Run the narrow failing test first.
Then run full required checks.
```

---

# 4. Work wave sequence

Do not work randomly across all 183+ tickets.

Use this order:

```text
Wave 0: Validation issue only
Wave 1: M0/M1 scaffold + database
Wave 2: M2/M3 core object graph and work objects
Wave 3: M4/M5 metadata, search, Today, dashboard, files
Wave 4: M6 MVP stabilisation
Wave 5: M7/M8 V1/V2 local depth
Wave 6: M9-M14 full-scope parity expansion
```

A later wave must not begin until the previous wave exit gate is satisfied.

---

# 5. Parallelism rules

At the beginning:

```text
Only one Codex implementation task at a time.
```

After M1 is stable:

```text
Maximum 2-3 parallel implementation tasks.
```

Parallel tasks must not touch the same module or files.

Safe parallel combinations:

```text
Docs task + UI task
Test-only task + unrelated feature task
Search service task + static settings page task
```

Unsafe parallel combinations:

```text
Two schema changes
Two tasks touching Electron preload/main IPC
Task service + Today view using task service
File service + backup service touching filesystem conventions
```

Codex must warn the human owner if an issue may conflict with another open PR.

---

# 6. Ticket execution protocol

For every ticket Codex must:

1. Read `AGENTS.md`.
2. Read linked spec/ticket sections.
3. Inspect relevant existing code.
4. Produce a short plan before coding.
5. Create a branch named after the Linear key.
6. Implement the smallest scoped version.
7. Add or update tests.
8. Run required checks.
9. Open a PR using the template.
10. Post a Linear progress/completion comment.
11. Request or support Codex PR review.
12. If review/CI fails, fix only the scoped issue.

---

# 7. Branch and PR rules

Branch format:

```text
<linear-key>/<short-slug>
```

Example:

```text
LWO-M1-004/sqlite-drizzle-migration-runner
```

PR title:

```text
<LWO key>: <ticket title>
```

Example:

```text
LWO-M1-004: Add SQLite/Drizzle database connection and migration runner
```

PR body must use `.github/pull_request_template.md`.

---

# 8. Required checks by ticket type

## 8.1 Any production-code ticket

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If the scaffold is not yet mature enough for all commands, Codex must explain which commands are not available yet and why.

## 8.2 Database ticket

Must include:

```text
migration or schema change
repository/service test
migration verification
activity-log consideration
search-index consideration
```

## 8.3 UI ticket

Must include:

```text
empty state
error state where relevant
loading state where relevant
component or E2E test where practical
manual QA steps
screenshot/screen recording if possible
```

## 8.4 File-system/Electron ticket

Must include:

```text
typed IPC boundary
no direct renderer filesystem access
workspace-relative paths
path traversal prevention
missing-file handling
file utility tests
```

---

# 9. Stop conditions

Codex must stop and mark the issue `Blocked` or ask for human approval if it would need to:

```text
add cloud/backend/mobile/team features
change architecture materially
add a new production dependency
make a destructive database migration
hard-delete user data
bypass activity logging
bypass search indexing for searchable data
access files directly from renderer
merge PRs
disable CI or branch protection
change more than the ticket scope
```

---

# 10. Linear update protocol

At minimum, Codex should comment in Linear at these points:

## Start comment

```text
I have started this issue.
Plan:
- ...
Branch: ...
Expected files: ...
Risks: ...
```

## PR opened comment

```text
PR opened: <link>
Summary:
- ...
Tests:
- ...
Known limitations:
- ...
Manual QA:
- ...
```

## Blocked comment

```text
Blocked because: ...
Options:
1. ...
2. ...
Recommendation: ...
```

## Done comment

```text
Merged PR: <link>
What changed:
- ...
Follow-up tickets suggested:
- ...
```

---

# 11. Human-supervision summary requirement

Every PR must contain a section written for a non-technical owner:

```text
Plain-English summary
What you can test manually
What this does not do yet
Risks to watch
```

Codex should avoid jargon in that section.

---

# 12. Recovery from agent mistakes

If Codex makes a mistake:

1. Do not merge.
2. Comment on the PR with the specific problem.
3. Ask Codex to fix only that issue.
4. If the same mistake occurs twice, update `AGENTS.md` or the relevant nested instruction file.
5. If the issue is architectural, create an ADR before further implementation.

---

# 13. Agentic but supervised target state

The target steady-state is:

```text
Owner imports a small batch of tickets
Owner moves 1-3 tickets to Codex Ready
Codex implements and opens PRs
CI and Codex review catch technical problems
Owner reviews plain-English summary and basic app behaviour
Owner merges only when confident
Codex proposes follow-ups
Owner controls sequencing
```

This gives high leverage without surrendering product control.
