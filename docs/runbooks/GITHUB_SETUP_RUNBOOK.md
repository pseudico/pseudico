# GitHub Setup Runbook — Local Work OS

GitHub is the code source of truth.

Use GitHub for:

```text
source code
branches
pull requests
CI checks
reviews
release tags
packaging workflows
```

Use Linear for work tracking, not GitHub Issues, unless you intentionally decide otherwise.

---

# 1. Repository setup

Create repository:

```text
local-work-os
```

Recommended:

```text
Visibility: private
Default branch: main
Issues: disabled or unused
Discussions: disabled initially
Wiki: disabled initially
Allow squash merge: yes
Allow merge commits: no initially
Allow rebase merge: optional
Automatically delete head branches: yes
```

---

# 2. Required files

Commit these immediately:

```text
AGENTS.md
README.md
docs/PRODUCT_SPEC.md
docs/OPERATING_PLAN.md
docs/COVERAGE_MATRIX.md
docs/tickets/MASTER_TICKET_INVENTORY.md
.github/pull_request_template.md
.github/workflows/ci.yml
.github/codex/review-guidelines.md
```

---

# 3. Branch naming

Every feature branch should include the Linear issue key.

```text
LWO-12/create-workspace-service
LWO-35/add-task-repository
LWO-91/add-global-search-index
```

Avoid:

```text
fix-stuff
new-feature
codex-work
```

---

# 4. PR title convention

```text
LWO-12: Create workspace filesystem service
```

---

# 5. Merge policy

Recommended:

```text
Squash merge PRs into main.
Require CI.
Require review.
Require Codex review for implementation PRs.
Human remains final merge gate.
```

---

# 6. Commit convention

Use conventional-style messages:

```text
feat(workspace): add local workspace validation service
feat(db): add initial schema migration
fix(search): update FTS records after tag rename
test(tasks): add task completion service tests
docs(operating): clarify Codex readiness gate
```

---

# 7. GitHub/Codex review flow

For each PR:

```text
1. CI starts automatically.
2. Comment: @codex review
3. Read Codex review.
4. Fix P0/P1 issues.
5. Run/confirm CI.
6. Human reviews.
7. Squash merge.
8. Move Linear issue to Done.
```

OpenAI's GitHub integration supports PR review by commenting `@codex review` on a pull request once the integration is configured.

---

# 8. First validation PR

Create one tiny PR before real implementation:

```text
LWO-1: Validate workflow
```

It should change something harmless, for example:

```text
docs/WORKFLOW_VALIDATION.md
```

Use it to prove:

```text
branch naming works
PR template works
CI runs
Codex review works
human merge works
Linear status changes work
```
