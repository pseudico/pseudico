# Linear Issue Templates — Local Work OS

Copy these into Linear as issue templates.

---

# Template 1 — Feature / Implementation Ticket

```md
## Goal

Implement:

## Strategic source documents

- docs/PRODUCT_SPEC.md:
- docs/OPERATING_PLAN.md:
- docs/tickets/MASTER_TICKET_INVENTORY.md:
- Relevant ticket pack:

## Why this exists

Explain the product value and how this feature connects to the local-only Pagico-style functionality.

## Scope

This issue includes:

- 
- 
- 

## Out of scope

This issue does not include:

- Cloud sync
- Mobile app work
- Team collaboration
- Hosted accounts
- Any unrelated feature work
- 

## Data model impact

- [ ] No schema change
- [ ] Schema change required
- [ ] Migration required
- [ ] Activity log impact
- [ ] Search index impact
- [ ] File path/storage impact
- [ ] IPC impact

Details:

## Implementation method

Expected approach:

1. 
2. 
3. 

Expected files/modules:

- 
- 
- 

## Acceptance criteria

- [ ] 
- [ ] 
- [ ] 

## Test requirements

- [ ] Unit tests
- [ ] Repository/database tests
- [ ] Component tests
- [ ] E2E/smoke test
- [ ] Migration test
- [ ] Manual QA

Specific tests required:

- 
- 

## Guardrails

- [ ] No cloud dependency
- [ ] No direct database access from React components
- [ ] No direct filesystem access from renderer
- [ ] Writes create activity log entries
- [ ] Search index updates where relevant
- [ ] Soft delete is used where relevant
- [ ] Workspace-relative file paths are used where relevant

## Codex instructions

Before coding:

1. Read the linked docs.
2. Produce a short plan.
3. List files likely to change.
4. Identify risks.
5. Confirm test approach.

Then implement the smallest passing version.

## Done when

- [ ] Acceptance criteria are met
- [ ] Required tests are added/updated
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes where relevant
- [ ] PR opened using repo template
- [ ] Codex review completed
- [ ] Human review completed
- [ ] Merged to main
```

---

# Template 2 — Database / Migration Ticket

```md
## Goal

Implement database change:

## Strategic source documents

- docs/DATA_MODEL.md or PRODUCT_SPEC data model section:
- Relevant ticket pack:

## Schema impact

Tables affected:

- 

Columns/indexes/constraints:

- 

## Scope

- 
- 

## Out of scope

- UI implementation unless explicitly stated
- Unrelated schema changes
- Destructive hard deletes

## Migration method

Describe migration steps:

1. 
2. 
3. 

## Repository/service impact

- 
- 

## Activity/search impact

- [ ] Activity log update required
- [ ] Search index update required
- [ ] Neither required

## Acceptance criteria

- [ ] Migration runs on empty database
- [ ] Migration runs on existing test database
- [ ] Repository methods updated where needed
- [ ] Indexes exist for expected query paths
- [ ] Tests verify migration/repository behaviour

## Test requirements

- [ ] Migration test
- [ ] Repository test
- [ ] Transaction test if writes are involved

## Codex instructions

Implement this as a database-first change. Do not add UI unless explicitly requested.
```

---

# Template 3 — UI Feature Ticket

```md
## Goal

Implement UI behaviour:

## User flow

1. 
2. 
3. 

## Scope

- 
- 

## Out of scope

- New schema unless explicitly listed
- Cloud/mobile/team features
- Unrelated UI redesign

## Required states

- [ ] Empty state
- [ ] Loading state
- [ ] Error state
- [ ] Success state
- [ ] Disabled state where relevant

## Accessibility / keyboard

- [ ] Keyboard navigation considered
- [ ] Focus states handled
- [ ] ARIA labels where needed

## Acceptance criteria

- [ ] 
- [ ] 

## Test requirements

- [ ] Component test
- [ ] E2E/smoke test if critical path
- [ ] Manual QA with screenshot/screen recording if visual
```

---

# Template 4 — Bug Ticket

```md
## Problem

What is broken?

## Expected behaviour

What should happen?

## Actual behaviour

What happens instead?

## Reproduction steps

1. 
2. 
3. 

## Environment

- OS:
- App version/branch:
- Workspace state:
- Relevant logs:

## Suspected area

- [ ] DB
- [ ] Electron main
- [ ] Preload IPC
- [ ] Renderer/UI
- [ ] Filesystem
- [ ] Search
- [ ] Activity log
- [ ] Tests
- [ ] Unknown

## Acceptance criteria

- [ ] Bug no longer reproduces
- [ ] Regression test added where practical
- [ ] CI passes
```

---

# Template 5 — Spike / Decision Ticket

```md
## Question

What decision are we trying to make?

## Context

Why is this uncertain?

## Options to investigate

1. 
2. 
3. 

## Constraints

- Local-only
- Desktop-only
- No cloud dependency
- Must fit existing architecture

## Deliverable

- [ ] Written recommendation
- [ ] Tradeoff table
- [ ] Suggested next implementation tickets
- [ ] ADR draft if decision is important

## Out of scope

No production implementation unless explicitly requested.

## Done when

The decision is clear enough to create implementation tickets.
```

---

# Template 6 — Codex Review Ticket

```md
## Goal

Review this PR or module for:

- Architecture violations
- Missing tests
- Local-only guardrail violations
- Data model issues
- Activity log gaps
- Search index consistency
- Electron security issues
- Scope creep

## Target

PR:
Branch:
Module:

## Review instructions for Codex

Use:

- AGENTS.md
- .github/codex/review-guidelines.md
- docs/PRODUCT_SPEC.md
- docs/OPERATING_PLAN.md

## Expected output

- Summary
- P0/P1 issues
- Missing tests
- Suggested fixes
- Questions for human reviewer
```
