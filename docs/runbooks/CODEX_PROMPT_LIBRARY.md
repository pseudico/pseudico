# Codex Prompt Library — Local Work OS

Use these prompts in Linear comments or GitHub PR comments.

---

# 1. Implementation prompt

```text
@Codex implement this issue.

Before coding:
1. Read AGENTS.md.
2. Read the linked docs and ticket pack section.
3. Summarise your understanding of the goal.
4. List files likely to change.
5. Identify risks and assumptions.
6. Provide an implementation plan.
7. Provide a test plan.

Constraints:
- Local-only desktop app.
- No cloud/mobile/team/public-sharing scope.
- No direct database access from React components.
- No direct filesystem access from renderer.
- Database access must go through repositories/services.
- Data-changing operations must create activity log entries.
- Searchable changes must update the search index.
- Keep the PR scoped to this Linear issue.

Then implement the smallest passing version and open a PR using the repo template.
```

---

# 2. Scaffold implementation prompt

```text
@Codex implement this scaffold ticket.

Goal: create or update the project foundation only.

Read:
- AGENTS.md
- docs/PRODUCT_SPEC.md
- docs/OPERATING_PLAN.md
- docs/tickets/M0_M1_TICKET_PACK.md

Do not implement product features beyond the scaffold scope.

Required output:
- Working pnpm commands where the ticket requires them
- Tests where practical
- PR with summary, scope, out-of-scope, and commands run
```

---

# 3. Database/migration prompt

```text
@Codex implement this database ticket.

Before coding, identify:
- tables changed
- migration required
- repository methods affected
- transaction requirements
- activity log impact
- search index impact

Rules:
- No destructive hard delete.
- Use soft-delete fields where relevant.
- Add indexes for expected query paths.
- Add migration/repository tests.
- Keep database access out of React components.
```

---

# 4. UI implementation prompt

```text
@Codex implement this UI ticket.

Rules:
- Keep business logic out of React components.
- Use services/hooks/API clients rather than raw DB access.
- Include empty, loading, and error states.
- Preserve keyboard/focus behaviour where relevant.
- Do not redesign unrelated screens.
- Add component/E2E tests where practical.
```

---

# 5. Electron IPC prompt

```text
@Codex implement this Electron IPC ticket.

Rules:
- Renderer must not access Node filesystem APIs directly.
- Renderer must not access SQLite directly.
- Expose only narrow typed preload methods.
- Validate all inputs in the main process/service layer.
- For file paths, enforce workspace-relative or workspace-contained paths.
- Add tests for pure validation/path helpers where practical.
```

---

# 6. Search prompt

```text
@Codex implement this search ticket.

Before coding, identify:
- searchable target types
- fields to index
- update triggers
- archived/deleted filtering
- ranking/grouping expectations

Rules:
- Do not query every row naively for normal search.
- Use the search index service boundary.
- Add tests for indexing and search results.
- Ensure tag/category changes update searchable metadata where relevant.
```

---

# 7. File/attachment prompt

```text
@Codex implement this file/attachment ticket.

Rules:
- Files must be copied into the workspace attachment folder unless the ticket explicitly says link-only.
- Store workspace-relative paths.
- Prevent path traversal.
- Handle missing files gracefully.
- Renderer must use typed IPC for file operations.
- Add tests for path utilities and metadata behaviour.
```

---

# 8. Test-only prompt

```text
@Codex add tests for this module/behaviour.

Do not change production behaviour unless needed to make the code testable.

Focus on:
- missing edge cases
- regression coverage
- service/repository behaviour
- activity log/search index integration

Open a PR with only test changes unless a small production fix is required.
```

---

# 9. PR review prompt

```text
@codex review this PR against:
- AGENTS.md
- .github/codex/review-guidelines.md
- docs/PRODUCT_SPEC.md
- docs/OPERATING_PLAN.md
- linked Linear issue

Focus on:
- architecture violations
- local-only violations
- missing tests
- data writes without activity log entries
- search index inconsistencies
- unsafe IPC/filesystem use
- schema/migration risks
- scope creep

Return:
- summary
- P0/P1 issues
- missing tests
- suggested fixes
- human-review questions
```

---

# 10. Fix CI prompt

```text
@Codex inspect the failing CI on this PR and fix only the failing checks.

Do not add unrelated features.
Do not change the architecture unless the failure proves the current architecture is broken.
Keep the fix scoped to the linked Linear issue.
Explain which command failed and what changed.
```

---

# 11. Split large ticket prompt

```text
@Codex review this Linear issue and split it into smaller implementation tickets.

Each ticket must include:
- goal
- scope
- out of scope
- acceptance criteria
- test requirements
- dependencies
- suggested estimate

Do not implement code.
```

---

# 12. ADR prompt

```text
@Codex draft an ADR for this decision.

Include:
- status
- context
- decision
- alternatives considered
- consequences
- links to spec/tickets/PRs

Do not implement code.
```
