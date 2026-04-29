# Local Work OS — Agentic Autonomy Levels

Use these levels to control how much freedom Codex has.

---

# Level 0 — Manual only

Use when setting up.

Codex may:

```text
answer questions
summarise docs
write draft plans
```

Codex may not:

```text
write code
open PRs
create Linear issues
```

---

# Level 1 — Supervised implementation

Recommended starting level.

Codex may:

```text
implement one assigned issue
create branch
write code
run tests
open PR
comment in Linear
```

Codex may not:

```text
merge PRs
pick its own next ticket
work in parallel without approval
change scope
create/delete many Linear issues
```

---

# Level 2 — Semi-agentic wave execution

Use after M1 is stable and the owner trusts the process.

Codex may:

```text
recommend next ticket in current wave
work on up to 2-3 approved tickets in parallel
fix CI failures on its own PRs
propose follow-up tickets
update docs after merged PRs
```

Codex may not:

```text
start a later wave without approval
merge PRs
add risky dependencies
make architecture changes without approval
```

---

# Level 3 — Automated triage/delegation

Use only after repeated successful PR cycles.

Codex may:

```text
receive selected Codex Ready issues through Linear triage rules
execute scoped tasks
create follow-up issues for approval
```

Guardrails required:

```text
Only current milestone
Only agent:codex-ready issues
No agent:do-not-delegate label
No open conflicting PR
Branch protection active
Human merge gate active
```

---

# Never allowed

At no level may Codex:

```text
merge PRs
bypass CI
bypass branch protection
ship releases without approval
add cloud/mobile/team scope
ignore stop conditions
```
