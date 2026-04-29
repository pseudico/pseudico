# Local Work OS — Codex Prompt Library

Use these prompts in Linear issue comments, GitHub PR comments, or the Codex app.

Replace bracketed values like `[ISSUE_KEY]` before use.

---

# 1. Validation issue prompt

Use this before real implementation.

```text
@Codex please validate the Local Work OS GitHub/Linear workflow.

Goal:
Prove that Codex can read this repository, create a branch, make a tiny docs-only change, open a PR, and report back in Linear.

Context:
Read:
- AGENTS.md
- docs/CODEX_AUTOPILOT_RUNBOOK.md if present
- docs/AGENTIC_DEVELOPMENT_PROTOCOL.md if present

Scope:
- Create docs/WORKFLOW_VALIDATION.md.
- Add a short note confirming the repo, Linear issue, PR template, and CI workflow were detected.
- Do not create app code.
- Do not install dependencies.
- Do not change product docs except this validation file.

Out of scope:
- No Electron setup.
- No database setup.
- No package installation.
- No feature implementation.

Before coding:
1. Post a short plan in this Linear issue.
2. List the files you will create or modify.
3. State any setup problems you notice.

Done when:
- Branch created.
- PR opened using the GitHub template.
- This Linear issue has a PR link.
- Any CI status is reported.
```

---

# 2. Standard implementation prompt

```text
@Codex please implement [ISSUE_KEY]: [ISSUE_TITLE].

Goal:
Implement the ticket exactly as written.

Read first:
- AGENTS.md
- docs/PRODUCT_SPEC.md
- docs/DATA_MODEL.md
- docs/ARCHITECTURE.md
- docs/CODEX_AUTOPILOT_RUNBOOK.md
- the relevant ticket pack section for [ISSUE_KEY]
- existing code in the affected modules

Constraints:
- Keep this local-only.
- Do not add cloud, mobile, team, or hosted backend functionality.
- Do not add unrelated features.
- Do not bypass the Electron preload IPC boundary.
- Do not put database calls directly in React components.
- Data-changing operations must create activity log entries unless this ticket is purely scaffold/docs and no write path exists yet.
- Searchable data changes must update the search-index path once search indexing exists.
- Use soft delete patterns where relevant.

Before coding:
1. Comment with your understanding.
2. List expected files to change.
3. Identify risks.
4. Provide a short implementation plan.
5. Provide a test plan.

Implementation:
- Create branch `[ISSUE_KEY]/[short-slug]`.
- Implement the smallest complete version.
- Add/update tests.
- Run relevant checks.
- Open a PR with the repo PR template.

Done when:
- Acceptance criteria are met.
- Tests pass or failures are explained with logs.
- PR is opened.
- Linear is updated with PR link, summary, tests, manual QA, and known limitations.
```

---

# 3. Planning-only prompt

Use when a ticket is large or ambiguous.

```text
@Codex please plan [ISSUE_KEY] only. Do not write production code yet.

Goal:
Turn this issue into a safe implementation plan.

Read:
- AGENTS.md
- linked spec sections
- relevant existing modules

Output required:
1. Restatement of the goal.
2. Files/modules involved.
3. Data model impact.
4. Architecture risks.
5. Suggested implementation steps.
6. Tests to add.
7. Whether this issue should be split.
8. Suggested follow-up Linear tickets if split is needed.

Do not create a PR unless explicitly instructed.
```

---

# 4. PR review prompt

Use in a GitHub PR comment.

```text
@codex review this PR against:
- AGENTS.md
- docs/PRODUCT_SPEC.md
- docs/DATA_MODEL.md
- docs/ARCHITECTURE.md
- docs/CODEX_AUTOPILOT_RUNBOOK.md
- .github/codex/review-guidelines.md

Focus on:
- local-only violations
- architecture boundary violations
- missing activity log events
- search-index consistency
- unsafe database migrations
- unsafe filesystem or Electron patterns
- missing tests
- scope creep beyond the linked Linear issue
- unclear non-technical summary

Only flag P0/P1 issues unless a lower-severity issue could compound later.
```

---

# 5. Fix CI prompt

Use on a PR when CI fails.

```text
@codex fix the CI failures in this PR.

Rules:
- Do not add new features.
- Do not change product scope.
- Fix only what is necessary to make CI pass.
- Start by reading the failing logs.
- Explain the root cause in plain English.
- Run the narrow failing command first, then the full required checks.
- Update the PR summary with what changed.
```

---

# 6. Fix review comments prompt

```text
@codex please address the review comments on this PR.

Rules:
- Fix only the reviewed issues.
- Do not add unrelated functionality.
- If any comment requires a product decision, stop and ask in the PR instead of guessing.
- Re-run affected tests and report results.
```

---

# 7. Scope-control prompt

Use when Codex drifted.

```text
@Codex please reduce this work back to the original scope of [ISSUE_KEY].

Problem:
The current branch appears to include work outside the ticket scope.

Instructions:
1. Identify all changes that are outside scope.
2. Revert or remove them unless they are strictly required for the ticket.
3. Keep only the minimum implementation needed for the acceptance criteria.
4. Update the PR summary to list what was removed.
5. If the extra work is valuable, propose separate follow-up Linear issues.
```

---

# 8. Test-only prompt

```text
@Codex please add tests for [MODULE/BEHAVIOUR] without changing production behaviour unless strictly necessary for testability.

Focus:
- Unit tests for domain/service logic
- Repository tests for database logic
- Component/E2E tests only where valuable

Do not:
- add new features
- rewrite the module
- change public behaviour
```

---

# 9. Ticket split prompt

```text
@Codex please split this issue into smaller Codex-ready Linear tickets.

Use the project ticket format:
- title
- goal
- scope
- out of scope
- dependencies
- acceptance criteria
- test requirements
- Codex prompt

Rules:
- Each ticket should be one PR.
- Avoid tickets that touch more than two major modules.
- Put schema/repository/UI work into separate tickets where practical.
- Preserve the intended sequence.
```

---

# 10. Documentation sync prompt

```text
@Codex please sync the documentation after this implementation.

Read the merged PR and update only the relevant docs:
- docs/ARCHITECTURE.md
- docs/DATA_MODEL.md
- docs/TESTING.md
- docs/MODULE_REGISTRY.md
- docs/DECISIONS/ if a major decision was made

Do not invent future features.
Document only what is implemented or decided.
Open a docs-only PR.
```

---

# 11. Linear import planning prompt

Use only if Codex has Linear MCP/tooling access.

```text
@Codex please prepare Linear import for the next ticket wave.

Wave:
[WAVE NAME]

Read:
- docs/MASTER_TICKET_INVENTORY.md
- relevant ticket pack markdown
- docs/CODEX_AUTOPILOT_RUNBOOK.md

Task:
1. Identify tickets for this wave only.
2. Confirm dependencies.
3. Produce an import-ready list with title, description, labels, milestone, estimate, and status.
4. Do not import/create issues until I approve the list.

If you cannot access Linear issue creation safely, output manual instructions instead.
```

---

# 12. Release readiness prompt

```text
@Codex please assess release readiness for [MILESTONE].

Review:
- open Linear issues in the milestone if available
- merged PRs since the last milestone
- CI status
- test coverage map
- docs status
- known risks

Output:
1. Ready / Not ready recommendation.
2. Blocking issues.
3. Risky areas needing human testing.
4. Suggested smoke test script.
5. Follow-up tickets.
```
