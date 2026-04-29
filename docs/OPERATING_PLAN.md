# Linear / GitHub / Codex Operating Plan v0.1

Project: **Local Work OS**  
Scope: **local-only desktop productivity app inspired by Pagico-style functionality**  
Purpose: create a development operating system so coding agents can build, test, review, and integrate the app in small controlled increments.

This plan assumes the **Full Build Specification** is the product source of truth. We are not creating the development tickets in this document; this document defines **how tickets will be created, assigned, implemented, reviewed, tested, and merged**.

---

## 1. Operating principle

The project should run like this:

```text
Product specification
  → Linear issue
  → Codex implementation task
  → GitHub branch
  → pull request
  → CI checks
  → Codex review
  → human review
  → merge
  → next small slice
```

The goal is to make every feature agent-buildable by reducing ambiguity. Codex should never be asked to “build the app.” It should be asked to implement one scoped slice with a clear goal, constraints, acceptance criteria, and tests.

---

## 2. Tool roles

### 2.1 Source-of-truth hierarchy

| Layer | Tool / file | Purpose |
|---|---|---|
| Product truth | `docs/PRODUCT_SPEC.md` | What the app should become |
| Architecture truth | `docs/ARCHITECTURE.md` | How the app is structured |
| Data truth | `docs/DATA_MODEL.md` | Schema, entities, relationships |
| Work truth | Linear | What is planned, active, blocked, done |
| Code truth | GitHub | Source code, branches, PRs, releases |
| Agent truth | `AGENTS.md` | How Codex should behave in the repo |
| Quality truth | CI + test files | Whether changes are acceptable |
| Decision truth | `docs/DECISIONS/` | Why important choices were made |

Rule:

> **Specs define what to build. Linear defines what is being worked on. GitHub proves what was built. Tests prove whether it works.**

### 2.2 Tool responsibility map

| Tool | Responsibility | Should not be used for |
|---|---|---|
| ChatGPT | Product thinking, specs, architecture, ticket design, strategy | Directly tracking final code state |
| Linear | Backlog, issue status, priority, scope, milestones | Long-form architecture storage |
| GitHub | Code, PRs, CI, branches, releases | Product-roadmap discussion that belongs in Linear |
| Codex | Implementing scoped tickets, code review, test creation, refactoring | Large vague product decisions |
| CI | Enforcing lint/typecheck/tests/build | Product judgement |
| Human review | Final judgement, UX feel, merge approval | Rewriting every agent change manually |

---

## 3. Setup sequence

Do the setup in this order.

### 3.1 GitHub first

Create the repository first because Codex and Linear will both need to point to it.

Recommended repository name:

```text
local-work-os
```

Initial visibility:

```text
private
```

Default branch:

```text
main
```

Recommended starting files:

```text
AGENTS.md
README.md
docs/PRODUCT_SPEC.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
docs/OPERATING_PLAN.md
docs/TESTING.md
docs/ROADMAP.md
docs/DECISIONS/ADR-0001-local-first-desktop.md
.github/pull_request_template.md
.github/workflows/ci.yml
.github/codex/review-guidelines.md
```

### 3.2 Codex setup

Setup order:

```text
1. Connect GitHub repository to Codex.
2. Create a Codex environment for local-work-os.
3. Confirm Codex can read the repo and run basic commands.
4. Add AGENTS.md.
5. Install Codex for Linear.
6. Mention @Codex in a Linear issue comment to link the workspace.
7. Run one tiny test issue before assigning serious work.
```

### 3.3 Linear setup

Create one Linear workspace/team for the project.

Suggested team name:

```text
LWO
```

Suggested Linear project:

```text
Local Work OS — Local-Only MVP
```

Use Linear for:

```text
milestones
feature issues
implementation issues
test issues
bug issues
spike issues
blocked decisions
```

Do not use Linear as the main place to store the full product spec. Link to the relevant spec file and section instead.

---

## 4. Repository operating model

### 4.1 Recommended repo structure

```text
local-work-os/
  AGENTS.md
  README.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json

  apps/
    desktop/
      src/
        main/
        preload/
        renderer/
      tests/

  packages/
    core/
      src/
        entities/
        commands/
        events/
        services/
      tests/

    db/
      src/
        schema/
        migrations/
        repositories/
      tests/

    ui/
      src/
        components/
        layout/
        forms/
      tests/

    features/
      projects/
      inbox/
      contacts/
      tasks/
      lists/
      notes/
      files/
      links/
      tags/
      categories/
      search/
      saved-views/
      today/
      dashboard/
      timeline/
      calendar/

    test-utils/
      src/

  docs/
    PRODUCT_SPEC.md
    ARCHITECTURE.md
    DATA_MODEL.md
    OPERATING_PLAN.md
    ROADMAP.md
    TESTING.md
    SECURITY.md
    CODEX_WORKFLOW.md
    LINEAR_WORKFLOW.md
    GITHUB_WORKFLOW.md
    FEATURE_SPEC_TEMPLATE.md
    DECISIONS/
      ADR-0001-local-first-desktop.md
      ADR-0002-electron-react-sqlite.md

  .github/
    pull_request_template.md
    workflows/
      ci.yml
    codex/
      review-guidelines.md
      implementation-prompt-template.md
      review-prompt-template.md
```

### 4.2 Dependency direction

This rule is very important for agent-built code.

```text
apps/desktop
  may depend on packages/features, packages/ui, packages/db, packages/core

packages/features
  may depend on packages/core, packages/db, packages/ui

packages/ui
  may depend on packages/core types only where necessary

packages/db
  may depend on packages/core types

packages/core
  must not depend on React, Electron, SQLite, or UI
```

This keeps business logic out of React components and makes it easier for Codex to test individual modules.

### 4.3 Branch naming

Every branch should connect to a Linear issue.

```text
<linear-key>/<short-slug>
```

Examples:

```text
LWO-12/create-workspace-schema
LWO-28/add-task-completion-command
LWO-44/add-global-search-index
```

### 4.4 Commit convention

Use simple conventional commits:

```text
feat(tasks): add task completion command
fix(db): correct container soft-delete query
test(search): cover tag-based search results
docs(spec): clarify Today rollover behavior
```

---

## 5. GitHub operating plan

### 5.1 Branch protection

Protect `main`.

Recommended rules:

| Rule | Setting |
|---|---|
| Direct pushes to `main` | Block |
| Pull request required | Yes |
| Required approving review | Yes |
| Required status checks | Yes |
| Require conversation resolution | Yes |
| Require linear history | Yes |
| Force pushes | Disabled |
| Branch deletion | Disabled |
| Admin bypass | Disabled where practical |

### 5.2 Required CI checks

Start with these required checks:

```text
lint
typecheck
unit-tests
db-tests
desktop-build
```

Add later:

```text
playwright-smoke
migration-tests
package-smoke
```

### 5.3 CI workflow target

The first CI should enforce:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Later, add:

```bash
pnpm test:e2e
pnpm test:migrations
pnpm package:smoke
```

### 5.4 Pull request template

Create `.github/pull_request_template.md`:

```md
## Summary

Briefly describe what changed.

## Linear issue

Closes: LWO-___

## Scope

What is included in this PR?

## Out of scope

What is intentionally not included?

## Product spec references

- docs/PRODUCT_SPEC.md section:
- docs/DATA_MODEL.md section:
- docs/ARCHITECTURE.md section:

## Implementation notes

Describe key design choices.

## Tests

- [ ] Unit tests added/updated
- [ ] Repository/database tests added/updated
- [ ] Component tests added/updated where relevant
- [ ] E2E test added/updated where relevant

Commands run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Manual QA

Steps performed:

1.
2.
3.

## Risk checklist

- [ ] No cloud dependency added
- [ ] No direct DB access from React components
- [ ] No direct filesystem access from renderer
- [ ] Data-changing operations create activity log entries
- [ ] Search index updated where relevant
- [ ] Migrations include tests or verification
- [ ] Local files are stored safely under workspace paths
- [ ] No Pagico branding, wording, screenshots, or copied UI assets

## Screenshots / screen recordings

Add if UI changed.

## Codex notes

Summarise any Codex-generated work and known limitations.
```

### 5.5 PR review rule

Every PR should receive three kinds of review:

```text
1. Automated CI review
2. Codex review
3. Human review
```

Recommended flow:

```text
PR opened
  → CI runs
  → @codex review
  → Codex comments
  → Codex/human fixes issues
  → human performs final review
  → merge
```

For early development, do not enable fully automatic merge. The human should remain the final merge gate.

### 5.6 GitHub issue templates

Since Linear is the work tracker, GitHub issues can be disabled or left unused. Avoid splitting work truth across both systems.

Use GitHub for:

```text
code
branches
pull requests
reviews
CI
releases
```

Use Linear for:

```text
planning
prioritisation
status
ticket ownership
agent delegation
```

---

## 6. Linear operating plan

### 6.1 Linear projects and milestones

Use one main Linear project at first:

```text
Local Work OS — Local-Only MVP
```

Milestones:

```text
M0 — Repo and Governance
M1 — Local Workspace and Database
M2 — Core Containers and Items
M3 — Organisation and Search
M4 — Today and Dashboard
M5 — Files, Backup, and Export
M6 — MVP Stabilisation
```

Later projects:

```text
Local Work OS — V1 Pagico-Style Usability
Local Work OS — V2 Advanced Local Power
```

### 6.2 Workflow statuses

Use this project workflow:

| Status | Meaning |
|---|---|
| Triage | Raw idea, not accepted yet |
| Backlog | Accepted, not yet specified |
| Spec Draft | Needs product/spec clarification |
| Spec Ready | Clear enough for technical planning |
| Codex Ready | Ready for Codex implementation |
| Assigned to Codex | Codex has been delegated |
| PR Open | Branch/PR exists |
| Review | Human/Codex review in progress |
| QA | Tests pass; manual verification pending |
| Done | Merged and accepted |
| Blocked | Needs decision, dependency, or tool fix |
| Canceled | No longer needed |

### 6.3 Linear label system

Use grouped labels.

#### Phase labels

```text
Phase/MVP
Phase/V1
Phase/V2
Phase/Experimental
```

#### Area labels

```text
Area/Core
Area/DB
Area/Desktop
Area/UI
Area/Workspace
Area/Projects
Area/Inbox
Area/Contacts
Area/Tasks
Area/Lists
Area/Notes
Area/Files
Area/Links
Area/Tags
Area/Categories
Area/Search
Area/SavedViews
Area/Today
Area/Dashboard
Area/Timeline
Area/Calendar
Area/Backup
Area/Export
Area/Testing
Area/Docs
Area/Security
```

#### Kind labels

```text
Kind/Feature
Kind/Bug
Kind/Refactor
Kind/Test
Kind/Docs
Kind/Spike
Kind/Migration
Kind/UX
Kind/Performance
```

#### Risk labels

```text
Risk/DataModel
Risk/Migration
Risk/FileSystem
Risk/ElectronSecurity
Risk/SearchIndex
Risk/ScopeCreep
Risk/Performance
Risk/UX
```

#### Agent labels

```text
Agent/CodexReady
Agent/NeedsPlan
Agent/NeedsHumanDecision
Agent/ReviewOnly
Agent/TestOnly
Agent/DoNotDelegate
```

#### Quality labels

```text
Quality/NeedsTests
Quality/NeedsE2E
Quality/NeedsMigrationTest
Quality/NeedsManualQA
Quality/NeedsDocs
```

### 6.4 Priorities

| Priority | Meaning |
|---|---|
| Urgent | Blocks current milestone or breaks app |
| High | Important MVP path |
| Medium | Useful but not blocking |
| Low | Nice-to-have or polish |
| No priority | Untriaged |

### 6.5 Estimates

Use a small estimate scale.

| Estimate | Meaning |
|---:|---|
| 1 | Tiny, one focused change |
| 2 | Small, one module |
| 3 | Moderate, one vertical slice |
| 5 | Large, should probably be split |
| 8 | Too large for Codex; split before assigning |

Rule:

> **Codex-ready issues should usually be estimate 1–3. Estimate 5 requires a planning issue first. Estimate 8 is not Codex-ready.**

---

## 7. Linear issue templates

### 7.1 Feature issue template

```md
## Goal

What user-facing capability should exist?

## Product context

Relevant spec sections:

- docs/PRODUCT_SPEC.md:
- docs/DATA_MODEL.md:
- docs/ARCHITECTURE.md:

## User story

As a user, I want ___ so that ___.

## Scope

This issue includes:

-
-
-

## Out of scope

This issue does not include:

-
-
-

## Technical notes

Expected modules/files:

-
-
-

Expected data model impact:

- [ ] No schema change
- [ ] Schema change required
- [ ] Migration required
- [ ] Search index impact
- [ ] Activity log impact

## Acceptance criteria

- [ ]
- [ ]
- [ ]

## Test requirements

- [ ] Unit tests
- [ ] Repository/database tests
- [ ] Component tests
- [ ] E2E test
- [ ] Manual QA steps

## Codex instructions

Before coding:

1. Read the linked spec sections.
2. Produce a short implementation plan.
3. Confirm files likely to change.
4. Implement the smallest passing version.
5. Add/update tests.
6. Run required checks.
7. Open a PR with the standard template.

## Done when

- [ ] Acceptance criteria met
- [ ] Tests added/updated
- [ ] CI passes
- [ ] PR reviewed
- [ ] Merged to main
```

### 7.2 Spike issue template

Use a spike when something is uncertain.

```md
## Question

What decision are we trying to make?

## Context

Why is this unknown or risky?

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

### 7.3 Bug issue template

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

- [ ] Database
- [ ] UI
- [ ] Electron main/preload
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

### 7.4 Refactor issue template

```md
## Goal

What code structure should improve?

## Reason

Why is this refactor needed now?

## Scope

Included:

-

Excluded:

-

## Safety rules

- [ ] No user-facing behaviour change unless specified
- [ ] Tests must continue passing
- [ ] Public interfaces documented if changed
- [ ] Migration not included unless stated

## Acceptance criteria

- [ ] Code is simpler or better isolated
- [ ] Tests pass
- [ ] No unrelated feature work added
```

---

## 8. Definition of Ready

An issue is **Codex Ready** only when all of this is true:

```text
The issue has a clear goal.
The relevant spec sections are linked.
Scope is explicit.
Out-of-scope items are explicit.
Acceptance criteria are testable.
Data model impact is stated.
Testing requirements are stated.
The issue is small enough for one PR.
No major product decision is unresolved.
```

Codex should not be assigned vague issues. Vague issues should go to `Spec Draft`, `Spec Ready`, or `Agent/NeedsPlan`.

---

## 9. Definition of Done

A feature is done only when:

```text
The PR is merged to main.
CI passes.
Relevant tests are added or updated.
Activity logging works for data-changing operations.
Search indexing is updated if searchable data changed.
Docs are updated if architecture, schema, or workflow changed.
The Linear issue is moved to Done.
The user-facing behaviour matches acceptance criteria.
```

For UI features:

```text
Manual QA steps were performed.
Screenshots or screen recordings were attached to the PR where useful.
Keyboard and empty-state behaviour were checked.
```

For database features:

```text
Migration exists.
Migration test or verification exists.
Rollback/backup implications are documented.
No destructive hard-delete is introduced.
```

For file features:

```text
Paths are workspace-relative.
Renderer does not access filesystem directly.
Missing-file state is handled.
Dangerous path traversal is prevented.
```

---

## 10. Codex operating model

### 10.1 How Codex should be used

Use Codex in four modes:

| Mode | Purpose |
|---|---|
| Planning | Turn a spec section into a safe implementation approach |
| Implementation | Build one scoped issue |
| Test generation | Add missing tests or improve coverage |
| Review | Review PRs for regressions, missing tests, and architecture violations |

### 10.2 Codex task instruction format

Every Codex task should use this structure:

```md
Goal:
Implement [Linear key + title].

Context:
Read these files first:
- docs/PRODUCT_SPEC.md section ...
- docs/DATA_MODEL.md section ...
- docs/ARCHITECTURE.md section ...
- Existing files: ...

Constraints:
- Local-only desktop app.
- No cloud dependencies.
- No direct DB access from React components.
- No direct filesystem access from renderer.
- All data-changing operations must create activity log entries.
- Keep the change small and scoped.

Out of scope:
-
-
-

Implementation requirements:
-
-
-

Testing requirements:
-
-
-

Done when:
- Acceptance criteria pass.
- Tests pass.
- pnpm lint passes.
- pnpm typecheck passes.
- PR opened using the repo template.
```

### 10.3 Codex first response requirement

For any non-trivial implementation task, Codex should first produce:

```text
1. Understanding of task
2. Files likely to change
3. Risks
4. Implementation plan
5. Test plan
```

Then it may implement.

This prevents agent wandering.

### 10.4 Codex branch/PR requirement

Codex should create branches named after the Linear issue:

```text
LWO-XX/short-slug
```

PR title:

```text
LWO-XX: Add task completion command
```

PR body must use the GitHub PR template.

### 10.5 Codex review prompts

For PR review, use:

```text
@codex review this PR against:
- docs/PRODUCT_SPEC.md
- docs/ARCHITECTURE.md
- docs/DATA_MODEL.md
- AGENTS.md
- .github/codex/review-guidelines.md

Focus especially on:
- local-only constraints
- data model correctness
- missing activity log events
- search index consistency
- Electron security boundaries
- missing tests
- overbroad scope
```

---

## 11. `AGENTS.md` operating file

Create this at the repo root:

```md
# AGENTS.md

## Project mission

Build Local Work OS: an original local-only desktop productivity app for projects, contacts, tasks, lists, notes, files, links, tags, categories, saved views, dashboards, Today planning, timeline/calendar views, local backup, and export.

The project is inspired by the general category of local-first productivity/work-management tools. Do not copy any proprietary product's branding, screenshots, wording, icons, visual design, or implementation.

## Scope

In scope:
- Desktop app
- Local workspace
- SQLite database
- Local attachment storage
- Local search
- Local backup/export
- Single-user workflows

Out of scope:
- Cloud sync
- Mobile apps
- Team collaboration
- Hosted accounts
- Billing
- Public sharing
- Remote file storage
- Telemetry unless explicitly approved

## Tech stack

- TypeScript
- Electron
- React
- Vite
- SQLite
- Drizzle ORM
- pnpm workspaces
- Vitest
- React Testing Library
- Playwright
- electron-builder

## Architecture rules

- Business logic belongs in packages/core or packages/features.
- Database access must go through repositories/services.
- React components must not call SQLite directly.
- Renderer must not access Node filesystem APIs directly.
- Filesystem actions must go through Electron main/preload IPC.
- All data-changing operations must create activity log entries.
- Searchable content changes must update the search index.
- Prefer soft delete over hard delete.
- Keep all file paths workspace-relative where possible.
- Do not introduce cloud dependencies.

## Development workflow

Before implementation:
1. Read the linked Linear issue.
2. Read the linked docs.
3. Produce a short plan.
4. Identify files likely to change.
5. Identify risks.

During implementation:
- Keep changes small.
- Do not add unrelated features.
- Do not rewrite large modules unless requested.
- Prefer typed interfaces.
- Prefer named exports.
- Keep domain logic testable.

Before opening a PR:
- Run `pnpm lint`.
- Run `pnpm typecheck`.
- Run `pnpm test`.
- Run relevant package-specific tests.
- Update docs if behaviour, architecture, or schema changed.

## Review guidelines

Flag as high priority:
- Any cloud dependency or network service added without approval.
- Direct DB calls from React components.
- Direct filesystem access from renderer.
- Data writes without activity log events.
- Schema changes without migrations.
- Migrations without tests or verification.
- Searchable data changes without search-index updates.
- Destructive deletes where soft delete is expected.
- Electron security regressions.
- Missing tests for new domain logic.
- Scope creep beyond the Linear issue.

## Done means

A task is done only when:
- Acceptance criteria are met.
- Tests pass.
- CI passes.
- PR template is completed.
- Known limitations are documented.
```

### 11.1 Nested `AGENTS.md` files

Later, add specialised instructions:

```text
packages/db/AGENTS.md
packages/features/search/AGENTS.md
apps/desktop/src/main/AGENTS.md
apps/desktop/src/renderer/AGENTS.md
```

Example for `packages/db/AGENTS.md`:

```md
# packages/db/AGENTS.md

## Database rules

- Every schema change must include a migration.
- Every migration must be tested or manually verified.
- Never hard-delete user data unless explicitly specified.
- Prefer nullable additions over risky destructive changes.
- Keep timestamps consistent.
- Add indexes for frequently queried foreign keys.
- Activity-log writes must be part of the same transaction as the user-data write when possible.
```

---

## 12. GitHub Codex review guidelines file

Create `.github/codex/review-guidelines.md`:

```md
# Codex PR Review Guidelines

Review this project as a local-only desktop app with a strict object-graph architecture.

## High-priority review concerns

1. Local-only scope
   - No cloud sync
   - No hosted backend
   - No remote telemetry
   - No mobile-specific implementation

2. Architecture boundaries
   - React must not directly access SQLite.
   - Renderer must not directly access filesystem.
   - Electron IPC must be typed and narrow.
   - Domain logic must not be hidden in UI components.

3. Data integrity
   - Writes must create activity log events.
   - Migrations must be safe.
   - Soft delete preferred.
   - Workspace-relative paths preferred.

4. Search consistency
   - Searchable fields must update FTS index.
   - Tag/category changes must affect saved views.

5. Testing
   - New commands/services need unit tests.
   - New repository logic needs database tests.
   - New critical UI flows need component or E2E tests.

6. Scope control
   - PR should implement only the linked Linear issue.
   - Flag unrelated rewrites.
   - Flag hidden feature additions.

## Review output

Give:
- Summary
- P0/P1 issues
- Suggested fixes
- Missing tests
- Questions for human reviewer
```

---

## 13. CI operating plan

### 13.1 Initial CI

`.github/workflows/ci.yml` should run on:

```text
pull_request
push to main
```

Jobs:

```text
install
lint
typecheck
unit-tests
build
```

### 13.2 Later CI expansion

| Job | When to add |
|---|---|
| migration-tests | Once schema migrations start |
| playwright-smoke | Once desktop shell exists |
| package-smoke | Once packaging starts |
| security-check | Once dependency surface grows |
| file-system-tests | Once attachment import exists |

### 13.3 Optional Codex GitHub Action

Do **not** use the Codex GitHub Action at the beginning. Start with manual `@codex review` and standard CI. Add the action later only for stable repeatable tasks such as:

```text
review docs for broken references
summarise release notes
review migration diffs
scan PRs for local-only rule violations
```

Reason: early use of the action may add complexity and API cost before the repo is stable.

---

## 14. Human involvement model

Your goal is minimal assistance beyond subscription payments. The practical model should be:

### 14.1 Human does

```text
Approve product direction.
Approve major architecture decisions.
Review Codex plans before large changes.
Run the app manually for major UX flows.
Merge PRs.
Reject scope creep.
```

### 14.2 Codex does

```text
Scaffold code.
Implement small tickets.
Write tests.
Fix CI failures.
Review PRs.
Summarise changes.
Suggest follow-up tickets.
```

### 14.3 ChatGPT does

```text
Create specs.
Convert specs to tickets.
Improve ticket quality.
Plan architecture.
Review proposed approaches.
Help debug strategy.
Generate templates.
```

### 14.4 CI does

```text
Catch broken builds.
Catch type errors.
Catch test failures.
Prevent unsafe merges.
```

---

## 15. Development lifecycle

### 15.1 Full lifecycle

```text
1. Spec exists
2. Linear issue created
3. Issue reaches Spec Ready
4. Issue gets Codex-ready template
5. Issue moved to Codex Ready
6. Codex assigned or mentioned
7. Codex proposes plan
8. Codex implements
9. Codex opens PR
10. CI runs
11. Codex reviews PR
12. Human reviews PR
13. Fixes made
14. PR merged
15. Linear issue marked Done
16. Follow-up issues created if needed
```

### 15.2 Smaller loop for bugs

```text
Bug found
  → Linear bug issue
  → reproduction steps
  → Codex writes failing test
  → Codex fixes
  → CI
  → PR review
  → merge
```

### 15.3 Smaller loop for architecture uncertainty

```text
Unclear decision
  → Linear spike
  → Codex investigates options
  → recommendation written
  → human chooses
  → ADR added
  → implementation tickets created
```

---

## 16. Feature development sequencing rules

To keep the project coherent, features must be built in dependency order.

### 16.1 Foundation before screens

Build:

```text
schema
repositories
commands
activity log
tests
```

Then:

```text
React UI
```

### 16.2 Core object graph before advanced views

Build:

```text
workspace
containers
items
tasks
lists
notes
tags
categories
search
```

Then:

```text
collections
dashboard
today
timeline
calendar
templates
automation
```

### 16.3 Local storage before file features

Build:

```text
workspace folder
attachment folder convention
safe file copy
attachment metadata
open/reveal file
```

Then:

```text
file versions
file search
file importers
```

### 16.4 Saved view engine before dashboards

Build:

```text
query model
saved_views table
query evaluator
results grouping
```

Then:

```text
collections
dashboard widgets
smart lists
calendar filters
timeline filters
```

---

## 17. Integration rules

### 17.1 Every write operation

Every create/update/delete/move/complete/tag/category/file operation should follow:

```text
validate input
  → start transaction
  → write domain data
  → write activity_log event
  → update search index if relevant
  → commit transaction
  → notify renderer/query cache
```

### 17.2 Every UI feature

Every UI feature should use:

```text
React component
  → feature hook/service
  → typed IPC or repository boundary
  → command/service
  → repository
  → database
```

Avoid:

```text
React component
  → raw SQL
```

Avoid:

```text
Renderer
  → fs.readFile / fs.writeFile
```

### 17.3 Search integration

When any of these change:

```text
container name/description
item title/body
note content
file name/description
link title/url/description
taggings
category assignment
```

Then:

```text
search index must update
```

### 17.4 Saved view integration

When any of these change:

```text
tags
categories
task dates
task status
container assignment
archived/deleted state
```

Then:

```text
saved views should reflect the new state
```

This can be achieved by querying fresh data rather than maintaining expensive cached saved-view results at first.

---

## 18. Phase gates

Each phase should have an exit checklist before the next phase begins.

### M0 — Repo and Governance exit gate

```text
Repo exists.
AGENTS.md exists.
Docs skeleton exists.
CI runs.
PR template exists.
Branch protection configured.
Codex can access repo.
Linear can delegate to Codex.
One trivial PR has been merged through the full workflow.
```

### M1 — Local Workspace and Database exit gate

```text
Workspace can be created/opened.
SQLite database initialises.
Migrations run.
Inbox system container created.
Activity log exists.
Basic repository tests pass.
Backup-before-migration rule documented.
```

### M2 — Core Containers and Items exit gate

```text
Projects can be created/opened.
Tasks can be added/completed.
Lists can be created and checked.
Notes can be created and searched.
Items persist after restart.
Activity log covers writes.
```

### M3 — Organisation and Search exit gate

```text
Tags parse and persist.
Categories can be created/assigned.
Global search works.
Search index updates after edits.
Saved view schema exists.
Basic collection works.
```

### M4 — Today and Dashboard exit gate

```text
Today shows due/overdue tasks.
Tasks can be completed from Today.
Default dashboard exists.
Dashboard widgets query real data.
Clicking widget items opens source objects.
```

### M5 — Files, Backup, and Export exit gate

```text
Files copy into workspace attachment storage.
File metadata persists.
Files open externally.
Manual backup works.
JSON export works.
Missing file state handled.
```

### M6 — MVP Stabilisation exit gate

```text
All MVP user flows tested.
Playwright smoke tests pass.
Packaged app can open a workspace.
No known P0/P1 bugs.
Docs reflect implemented architecture.
```

---

## 19. Local-only guardrails

These should appear in Linear, GitHub, and Codex instructions.

### 19.1 Forbidden without explicit approval

```text
Remote databases
Cloud sync
Hosted APIs
User accounts
Telemetry
Analytics SDKs
Mobile app code
Team permissions
Public sharing
Background cloud workers
External file storage
```

### 19.2 Allowed local dependencies

```text
SQLite
Electron
React
Vite
Drizzle
date parsing libraries
Markdown libraries
local testing libraries
local packaging tools
```

### 19.3 Dependencies requiring review

```text
Rich text editors
Browser extension tooling
Native modules
File watcher libraries
Embedded browser/webview tools
Encryption libraries
Large UI frameworks
```

---

## 20. Documentation workflow

### 20.1 Required docs

| File | Purpose |
|---|---|
| `docs/PRODUCT_SPEC.md` | Product behaviour and feature relationships |
| `docs/ARCHITECTURE.md` | Technical structure and dependency rules |
| `docs/DATA_MODEL.md` | Schema and entity relationships |
| `docs/TESTING.md` | Test strategy and commands |
| `docs/SECURITY.md` | Electron, filesystem, local data rules |
| `docs/CODEX_WORKFLOW.md` | How to assign and review Codex work |
| `docs/LINEAR_WORKFLOW.md` | Statuses, labels, issue templates |
| `docs/GITHUB_WORKFLOW.md` | Branching, PRs, CI, merge rules |
| `docs/DECISIONS/` | Architecture decision records |

### 20.2 ADR template

Create `docs/DECISIONS/ADR-template.md`:

```md
# ADR-____: Decision title

## Status

Proposed / Accepted / Rejected / Superseded

## Context

What problem are we solving?

## Decision

What did we decide?

## Consequences

What are the tradeoffs?

## Alternatives considered

1.
2.
3.

## Links

- Linear:
- PR:
- Spec:
```

Use ADRs for decisions like:

```text
Electron vs Tauri
SQLite/Drizzle choice
Markdown-first notes
Saved view query JSON
Activity log transaction model
Attachment storage layout
```

---

## 21. Quality gates by feature type

### 21.1 Database feature gate

Required:

```text
schema/migration
repository/service
tests
activity log consideration
search index consideration
docs update if schema changed
```

### 21.2 UI feature gate

Required:

```text
component or route
empty state
loading state
error state
keyboard behaviour where relevant
component tests or E2E smoke where practical
manual QA screenshot if visual
```

### 21.3 File feature gate

Required:

```text
safe path handling
workspace-relative storage
copy/import behaviour
missing-file state
open/reveal action
tests for path utilities
Electron IPC boundary
```

### 21.4 Search feature gate

Required:

```text
FTS update path
query tests
result ranking/grouping tests
archived/deleted exclusion
tag/category integration
```

### 21.5 Planning-view feature gate

Required:

```text
date handling tests
timezone/local date tests
completed/archived filtering
source-object navigation
manual ordering persistence if applicable
```

---

## 22. Codex task size rules

### Good Codex task

```text
Add task completion command and tests.
```

Why good:

```text
Clear object
Clear behaviour
Clear tests
Small surface area
```

### Bad Codex task

```text
Build the project management part.
```

Why bad:

```text
Too broad
Ambiguous
Multiple modules
No clear acceptance criteria
```

### Splitting rule

Split any issue that includes more than two of these:

```text
schema migration
repository change
service/domain command
React UI
Electron IPC
file system operation
search index update
E2E test
```

Example split:

```text
Bad:
Add file attachments.

Better:
FILE-001 Define attachment schema.
FILE-002 Add attachment repository.
FILE-003 Add safe file-copy service.
FILE-004 Add file item UI.
FILE-005 Add open/reveal file actions.
FILE-006 Add file search metadata.
```

---

## 23. Release operating plan

### 23.1 Release stages

| Stage | Meaning |
|---|---|
| Dev scaffold | Repo runs, app shell launches |
| Internal alpha | Core local workflows usable |
| MVP alpha | Projects/tasks/notes/files/search/today/dashboard usable |
| MVP beta | Packaged app usable with backups/export |
| MVP 1.0 | Stable local-only release |

### 23.2 Release branch strategy

For early development:

```text
main only
feature branches
squash merge
```

For beta/1.0:

```text
main
release/mvp-beta
release/1.0
```

### 23.3 Release checklist

```text
CI passes.
Packaged app launches.
New workspace can be created.
Existing workspace opens.
Backup works.
Export works.
Core smoke tests pass.
No P0/P1 issues open.
Changelog updated.
Version bumped.
```

---

## 24. Manual QA scripts

Create `docs/QA_SCRIPTS.md`.

### 24.1 MVP smoke script

```md
# MVP Smoke Test

1. Launch app.
2. Create new workspace.
3. Confirm Inbox exists.
4. Create project.
5. Add task to project.
6. Add due date to task.
7. Mark task complete.
8. Add note to project.
9. Search for note text.
10. Add @tag to task.
11. Confirm tag search finds task.
12. Add category.
13. Assign category to project.
14. Open Today.
15. Confirm due task appears.
16. Open Dashboard.
17. Confirm dashboard widgets load.
18. Attach local file to project.
19. Open file externally.
20. Create manual backup.
21. Export workspace JSON.
22. Quit app.
23. Reopen app.
24. Confirm data persisted.
```

### 24.2 File safety script

```md
# File Safety QA

1. Attach a file.
2. Confirm file copied inside workspace.
3. Rename original source file.
4. Confirm app attachment still opens.
5. Delete copied file manually.
6. Confirm app shows missing-file state.
7. Try attaching file with unusual filename.
8. Confirm path remains inside workspace.
```

---

## 25. The “agent team” model

Use Codex as several roles, not because there are necessarily separate agents, but because each task should have a role-specific prompt.

### 25.1 Roles

| Role | Prompt style |
|---|---|
| Implementer | Build the scoped issue |
| Reviewer | Find regressions and missing tests |
| Test engineer | Add tests for existing code |
| Refactorer | Improve structure without changing behaviour |
| Migration reviewer | Check schema and migration safety |
| UX reviewer | Review empty/loading/error states and flow consistency |

### 25.2 Example role prompts

#### Implementer

```text
@Codex implement this issue. First produce a plan. Keep the change scoped to the acceptance criteria. Do not add unrelated features.
```

#### Reviewer

```text
@Codex review this PR for architecture violations, missing tests, local-only violations, activity log gaps, and search-index consistency.
```

#### Test engineer

```text
@Codex add tests for the behaviour in this issue without changing production behaviour unless needed to make the code testable.
```

#### Refactorer

```text
@Codex refactor this module to improve separation between UI and domain logic. Do not change user-facing behaviour. Add or preserve tests.
```

---

## 26. Linear-to-GitHub linking protocol

Every Linear issue should include:

```text
Spec reference
Acceptance criteria
Expected PR title
Branch name
Testing requirements
```

Every GitHub PR should include:

```text
Linear issue key
Spec reference
Acceptance criteria summary
Tests run
Known limitations
```

Every completed issue should have:

```text
Merged PR link
Summary of what changed
Follow-up issues, if any
```

---

## 27. First setup validation task

Before creating serious tickets, run a tiny end-to-end workflow.

### Linear issue

```text
LWO-1: Validate agent development workflow
```

### Scope

```text
Add a small docs file: docs/WORKFLOW_VALIDATION.md
Add one trivial test or placeholder test if test framework exists
Open PR
Run CI
Request Codex review
Human review
Merge
Move Linear issue to Done
```

### Purpose

This proves:

```text
Linear can assign to Codex.
Codex can access GitHub.
Codex can open a PR.
CI runs.
Codex review works.
Human can merge.
Linear status can close cleanly.
```

---

## 28. Operating risks and mitigations

| Risk | Mitigation |
|---|---|
| Codex builds too much | Small issues, strict scope, PR template, `AGENTS.md` |
| Tests are skipped | Definition of Done and CI required checks |
| Architecture drifts | Architecture docs, nested `AGENTS.md`, Codex review |
| Linear becomes messy | Label groups, issue templates, status discipline |
| GitHub and Linear diverge | Branch/PR naming must include Linear key |
| Cloud features creep in | Local-only guardrails in every template |
| Data model breaks late | Schema-first phases and migration tests |
| UI grows before logic | Foundation-before-screens rule |
| Generated code becomes unreviewed | Human merge gate and Codex review gate |
| Massive PRs become impossible to review | Estimate limits and splitting rules |

---

## 29. Operating cadence

For a solo founder-style project, use a lightweight cadence.

### Before each work session

```text
Review active Linear issues.
Pick one Codex-ready issue.
Assign or mention Codex.
Review Codex plan.
Let it implement.
```

### During work session

```text
Keep only 1–3 Codex tasks active unless they are independent.
Do not run parallel tasks touching the same files.
Watch for CI failures.
Move blocked issues quickly.
```

### End of work session

```text
Review open PRs.
Merge safe PRs.
Move Linear statuses.
Create follow-up issues from PR notes.
Update docs if architecture changed.
```

### Weekly

```text
Review roadmap.
Archive stale issues.
Merge duplicate labels.
Update AGENTS.md based on repeated Codex mistakes.
Review unresolved ADRs.
Run full smoke test if app is usable.
```

---

## 30. What this plan enables next

This operating plan gives us the structure to create the development backlog cleanly.

The next step is to generate the first development-ticket set in this order:

```text
M0 — Repo and Governance
M1 — Local Workspace and Database
M2 — Core Containers and Items
M3 — Organisation and Search
M4 — Today and Dashboard
M5 — Files, Backup, and Export
M6 — MVP Stabilisation
```

Each ticket should be written in Codex-ready form with:

```text
title
goal
scope
out of scope
spec references
technical notes
acceptance criteria
test requirements
done-when checklist
suggested labels
suggested estimate
suggested dependencies
```

---

## 31. Reference sources for operating plan inspiration

These are public references for the current operating model. Check them again before implementing if tool behaviour has changed.

- OpenAI Codex overview: https://developers.openai.com/codex
- OpenAI Codex best practices: https://developers.openai.com/codex/learn/best-practices
- OpenAI Codex Linear integration: https://developers.openai.com/codex/integrations/linear
- OpenAI Codex GitHub integration: https://developers.openai.com/codex/integrations/github
- OpenAI AGENTS.md guide: https://developers.openai.com/codex/guides/agents-md
- OpenAI Codex GitHub Action: https://developers.openai.com/codex/github-action
- Linear conceptual model: https://linear.app/docs/conceptual-model
- Linear workflows: https://linear.app/docs/configuring-workflows
- Linear labels: https://linear.app/docs/labels
- GitHub protected branches: https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
