# Codex Failure Handling

Use this when Codex produces poor output, gets stuck, or creates an unsafe PR.

---

# 1. Codex added unrelated scope

Action:

```text
Do not merge.
Comment on the PR:

@Codex this PR includes scope beyond the linked Linear issue. Please remove unrelated changes and keep only the acceptance criteria listed in LWO-___.
```

Then update the Linear issue if the scope was ambiguous.

---

# 2. Codex skipped tests

Action:

```text
@Codex add the required tests for this issue. Focus on service/repository behaviour first. Do not add new features.
```

If repeated, strengthen `AGENTS.md` and the issue template.

---

# 3. Codex violated architecture rules

Examples:

```text
React component calls SQLite directly.
Renderer uses fs directly.
Write operation does not log activity.
Searchable data change does not update search index.
```

Action:

```text
@Codex refactor this PR to respect AGENTS.md architecture rules. Specifically fix: [list violations]. Keep behaviour unchanged and update tests.
```

---

# 4. Codex cannot complete the ticket

Action:

```text
Move issue to Blocked or Spec Draft.
Ask Codex for a written blocker summary.
Split the ticket or create a spike.
```

Prompt:

```text
@Codex stop implementation and summarise why this task is blocked. List the missing decisions, dependencies, or ambiguous requirements. Suggest smaller follow-up tickets.
```

---

# 5. Codex breaks CI repeatedly

Action:

```text
Ask for a minimal CI fix.
If still broken, close the PR and create a smaller issue.
```

Prompt:

```text
@Codex reduce this PR to the minimal passing implementation for the linked issue. Remove non-essential changes and fix CI.
```

---

# 6. Codex makes a risky data migration

Action:

```text
Do not merge.
Require migration tests and backup implications.
Ask for a migration review.
```

Prompt:

```text
@Codex review this migration for safety. Confirm whether it can run on existing workspaces without data loss. Add or update migration tests.
```
