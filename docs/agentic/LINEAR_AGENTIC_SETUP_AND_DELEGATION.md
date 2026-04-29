# Local Work OS — Linear Agentic Setup and Delegation Instructions

This file tells the owner and Codex how Linear should be used.

---

# 1. Projects

Create these Linear projects:

```text
Local Work OS — Validation
Local Work OS — MVP Foundation
Local Work OS — MVP Core
Local Work OS — V1 Local Depth
Local Work OS — Full-Scope Parity Backlog
```

At minimum, start with:

```text
Local Work OS — MVP Foundation
```

---

# 2. Milestones

Use milestones:

```text
M0 — Governance and Repo Setup
M1 — Scaffold and Database
M2 — Core Object Graph
M3 — Core Work Objects
M4 — Metadata and Search
M5 — Today, Dashboard, Files
M6 — MVP Stabilisation
M7 — V1 Local Depth
M8 — Advanced Local Power
M9-M14 — Full-Scope Parity Backlog
```

---

# 3. Statuses

Recommended workflow:

```text
Triage
Backlog
Spec Draft
Spec Ready
Codex Ready
Assigned to Codex
PR Open
Review
QA
Done
Blocked
Canceled
```

---

# 4. Labels

Use these labels. Keep most as normal labels, not exclusive label groups, so multiple labels can be applied.

## Phase

```text
phase:mvp
phase:v1
phase:v2
phase:parity
```

## Area

```text
area:governance
area:desktop
area:workspace
area:db
area:core
area:projects
area:contacts
area:inbox
area:tasks
area:lists
area:notes
area:files
area:links
area:metadata
area:search
area:saved-views
area:today
area:dashboard
area:timeline
area:calendar
area:backup
area:export
area:testing
area:security
area:docs
```

## Kind

```text
kind:feature
kind:bug
kind:refactor
kind:test
kind:docs
kind:spike
kind:migration
kind:ux
kind:performance
```

## Agent

```text
agent:codex-ready
agent:plan-only
agent:review-only
agent:test-only
agent:do-not-delegate
agent:needs-human-decision
```

## Risk

```text
risk:data-model
risk:migration
risk:filesystem
risk:electron-security
risk:search-index
risk:scope-creep
risk:performance
risk:ux
```

---

# 5. Import protocol

Do not import all tickets as active work.

Import waves:

```text
Wave 0: validation issue only
Wave 1: M0/M1
Wave 2: M2/M3
Wave 3: M4/M5/M6
Wave 4: M7/M8
Wave 5: M9-M14 as backlog/reference
```

Only tickets in the current wave should get `agent:codex-ready`.

---

# 6. Delegation comment template

Paste this in a Codex-ready issue:

```text
@Codex please implement this issue using the Local Work OS agentic protocol.

Read first:
- AGENTS.md
- docs/CODEX_AUTOPILOT_RUNBOOK.md
- docs/AGENTIC_DEVELOPMENT_PROTOCOL.md
- linked spec/ticket documents

Before coding, comment with:
1. Understanding
2. Files likely to change
3. Risks
4. Implementation plan
5. Test plan

Then create a branch, implement the scoped change, add/update tests, open a PR, and update this issue with the PR link.

Do not merge. Do not add cloud/mobile/team features. Stop if a stop condition appears.
```

---

# 7. Optional triage automation

Once the workflow is proven, you may create a Linear triage rule that delegates only carefully marked work to Codex.

Recommended guardrail:

```text
Only auto-delegate issues with:
- status: Triage or Codex Ready
- label: agent:codex-ready
- milestone: current milestone only
- no label: agent:do-not-delegate
```

If Linear’s triage-rule UI cannot express all guardrails, do not auto-delegate. Use manual assignment.

---

# 8. Linear comments Codex should use

## Start

```text
Starting work.
Plan:
- ...
Branch: ...
Expected files: ...
Risks: ...
```

## PR opened

```text
PR opened: ...
Summary:
- ...
Tests run:
- ...
Manual QA:
- ...
Known limitations:
- ...
```

## Blocked

```text
Blocked.
Reason: ...
Decision needed: ...
Recommendation: ...
```

## Completed

```text
Work complete and PR ready for review.
PR: ...
What changed: ...
Follow-ups proposed: ...
```
