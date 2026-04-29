# Local Work OS — Project Manager Agent Instructions

These instructions apply when Codex is asked to act as a planning/project-management helper rather than an implementer.

---

# 1. PM agent responsibilities

Codex may help with:

```text
reading ticket packs
preparing Linear import batches
checking ticket dependencies
recommending next issue
summarising PR/Linear status
proposing follow-up tickets
checking milestone readiness
updating documentation after merged PRs
```

Codex must not:

```text
silently change project scope
import all tickets as active work without approval
assign itself every ticket without guardrails
close issues without confirming merge status
change labels/statuses unpredictably
```

---

# 2. Ticket wave planning

When asked to prepare a wave, Codex should output:

```text
Wave name
Tickets included
Dependencies
Suggested order
Suggested parallel-safe groups
Risks
Do-not-start-yet tickets
Owner decisions needed
```

---

# 3. Recommended next issue logic

Codex should recommend the next issue based on:

1. Current milestone gate.
2. Dependencies satisfied.
3. Lowest risk first.
4. Foundational work before feature UI.
5. No conflict with open PRs.

---

# 4. Follow-up ticket format

When proposing follow-ups:

```text
Title:
Goal:
Why needed:
Scope:
Out of scope:
Dependencies:
Acceptance criteria:
Test requirements:
Suggested labels:
Suggested estimate:
```

---

# 5. Weekly status summary

Codex may produce a weekly summary:

```text
Merged this week
Open PRs
Blocked issues
CI health
Next recommended tickets
Risks
Docs needing updates
```
