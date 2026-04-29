# Local Work OS — Non-Technical Owner Supervision Checklist

This is the checklist to use when Codex opens a PR.

You do not need to understand every line of code. You are checking process, scope, and product behaviour.

---

# 1. Before assigning Codex

Check:

```text
[ ] Issue is in the current wave.
[ ] Issue has clear scope.
[ ] Issue links to relevant docs/ticket pack.
[ ] Issue has acceptance criteria.
[ ] Issue has test requirements.
[ ] Issue is small enough for one PR.
[ ] No unresolved product decision remains.
```

If not, ask Codex for planning only.

---

# 2. When Codex posts its plan

Check:

```text
[ ] The plan matches the ticket.
[ ] It lists files/modules you expected.
[ ] It does not mention cloud/mobile/team features.
[ ] It does not try to build future scope.
[ ] It mentions tests.
[ ] It mentions risks.
```

If the plan seems too broad, reply:

```text
Please reduce this plan to the exact ticket scope and list what you are excluding.
```

---

# 3. When Codex opens a PR

Check the PR body:

```text
[ ] Linear issue is linked.
[ ] Scope is clear.
[ ] Out-of-scope items are listed.
[ ] Tests are listed.
[ ] Manual QA steps are provided.
[ ] Known limitations are listed.
[ ] Plain-English summary exists.
[ ] No cloud/mobile/team features were added.
```

Check GitHub:

```text
[ ] CI checks pass, or Codex explains failures.
[ ] @codex review has been requested or automatic review ran.
[ ] Review comments are addressed.
[ ] No large unrelated changes are obvious.
```

---

# 4. Red flags

Do not merge if:

```text
[ ] CI failed.
[ ] Codex says tests were not run and gives no good reason.
[ ] PR changes many unrelated files.
[ ] Codex added cloud/backend/mobile code.
[ ] Codex added a new dependency without explanation.
[ ] Codex changed database schema without migration notes.
[ ] Codex rewrote large parts of the app unnecessarily.
[ ] Codex skipped activity logging for a data write.
[ ] Codex put filesystem/database work in React renderer.
[ ] The PR summary is unclear.
```

---

# 5. Safe approval checklist

Before merging:

```text
[ ] CI passed.
[ ] Codex review has no unresolved P0/P1 issues.
[ ] PR matches the Linear issue.
[ ] You understand the plain-English summary.
[ ] Manual QA steps are possible and sensible.
[ ] Follow-up issues are noted if needed.
```

Only then merge.

---

# 6. Useful owner replies

## Ask for less scope

```text
This is too broad. Please keep only the work needed for the acceptance criteria and propose the rest as follow-up tickets.
```

## Ask for plain-English explanation

```text
Please explain this PR in plain English for a non-technical product owner: what changed, how I can test it, and what risks remain.
```

## Ask to fix tests

```text
Please fix the failing checks only. Do not add new functionality.
```

## Ask to update docs

```text
Please update only the relevant docs to reflect this implemented change. Do not invent future behaviour.
```

## Ask to stop

```text
Please stop implementation and mark this issue blocked. Give me the decision that needs human approval and your recommended option.
```
