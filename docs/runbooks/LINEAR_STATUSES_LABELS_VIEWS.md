# Linear Statuses, Labels, and Views

This file is a copy-paste setup reference.

---

# 1. Statuses

Create this workflow order:

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

## Status transition rules

```text
Triage → Backlog
Backlog → Spec Draft
Spec Draft → Spec Ready
Spec Ready → Codex Ready
Codex Ready → Assigned to Codex
Assigned to Codex → PR Open
PR Open → Review
Review → QA
QA → Done
Any active status → Blocked
Any active status → Canceled
```

Do not move an issue to `Codex Ready` unless it passes the Definition of Ready:

```text
Goal is clear.
Scope is bounded.
Out of scope is explicit.
Relevant docs are linked.
Data model impact is stated.
Acceptance criteria are testable.
Testing requirements are included.
Issue is small enough for one PR.
No unresolved product decision remains.
```

---

# 2. Labels

## One-of groups

Use actual Linear label groups for these because only one value should usually apply.

### Phase

```text
Phase/M0
Phase/M1
Phase/M2
Phase/M3
Phase/M4
Phase/M5
Phase/M6
Phase/M7
Phase/M8
Phase/M9
Phase/M10
Phase/M11
Phase/M12
Phase/M13
Phase/M14
```

### Kind

```text
Kind/Feature
Kind/Bug
Kind/Refactor
Kind/Test
Kind/Docs
Kind/Spike
Kind/Migration
Kind/QA
Kind/Release
```

### Agent

```text
Agent/CodexReady
Agent/NeedsPlan
Agent/NeedsHumanDecision
Agent/ReviewOnly
Agent/TestOnly
Agent/DoNotDelegate
```

## Multi-select plain labels

Use plain labels for these because multiple may apply.

### Area labels

```text
area:core
area:db
area:desktop
area:workspace
area:electron-main
area:preload
area:renderer
area:ui
area:projects
area:contacts
area:inbox
area:items
area:tasks
area:lists
area:notes
area:files
area:links
area:tags
area:categories
area:relationships
area:search
area:saved-views
area:collections
area:today
area:dashboard
area:timeline
area:calendar
area:templates
area:workflows
area:reminders
area:recurrence
area:backup
area:export
area:import
area:browser-capture
area:security
area:performance
area:testing
area:docs
```

### Risk labels

```text
risk:data-model
risk:migration
risk:file-system
risk:electron-security
risk:ipc
risk:search-index
risk:activity-log
risk:performance
risk:ux
risk:scope-creep
risk:large-pr
risk:dependency
```

### Quality labels

```text
quality:needs-tests
quality:needs-e2e
quality:needs-migration-test
quality:needs-manual-qa
quality:needs-docs
quality:needs-screenshots
quality:needs-accessibility-check
```

---

# 3. Views

Create these views.

## Codex Ready

Filter:

```text
Status = Codex Ready
```

Sort:

```text
Milestone ascending, priority descending
```

## Active Codex Work

Filter:

```text
Status = Assigned to Codex OR PR Open
```

## Human Decisions Needed

Filter:

```text
Label = Agent/NeedsHumanDecision OR Status = Blocked
```

## MVP Path

Filter:

```text
Phase = M0 OR M1 OR M2 OR M3 OR M4 OR M5 OR M6
```

## Full Scope Backlog

Filter:

```text
Phase = M7 OR M8 OR M9 OR M10 OR M11 OR M12 OR M13 OR M14
```

## Database Risk

Filter:

```text
label contains risk:data-model OR risk:migration
```

## Electron Security Risk

Filter:

```text
label contains risk:electron-security OR risk:ipc OR risk:file-system
```

---

# 4. Estimates

Use a small estimate scale.

| Estimate | Meaning | Codex policy |
|---:|---|---|
| 1 | Tiny task | Good for Codex |
| 2 | Small focused implementation | Good for Codex |
| 3 | Moderate vertical slice | Good if detailed |
| 5 | Large | Split or require plan first |
| 8 | Too large | Not Codex Ready |

Rule:

```text
Estimate 1–3 can be Codex Ready.
Estimate 5 needs plan/review before assignment.
Estimate 8 must be split.
```
