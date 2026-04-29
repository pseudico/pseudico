# Codex Setup Runbook — Local Work OS

Codex should operate as an implementation and review agent for scoped Linear issues.

OpenAI's Codex Linear setup flow is:

```text
1. Set up Codex cloud tasks by connecting GitHub in Codex and creating an environment for the repository.
2. Install Codex for Linear in Codex settings.
3. Link Linear by mentioning @Codex in a Linear issue comment.
```

Codex GitHub PR review can be triggered with:

```text
@codex review
```

on a GitHub pull request once the integration is configured.

---

# 1. Before connecting Codex

Make sure the repo has:

```text
AGENTS.md
.github/codex/review-guidelines.md
docs/PRODUCT_SPEC.md
docs/OPERATING_PLAN.md
```

Codex should see these before doing real work.

---

# 2. Codex repository environment

Configure the environment for:

```text
Repository: local-work-os
Default branch: main
Package manager: pnpm
Node version: repo-defined, otherwise current LTS
```

The environment should be able to run:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Early in the project some commands may not exist yet. The scaffold tickets should create them.

---

# 3. First Codex task

Do not start with a big implementation.

Use:

```text
LWO-1 — Validate Linear/Codex/GitHub workflow
```

Ask:

```text
@Codex please create a tiny PR that adds docs/WORKFLOW_VALIDATION.md. Use the PR template. Do not change anything else.
```

---

# 4. Delegating implementation work from Linear

Use this comment pattern:

```text
@Codex implement this issue.

Before coding:
1. Read AGENTS.md.
2. Read the linked spec sections.
3. Produce a short plan.
4. List files likely to change.
5. Identify risks.
6. Confirm the test plan.

Then implement the smallest version that satisfies the acceptance criteria.
```

---

# 5. Delegating review work from GitHub

On a PR, comment:

```text
@codex review this PR against AGENTS.md, .github/codex/review-guidelines.md, docs/PRODUCT_SPEC.md, docs/OPERATING_PLAN.md, and the linked Linear issue.

Focus on:
- local-only violations
- architecture boundary violations
- missing tests
- data writes without activity log events
- search index inconsistencies
- unsafe filesystem or IPC behaviour
- schema/migration risks
- scope creep
```

---

# 6. When Codex should not be assigned

Do not assign Codex when:

```text
The issue is vague.
The issue includes unresolved product decisions.
The issue is estimated 8.
The feature touches too many modules in one PR.
The task requires visual judgement without precise criteria.
The task involves legal/licensing decisions.
The task would add cloud/mobile/team scope.
```

Use a Spike or Spec Draft issue first.

---

# 7. How to judge Codex output

Accept Codex output only when:

```text
It stayed in scope.
It updated tests.
It did not bypass architecture rules.
It did not add hidden dependencies.
It did not introduce cloud scope.
It filled the PR template.
It honestly described limitations.
CI passes.
```

---

# 8. Repeated mistakes

If Codex repeats the same mistake, update:

```text
AGENTS.md
.github/codex/review-guidelines.md
specific package-level AGENTS.md
Linear issue template wording
```

Examples:

```text
Mistake: direct DB calls from React components.
Fix: add stronger instruction to AGENTS.md and create a review checklist item.

Mistake: missing activity events.
Fix: add "activity log required" to issue template and review guidelines.
```
