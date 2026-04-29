# Local Work OS — M0/M1 Ticket Pack

This folder contains the first real implementation ticket pack for **Local Work OS**. These are not product notes; they are intended to be copied into Linear issues or used as Codex task prompts.

Scope of this pack:

- **M0 — Governance and repo scaffold**
- **M1 — Workspace, Electron shell, SQLite database, migrations, seed data, activity log, search foundation, and health UI**

These tickets are designed to connect directly to:

1. `local-work-os-full-build-specification.md`
2. `local-work-os-linear-github-codex-operating-plan.md`

Inside the future GitHub repo, those two files should be split or copied into:

```text
docs/PRODUCT_SPEC.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
docs/OPERATING_PLAN.md
docs/LINEAR_WORKFLOW.md
docs/GITHUB_WORKFLOW.md
docs/CODEX_WORKFLOW.md
```

## Ticket usage

Each ticket includes:

```text
Title
Phase
Area
Kind
Priority
Estimate
Dependencies
Branch name
PR title
Strategic document references
Goal
Why this exists
Scope
Out of scope
Implementation method
Files to create/update
Acceptance criteria
Test requirements
Manual QA
Codex prompt
Done when
Follow-up tickets
```

## Recommended Linear labels

```text
Phase/MVP
Area/Core
Area/DB
Area/Desktop
Area/Workspace
Area/Search
Area/Testing
Area/Docs
Kind/Feature
Kind/Docs
Kind/Migration
Kind/Test
Risk/DataModel
Risk/ElectronSecurity
Risk/FileSystem
Risk/SearchIndex
Agent/CodexReady
Quality/NeedsTests
Quality/NeedsManualQA
```

## Dependency graph

```text
LWO-M0-001 Repo monorepo bootstrap
  ├── LWO-M0-002 Governance docs and AGENTS.md
  ├── LWO-M0-003 GitHub CI and PR workflow
  └── LWO-M0-004 Module registry and feature placeholders

LWO-M1-001 Desktop shell and routes
  └── LWO-M1-002 Typed preload IPC boundary
      ├── LWO-M1-003 Workspace filesystem service
      ├── LWO-M1-004 SQLite/Drizzle database setup
      │   └── LWO-M1-005 Initial database schema migration
      │       ├── LWO-M1-006 Database bootstrap and seed data
      │       ├── LWO-M1-007 Repository foundations
      │       │   └── LWO-M1-008 Transaction and activity-log write pattern
      │       └── LWO-M1-009 Search index foundation
      └── LWO-M1-010 Renderer workspace onboarding and database health UI
          ├── LWO-M1-011 Test harness and smoke tests
          └── LWO-M1-012 Packaging and development build verification
```

## Build philosophy for these tickets

The aim is to end this phase with a deployable desktop scaffold that can:

```text
launch
create/open a local workspace
write workspace.json
create the workspace folder structure
create a SQLite database
run migrations
seed the system Inbox and default dashboard
log workspace_created activity
show database/workspace health in the UI
run tests and CI
```

The aim is **not** to build the whole product yet. The aim is to make the later product modules possible without rewriting the foundation.


# Individual Tickets


---

<!-- Source file: LWO-M0-001-repo-monorepo-bootstrap.md -->


# LWO-M0-001 — Bootstrap pnpm monorepo and package structure

## Linear metadata

- **Phase:** M0 — Governance and scaffold
- **Area:** Core, Docs, Testing
- **Kind:** Feature / Scaffold
- **Priority:** High
- **Estimate:** 2
- **Suggested labels:** `Phase/MVP`, `Area/Core`, `Area/Docs`, `Kind/Feature`, `Agent/CodexReady`
- **Dependencies:** None
- **Suggested branch:** `LWO-M0-001/repo-monorepo-bootstrap`
- **Suggested PR title:** `LWO-M0-001: Bootstrap pnpm monorepo`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Create the initial repository structure that all future Local Work OS development will use.

This ticket should produce a working pnpm monorepo with package boundaries for:

```text
apps/desktop
packages/core
packages/db
packages/features
packages/ui
packages/test-utils
```

## Why this exists

The project will be built by coding agents over many tickets. If the repo structure is vague, Codex will scatter logic across the app and make later features hard to integrate. This ticket creates the package layout and basic scripts so later tickets have stable destinations.

## Scope

Create:

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
eslint.config.js
vitest.config.ts
README.md
apps/desktop/package.json
packages/core/package.json
packages/db/package.json
packages/features/package.json
packages/ui/package.json
packages/test-utils/package.json
```

Add placeholder `src/index.ts` files where appropriate.

Add root scripts:

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm package
```

Each package should have at least:

```bash
pnpm --filter <package> typecheck
pnpm --filter <package> test
pnpm --filter <package> build
```

## Out of scope

- Electron app implementation.
- SQLite schema.
- Feature logic.
- GitHub Actions CI.
- Detailed docs beyond basic README.

## Implementation method

1. Initialise a pnpm workspace.
2. Use TypeScript strict mode.
3. Create package names using a consistent namespace, for example:

```text
@local-work-os/desktop
@local-work-os/core
@local-work-os/db
@local-work-os/features
@local-work-os/ui
@local-work-os/test-utils
```

4. Configure TypeScript path aliases conservatively. Avoid clever aliases that hide package boundaries.
5. Add a root `README.md` explaining:

```text
what the project is
local-only scope
how to install
how to run tests
how to run the desktop app once implemented
```

6. Add simple placeholder exports in each package, for example:

```ts
export const packageName = '@local-work-os/core';
```

7. Add one trivial test in `packages/core` so `pnpm test` proves the setup works.

## Files to create or update

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
eslint.config.js
vitest.config.ts
README.md
apps/desktop/package.json
packages/core/package.json
packages/core/src/index.ts
packages/core/tests/smoke.test.ts
packages/db/package.json
packages/db/src/index.ts
packages/features/package.json
packages/features/src/index.ts
packages/ui/package.json
packages/ui/src/index.ts
packages/test-utils/package.json
packages/test-utils/src/index.ts
```

## Acceptance criteria

- [ ] `pnpm install` completes.
- [ ] `pnpm lint` completes, even if initially checking only basic files.
- [ ] `pnpm typecheck` completes.
- [ ] `pnpm test` runs at least one real test.
- [ ] `pnpm build` completes for package placeholders.
- [ ] Package boundaries are clear.
- [ ] No cloud, account, telemetry, or backend dependency is added.

## Test requirements

Add at least one test:

```text
packages/core/tests/smoke.test.ts
```

The test can verify a trivial export, but it must prove Vitest runs across the workspace.

## Manual QA

Run:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Confirm the repo structure matches the ticket.

## Codex prompt

```text
Goal: Implement LWO-M0-001 — Bootstrap pnpm monorepo and package structure.

Read the planning docs first. Create a pnpm TypeScript monorepo with apps/desktop and packages/core, db, features, ui, and test-utils. Keep this ticket limited to repository structure, package metadata, root scripts, TypeScript config, lint/test setup, placeholder exports, README, and one trivial test.

Do not implement Electron, SQLite, workspace creation, or product features yet.

Done when pnpm install, lint, typecheck, test, and build all pass.
```

## Done when

- [ ] Branch is pushed.
- [ ] PR uses repo template once available, or includes equivalent summary/tests.
- [ ] Commands pass locally or in CI.
- [ ] Linear issue can be moved to Review/Done.

## Follow-up tickets

- LWO-M0-002 — Add governance docs and AGENTS.md.
- LWO-M0-003 — Configure GitHub CI and PR workflow.
- LWO-M1-001 — Build Electron/Vite/React shell.


---

<!-- Source file: LWO-M0-002-governance-docs-and-agents.md -->


# LWO-M0-002 — Add governance docs, AGENTS.md, and decision records

## Linear metadata

- **Phase:** M0 — Governance and scaffold
- **Area:** Docs, Core
- **Kind:** Docs / Governance
- **Priority:** High
- **Estimate:** 2
- **Suggested labels:** `Phase/MVP`, `Area/Docs`, `Kind/Docs`, `Agent/CodexReady`
- **Dependencies:** LWO-M0-001
- **Suggested branch:** `LWO-M0-002/governance-docs-and-agents`
- **Suggested PR title:** `LWO-M0-002: Add governance docs and AGENTS.md`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Create the repo-level instruction and documentation structure that will keep Codex aligned with the product and architecture over many future tickets.

## Why this exists

Codex needs durable project instructions. Linear tickets alone are not enough. `AGENTS.md` should tell every future coding agent the architectural rules, local-only constraints, testing expectations, and review concerns.

## Scope

Create:

```text
AGENTS.md
docs/README.md
docs/PRODUCT_SPEC.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
docs/OPERATING_PLAN.md
docs/TESTING.md
docs/SECURITY.md
docs/ROADMAP.md
docs/MODULE_REGISTRY.md
docs/DECISIONS/ADR-template.md
docs/DECISIONS/ADR-0001-local-only-desktop.md
docs/DECISIONS/ADR-0002-electron-react-sqlite.md
docs/DECISIONS/ADR-0003-universal-container-item-model.md
```

The initial docs can be concise but must be real, structured, and linked.

## Out of scope

- Writing the full product spec from scratch inside this ticket.
- Implementing code.
- Creating Linear issues.
- Implementing database schema.

## Implementation method

1. Create `AGENTS.md` at repo root.
2. In `AGENTS.md`, include these non-negotiables:

```text
local-only desktop app
no cloud dependencies
no direct DB access from React
no direct filesystem access from renderer
all writes create activity log entries
searchable content updates search index
soft-delete by default
small scoped PRs only
```

3. Create docs skeletons that reference the existing major planning docs:

```text
Full Build Specification v0.1
Linear / GitHub / Codex Operating Plan v0.1
```

4. `docs/MODULE_REGISTRY.md` should list planned modules with one-paragraph responsibilities:

```text
Workspace
Database
Activity Log
Search
Inbox
Projects
Contacts
Tasks
Lists
Notes
Files
Links
Tags/Categories
Saved Views
Today
Dashboard
Timeline
Calendar
Backup/Export
Templates
Workflows
```

5. Add ADRs for the three already-decided architecture choices:

```text
ADR-0001: Local-only desktop app
ADR-0002: Electron + React + SQLite
ADR-0003: Universal container/item model
```

## Files to create or update

```text
AGENTS.md
docs/README.md
docs/PRODUCT_SPEC.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
docs/OPERATING_PLAN.md
docs/TESTING.md
docs/SECURITY.md
docs/ROADMAP.md
docs/MODULE_REGISTRY.md
docs/DECISIONS/ADR-template.md
docs/DECISIONS/ADR-0001-local-only-desktop.md
docs/DECISIONS/ADR-0002-electron-react-sqlite.md
docs/DECISIONS/ADR-0003-universal-container-item-model.md
```

## Acceptance criteria

- [ ] `AGENTS.md` exists and clearly instructs Codex.
- [ ] Docs folder exists and contains the expected files.
- [ ] ADR template exists.
- [ ] Three initial ADRs exist.
- [ ] Module registry names the planned modules and their responsibilities.
- [ ] Docs explicitly state local-only scope and cloud/mobile/team exclusions.
- [ ] No implementation code is added beyond documentation files.

## Test requirements

No automated tests required, but run:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

to confirm no repo setup was broken.

## Manual QA

Read `AGENTS.md` as if you are Codex and confirm it answers:

```text
What is this project?
What is forbidden?
Where should code go?
How should writes work?
What must be tested?
```

## Codex prompt

```text
Goal: Implement LWO-M0-002 — Add governance docs, AGENTS.md, and decision records.

Create durable project instructions and docs structure based on the two existing planning documents. Keep this ticket documentation-only. Do not implement product features.

AGENTS.md must include local-only constraints, package boundaries, activity-log requirements, search-index requirements, renderer/main process security boundaries, and testing expectations.

Done when the docs structure exists, initial ADRs are added, and lint/typecheck/test still pass.
```

## Done when

- [ ] PR contains docs only.
- [ ] `AGENTS.md` is ready for Codex.
- [ ] Docs are linked and coherent.

## Follow-up tickets

- LWO-M0-003 — Configure GitHub CI and PR workflow.
- LWO-M0-004 — Add module registry and placeholder feature contracts.


---

<!-- Source file: LWO-M0-003-github-ci-and-pr-workflow.md -->


# LWO-M0-003 — Configure GitHub CI, PR template, and Codex review guidelines

## Linear metadata

- **Phase:** M0 — Governance and scaffold
- **Area:** Testing, Docs, Core
- **Kind:** Feature / Test / Docs
- **Priority:** High
- **Estimate:** 2
- **Suggested labels:** `Phase/MVP`, `Area/Testing`, `Area/Docs`, `Kind/Test`, `Kind/Docs`, `Agent/CodexReady`
- **Dependencies:** LWO-M0-001, LWO-M0-002
- **Suggested branch:** `LWO-M0-003/github-ci-pr-workflow`
- **Suggested PR title:** `LWO-M0-003: Configure CI and PR workflow`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Create the GitHub workflow files that enforce the operating plan: pull requests, CI checks, and Codex review guidance.

## Why this exists

Future Codex work must be gated. Without CI and PR templates, agent-generated code can drift, skip tests, or ignore local-only constraints.

## Scope

Create:

```text
.github/pull_request_template.md
.github/workflows/ci.yml
.github/codex/review-guidelines.md
```

CI should run on:

```text
pull_request
push to main
```

Initial CI commands:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Out of scope

- Branch protection configuration in GitHub UI.
- Codex GitHub Action automation.
- Release packaging CI.
- Playwright E2E CI unless already available from scaffold.

## Implementation method

1. Add PR template with these sections:

```text
Summary
Linear issue
Scope
Out of scope
Product spec references
Implementation notes
Tests
Manual QA
Risk checklist
Screenshots / recordings
Codex notes
```

2. Add risk checklist items:

```text
No cloud dependency added
No direct DB access from React components
No direct filesystem access from renderer
Data-changing operations create activity log entries
Search index updated where relevant
Migrations include tests or verification
No Pagico branding, screenshots, copied wording, copied icons, or copied UI assets
```

3. Add GitHub Actions workflow using Node and pnpm.
4. Use caching if straightforward, but do not over-optimise.
5. Add Codex review guidelines that focus on:

```text
local-only scope
architecture boundaries
data integrity
search consistency
testing
scope control
```

## Files to create or update

```text
.github/pull_request_template.md
.github/workflows/ci.yml
.github/codex/review-guidelines.md
```

## Acceptance criteria

- [ ] CI file exists and runs install/lint/typecheck/test/build.
- [ ] PR template exists and requires scope, tests, QA, and risk checklist.
- [ ] Codex review guidelines exist.
- [ ] Workflow does not require cloud/backend services.
- [ ] CI does not require secrets.
- [ ] CI can run on a clean checkout.

## Test requirements

Open a PR and confirm CI runs.

If GitHub is not connected yet, run locally:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Manual QA

Review PR template and confirm it would force a Codex implementer to explain:

```text
what changed
what was tested
what is out of scope
whether architecture rules were respected
```

## Codex prompt

```text
Goal: Implement LWO-M0-003 — Configure GitHub CI, PR template, and Codex review guidelines.

Create .github/pull_request_template.md, .github/workflows/ci.yml, and .github/codex/review-guidelines.md. Follow the operating plan. Do not add product features. CI should run pnpm install --frozen-lockfile, lint, typecheck, test, and build.

Done when the files exist and local commands pass.
```

## Done when

- [ ] PR template is present.
- [ ] CI workflow is present.
- [ ] Codex review guidelines are present.
- [ ] Commands pass.

## Follow-up tickets

- LWO-M1-011 — Add test harness and smoke tests.
- Future: Add branch protection in GitHub settings after repo exists.


---

<!-- Source file: LWO-M0-004-module-registry-and-feature-placeholders.md -->


# LWO-M0-004 — Add module registry and feature placeholder contracts

## Linear metadata

- **Phase:** M0 — Governance and scaffold
- **Area:** Core, Docs
- **Kind:** Feature / Docs / Architecture
- **Priority:** High
- **Estimate:** 3
- **Suggested labels:** `Phase/MVP`, `Area/Core`, `Area/Docs`, `Kind/Feature`, `Kind/Docs`, `Agent/CodexReady`
- **Dependencies:** LWO-M0-001, LWO-M0-002
- **Suggested branch:** `LWO-M0-004/module-registry-feature-placeholders`
- **Suggested PR title:** `LWO-M0-004: Add module registry and feature placeholders`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Create explicit placeholder modules and documentation for the broad feature set so later Codex tickets have clear homes.

This addresses a major risk: if modules are not named and bounded early, coding agents will create accidental architecture.

## Why this exists

The product is broad: projects, contacts, tasks, notes, lists, files, tags, categories, search, collections, Today, dashboards, timeline/calendar, templates, workflows, backup/export. Even though these features will not be fully built now, the scaffold should know they exist and define where their code belongs.

## Scope

Create `docs/MODULE_REGISTRY.md` or update it if already created. Add placeholder service files for first-class modules in `packages/features/src`.

Required module placeholders:

```text
workspace
inbox
projects
contacts
tasks
lists
notes
files
links
metadata
search
savedViews
today
dashboard
timeline
calendar
backup
export
```

Each module folder should contain:

```text
README.md
<ModuleName>Service.ts
index.ts
```

Services may export empty interfaces or stub classes, but should include comments documenting planned responsibilities.

## Out of scope

- Implementing real feature logic.
- Adding database schema.
- Adding UI pages.
- Adding advanced modules like templates/workflows unless only as documented future modules.

## Implementation method

1. In `docs/MODULE_REGISTRY.md`, create a table:

```text
Module
Purpose
Primary entities
Depends on
Feeds into
MVP/V1/V2 priority
```

2. For each module, document:

```text
What it owns
What it does not own
Expected service methods later
Integration points
```

3. Create placeholder module files, for example:

```ts
// packages/features/src/tasks/TaskService.ts
// Owns task-specific application operations.
// Does not own raw DB access; must use repositories.
export interface TaskService {}
```

4. `metadata` should be the home for both tags and categories until split later.
5. `savedViews` should be the home for collections and smart lists.
6. Avoid over-implementation. This ticket creates contracts and structure only.

## Files to create or update

```text
docs/MODULE_REGISTRY.md
packages/features/src/workspace/README.md
packages/features/src/workspace/WorkspaceService.ts
packages/features/src/workspace/index.ts
packages/features/src/inbox/README.md
packages/features/src/inbox/InboxService.ts
packages/features/src/inbox/index.ts
packages/features/src/projects/README.md
packages/features/src/projects/ProjectService.ts
packages/features/src/projects/index.ts
packages/features/src/contacts/README.md
packages/features/src/contacts/ContactService.ts
packages/features/src/contacts/index.ts
packages/features/src/tasks/README.md
packages/features/src/tasks/TaskService.ts
packages/features/src/tasks/index.ts
packages/features/src/lists/README.md
packages/features/src/lists/ListService.ts
packages/features/src/lists/index.ts
packages/features/src/notes/README.md
packages/features/src/notes/NoteService.ts
packages/features/src/notes/index.ts
packages/features/src/files/README.md
packages/features/src/files/FileAttachmentService.ts
packages/features/src/files/index.ts
packages/features/src/links/README.md
packages/features/src/links/LinkService.ts
packages/features/src/links/index.ts
packages/features/src/metadata/README.md
packages/features/src/metadata/TagService.ts
packages/features/src/metadata/CategoryService.ts
packages/features/src/metadata/index.ts
packages/features/src/search/README.md
packages/features/src/search/SearchService.ts
packages/features/src/search/index.ts
packages/features/src/savedViews/README.md
packages/features/src/savedViews/SavedViewService.ts
packages/features/src/savedViews/index.ts
packages/features/src/today/README.md
packages/features/src/today/TodayService.ts
packages/features/src/today/index.ts
packages/features/src/dashboard/README.md
packages/features/src/dashboard/DashboardService.ts
packages/features/src/dashboard/index.ts
packages/features/src/timeline/README.md
packages/features/src/timeline/TimelineService.ts
packages/features/src/timeline/index.ts
packages/features/src/calendar/README.md
packages/features/src/calendar/CalendarService.ts
packages/features/src/calendar/index.ts
packages/features/src/backup/README.md
packages/features/src/backup/BackupService.ts
packages/features/src/backup/index.ts
packages/features/src/export/README.md
packages/features/src/export/ExportService.ts
packages/features/src/export/index.ts
packages/features/src/index.ts
```

## Acceptance criteria

- [ ] Module registry lists all planned modules and their responsibilities.
- [ ] Placeholder feature folders exist.
- [ ] Each placeholder README states ownership and non-ownership.
- [ ] Feature package exports module placeholders.
- [ ] No real feature logic is added prematurely.
- [ ] `pnpm typecheck` passes.

## Test requirements

No feature tests required. Add a simple import/export test if useful:

```text
packages/features/tests/moduleExports.test.ts
```

Confirm feature package exports do not break typechecking.

## Manual QA

Read `docs/MODULE_REGISTRY.md` and confirm it answers:

```text
Where should task code go?
Where should tags/categories code go?
Where should collections/smart lists code go?
Where should Today/dashboard code go?
Where should backup/export code go?
```

## Codex prompt

```text
Goal: Implement LWO-M0-004 — Add module registry and feature placeholder contracts.

Create docs/MODULE_REGISTRY.md and placeholder module folders under packages/features/src. Do not implement real business logic. The goal is to establish clear module ownership for future tickets.

Each module README must describe purpose, what the module owns, what it does not own, likely future service methods, and integration points. Ensure pnpm typecheck passes.
```

## Done when

- [ ] Module registry exists.
- [ ] Placeholder modules exist.
- [ ] Typecheck passes.

## Follow-up tickets

- LWO-M1-001 — Build Electron/Vite/React shell and placeholder routes.
- Future module tickets will fill these placeholders with implementation.


---

<!-- Source file: LWO-M1-001-desktop-shell-and-routes.md -->


# LWO-M1-001 — Build Electron/Vite/React desktop shell and placeholder routes

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** Desktop, UI
- **Kind:** Feature
- **Priority:** High
- **Estimate:** 3
- **Suggested labels:** `Phase/MVP`, `Area/Desktop`, `Area/UI`, `Kind/Feature`, `Risk/ElectronSecurity`, `Agent/CodexReady`
- **Dependencies:** LWO-M0-001, LWO-M0-002
- **Suggested branch:** `LWO-M1-001/desktop-shell-routes`
- **Suggested PR title:** `LWO-M1-001: Add Electron desktop shell and routes`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Create a deployable Electron + Vite + React + TypeScript desktop shell with placeholder routes for the future app modules.

## Why this exists

The product needs a real desktop shell early so workspace creation, database health, settings, and future feature pages can be integrated incrementally. The shell should establish the visual/navigation skeleton without implementing full features.

## Scope

Create:

```text
apps/desktop/src/main
apps/desktop/src/preload
apps/desktop/src/renderer
```

The app should launch and render:

```text
Welcome page
App shell
Sidebar
Top bar
Placeholder routes
Error boundary
```

Routes/placeholders:

```text
/
/welcome
/workspace
/today
/inbox
/projects
/contacts
/collections
/tags-categories
/search
/dashboard
/settings
```

## Out of scope

- Workspace creation implementation.
- Database connection.
- Real project/task/note/file features.
- Polished design system.
- Browser capture, cloud, mobile, sync, team features.

## Implementation method

1. Set up Electron main process entry.
2. Set up Vite React renderer.
3. Set Electron security defaults:

```text
contextIsolation: true
nodeIntegration: false
sandbox: false or true depending on preload needs, but renderer must not have Node access
```

4. Use preload for future API exposure, even if methods are placeholders now.
5. Add `AppShell` with:

```text
Sidebar
TopBar
MainContent outlet
```

6. Sidebar items should match the product modules:

```text
Today
Inbox
Projects
Contacts
Collections
Tags & Categories
Search
Dashboard
Settings
```

7. Add simple placeholder pages with descriptions of what each page will eventually do.
8. Add a visible local-only indicator somewhere subtle, such as Settings or Welcome.

## Files to create or update

```text
apps/desktop/package.json
apps/desktop/index.html
apps/desktop/vite.config.ts
apps/desktop/src/main/index.ts
apps/desktop/src/main/appLifecycle.ts
apps/desktop/src/main/workspaceWindow.ts
apps/desktop/src/preload/index.ts
apps/desktop/src/preload/api.ts
apps/desktop/src/renderer/main.tsx
apps/desktop/src/renderer/App.tsx
apps/desktop/src/renderer/routes.tsx
apps/desktop/src/renderer/styles.css
apps/desktop/src/renderer/shell/AppShell.tsx
apps/desktop/src/renderer/shell/Sidebar.tsx
apps/desktop/src/renderer/shell/TopBar.tsx
apps/desktop/src/renderer/shell/ErrorBoundary.tsx
apps/desktop/src/renderer/pages/WelcomePage.tsx
apps/desktop/src/renderer/pages/WorkspaceHomePage.tsx
apps/desktop/src/renderer/pages/TodayPage.tsx
apps/desktop/src/renderer/pages/InboxPage.tsx
apps/desktop/src/renderer/pages/ProjectsPage.tsx
apps/desktop/src/renderer/pages/ContactsPage.tsx
apps/desktop/src/renderer/pages/CollectionsPage.tsx
apps/desktop/src/renderer/pages/TagsCategoriesPage.tsx
apps/desktop/src/renderer/pages/SearchPage.tsx
apps/desktop/src/renderer/pages/DashboardPage.tsx
apps/desktop/src/renderer/pages/SettingsPage.tsx
```

## Acceptance criteria

- [ ] `pnpm dev` launches the desktop app.
- [ ] Welcome page renders.
- [ ] Sidebar renders planned modules.
- [ ] Top bar renders placeholder quick add/search controls.
- [ ] Placeholder routes work.
- [ ] Electron renderer has no direct Node filesystem or SQLite access.
- [ ] App can be built with `pnpm build`.

## Test requirements

Add at least:

```text
apps/desktop/tests/smoke/app-shell.test.ts or component equivalent
```

If Playwright is already configured, add a smoke test that verifies the Welcome page loads. If Playwright is not yet configured, this can wait for LWO-M1-011.

## Manual QA

Run:

```bash
pnpm dev
```

Verify:

```text
app opens
sidebar links work
placeholder pages display
no devtools console errors from broken imports
```

## Codex prompt

```text
Goal: Implement LWO-M1-001 — Build Electron/Vite/React desktop shell and placeholder routes.

Create a secure Electron desktop shell with React renderer and placeholder routes for Today, Inbox, Projects, Contacts, Collections, Tags & Categories, Search, Dashboard, and Settings. Do not implement workspace creation or database logic yet.

Renderer must not access Node APIs directly. Use preload as the future boundary. Keep the UI minimal but functional.

Done when pnpm dev launches the app and lint/typecheck/test/build pass.
```

## Done when

- [ ] Desktop shell launches.
- [ ] Routes exist.
- [ ] Security boundaries are respected.
- [ ] Commands pass.

## Follow-up tickets

- LWO-M1-002 — Implement typed preload IPC boundary.
- LWO-M1-010 — Connect workspace onboarding and database health UI.


---

<!-- Source file: LWO-M1-002-typed-preload-ipc-boundary.md -->


# LWO-M1-002 — Implement typed preload IPC boundary

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** Desktop, Security, Core
- **Kind:** Feature
- **Priority:** High
- **Estimate:** 3
- **Suggested labels:** `Phase/MVP`, `Area/Desktop`, `Area/Security`, `Kind/Feature`, `Risk/ElectronSecurity`, `Agent/CodexReady`
- **Dependencies:** LWO-M1-001
- **Suggested branch:** `LWO-M1-002/typed-preload-ipc-boundary`
- **Suggested PR title:** `LWO-M1-002: Add typed preload IPC boundary`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Create the typed API boundary between the React renderer and the Electron main process.

## Why this exists

This app will manage local files and a SQLite database. The renderer must never directly access filesystem or database APIs. A typed preload bridge gives future tickets a safe and consistent integration path.

## Scope

Create typed IPC groups for:

```text
workspace
database
containers
items
files
```

Only `workspace` and `database` may be implemented with real or placeholder behaviour now. Other groups can expose typed placeholders or be omitted until implemented, but the API shape should be documented.

Suggested preload API shape:

```ts
window.localWorkOs = {
  workspace: {
    createWorkspace(input),
    openWorkspace(input),
    getCurrentWorkspace(),
    listRecentWorkspaces()
  },
  database: {
    getHealthStatus()
  }
};
```

## Out of scope

- Actual workspace creation, unless already available.
- Actual database implementation.
- Complex validation libraries unless already part of the stack.
- Exposing raw IPC invoke/send to renderer.

## Implementation method

1. Define API types in a shared place, preferably:

```text
apps/desktop/src/preload/api.ts
```

or a future-safe shared package if useful.

2. Use `contextBridge.exposeInMainWorld`.
3. Register IPC handlers in main process using named modules:

```text
registerWorkspaceIpc.ts
registerDatabaseIpc.ts
registerFileIpc.ts
```

4. Renderer should call a wrapper client:

```text
apps/desktop/src/renderer/api/desktopApiClient.ts
```

5. Do not expose `ipcRenderer` itself to React.
6. IPC handlers should return structured results, not throw raw errors across the boundary.

Suggested result shape:

```ts
type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

7. Add type declaration for `window.localWorkOs`.

## Files to create or update

```text
apps/desktop/src/preload/api.ts
apps/desktop/src/preload/index.ts
apps/desktop/src/main/ipc/registerWorkspaceIpc.ts
apps/desktop/src/main/ipc/registerDatabaseIpc.ts
apps/desktop/src/main/ipc/registerFileIpc.ts
apps/desktop/src/main/index.ts
apps/desktop/src/renderer/api/desktopApiClient.ts
apps/desktop/src/renderer/types/global.d.ts
```

## Acceptance criteria

- [ ] Renderer can call `window.localWorkOs.workspace.getCurrentWorkspace()` or equivalent.
- [ ] Renderer cannot access raw `ipcRenderer`.
- [ ] Renderer cannot access Node `fs`.
- [ ] IPC channels are named constants or otherwise centralised.
- [ ] API result shape is consistent.
- [ ] TypeScript knows about the preload API.
- [ ] Placeholder calls return safe mock/empty values until real services are wired.

## Test requirements

Add tests where practical:

```text
preload API type tests or IPC handler unit tests
renderer client tests with mocked window.localWorkOs
```

At minimum, run:

```bash
pnpm typecheck
pnpm test
```

## Manual QA

Run the app and confirm:

```text
renderer loads without preload errors
Settings or Welcome can call a placeholder API method
no raw Node APIs are available from renderer console
```

## Codex prompt

```text
Goal: Implement LWO-M1-002 — Typed preload IPC boundary.

Create a typed, narrow preload API between React and Electron main. Do not expose raw ipcRenderer or Node APIs to the renderer. Define workspace and database API groups with structured ApiResult responses. Add main-process IPC registration files and a renderer-side client wrapper.

Do not implement real workspace/database logic in this ticket unless already available; safe placeholders are acceptable.

Done when the app launches, renderer can call the preload API, typecheck passes, and no direct filesystem/database access exists in renderer code.
```

## Done when

- [ ] Typed API exists.
- [ ] Renderer uses API wrapper.
- [ ] Security boundary is preserved.

## Follow-up tickets

- LWO-M1-003 — Workspace filesystem service.
- LWO-M1-004 — SQLite/Drizzle database setup.
- LWO-M1-010 — Renderer workspace onboarding and database health UI.


---

<!-- Source file: LWO-M1-003-workspace-filesystem-service.md -->


# LWO-M1-003 — Implement local workspace filesystem create/open/validate service

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** Workspace, Desktop, FileSystem
- **Kind:** Feature
- **Priority:** High
- **Estimate:** 3
- **Suggested labels:** `Phase/MVP`, `Area/Workspace`, `Area/Desktop`, `Kind/Feature`, `Risk/FileSystem`, `Agent/CodexReady`, `Quality/NeedsTests`
- **Dependencies:** LWO-M1-002
- **Suggested branch:** `LWO-M1-003/workspace-filesystem-service`
- **Suggested PR title:** `LWO-M1-003: Add workspace filesystem service`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Implement local workspace folder creation, opening, and validation in the Electron main process.

## Why this exists

The app is local-only. The workspace folder is the user’s local vault. Every later feature depends on a reliable local workspace with a database, attachment area, backups, exports, and metadata.

## Scope

Implement main-process services for:

```text
createWorkspace
openWorkspace
validateWorkspace
readWorkspaceManifest
writeWorkspaceManifest
listRecentWorkspaces
rememberRecentWorkspace
```

Workspace folder structure:

```text
<Workspace>/
  workspace.json
  data/
    local-work-os.sqlite       # created later by DB bootstrap
  attachments/
    .gitkeep
  backups/
    .gitkeep
  exports/
    .gitkeep
  logs/
    .gitkeep
```

Workspace manifest:

```json
{
  "id": "ULID",
  "name": "My Workspace",
  "schemaVersion": 1,
  "createdAt": "2026-04-28T00:00:00.000Z",
  "lastOpenedAt": "2026-04-28T00:00:00.000Z",
  "app": {
    "name": "Local Work OS",
    "workspaceFormat": 1
  }
}
```

## Out of scope

- Running database migrations.
- Creating database tables.
- Seeding Inbox.
- File attachments.
- Backup implementation beyond folder creation.

## Implementation method

1. Add a main-process workspace service, for example:

```text
apps/desktop/src/main/services/workspace/WorkspaceFileSystemService.ts
```

or use `packages/features/src/workspace` if the service can be kept Electron-safe. File dialog logic should stay in main process.

2. Use Node filesystem APIs only in main process.
3. Validate and normalise paths.
4. Prevent path traversal when writing internal files.
5. Use workspace-relative paths inside manifest where possible, but keep absolute root path in app memory/recent-workspaces settings.
6. Create missing safe folders on repair:

```text
attachments/
backups/
exports/
logs/
```

7. Do **not** silently recreate a missing database file once DB exists; report a clear validation error.
8. Store recent workspaces in Electron app user data, not inside a workspace.

Suggested validation result:

```ts
type WorkspaceValidationResult = {
  ok: boolean;
  workspaceRootPath: string;
  manifest?: WorkspaceManifest;
  problems: Array<{
    code: string;
    message: string;
    severity: 'error' | 'warning';
    repairable: boolean;
  }>;
};
```

## Files to create or update

```text
apps/desktop/src/main/services/workspace/WorkspaceFileSystemService.ts
apps/desktop/src/main/services/workspace/WorkspaceManifest.ts
apps/desktop/src/main/services/workspace/RecentWorkspacesService.ts
apps/desktop/src/main/services/safeFileSystem.ts
apps/desktop/src/main/ipc/registerWorkspaceIpc.ts
apps/desktop/src/preload/api.ts
apps/desktop/src/renderer/api/desktopApiClient.ts
packages/core/src/ids.ts
packages/core/src/time.ts
packages/core/src/errors.ts
```

## Acceptance criteria

- [ ] User/API can create a workspace folder.
- [ ] `workspace.json` is written.
- [ ] `data`, `attachments`, `backups`, `exports`, and `logs` folders are created.
- [ ] Workspace can be reopened from its folder.
- [ ] Validation detects missing manifest.
- [ ] Validation detects missing required folders.
- [ ] Repairable missing folders can be recreated.
- [ ] Recent workspace paths can be listed.
- [ ] Renderer calls workspace operations only through preload API.

## Test requirements

Add tests for:

```text
create workspace in temp directory
workspace.json shape
folder structure creation
invalid workspace path
missing workspace.json validation
missing repairable folders validation
recent workspace storage if practical
```

Use `packages/test-utils` or local test helpers to create and clean temporary directories.

## Manual QA

Run app and perform:

```text
Create workspace in temp folder.
Confirm folders exist on disk.
Open the same workspace again.
Delete attachments folder.
Open/validate workspace and confirm repair/warning behaviour.
```

## Codex prompt

```text
Goal: Implement LWO-M1-003 — Local workspace filesystem create/open/validate service.

Build the main-process service that creates and opens local workspace folders. The service must write workspace.json, create data/attachments/backups/exports/logs folders, validate workspace structure, track recent workspaces, and expose operations through the typed preload API.

Do not implement database schema or migrations in this ticket. Renderer must not use filesystem APIs directly.

Add tests using temporary directories.
```

## Done when

- [ ] Workspace filesystem operations work.
- [ ] Tests cover create/open/validate.
- [ ] No renderer filesystem access exists.

## Follow-up tickets

- LWO-M1-004 — SQLite/Drizzle database setup.
- LWO-M1-006 — Database bootstrap and seed data.
- LWO-M1-010 — Renderer workspace onboarding UI.


---

<!-- Source file: LWO-M1-004-sqlite-drizzle-database-setup.md -->


# LWO-M1-004 — Add SQLite/Drizzle database connection and migration runner

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** DB, Core
- **Kind:** Feature
- **Priority:** High
- **Estimate:** 3
- **Suggested labels:** `Phase/MVP`, `Area/DB`, `Kind/Feature`, `Risk/DataModel`, `Agent/CodexReady`, `Quality/NeedsTests`
- **Dependencies:** LWO-M0-001, LWO-M1-003
- **Suggested branch:** `LWO-M1-004/sqlite-drizzle-setup`
- **Suggested PR title:** `LWO-M1-004: Add SQLite and Drizzle database setup`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Add the database package foundation: SQLite connection, Drizzle setup, migration runner, and database path resolution.

## Why this exists

The product is a local-first work database. SQLite is the persistence core. This ticket creates the database connection and migration infrastructure before any business repositories are implemented.

## Scope

Implement:

```text
SQLite dependency
Drizzle configuration
database connection factory
database path resolver
migration runner service
basic database health check
```

Recommended SQLite driver:

```text
better-sqlite3
```

Reason: local synchronous SQLite access is simple and reliable in Node/Electron, and Drizzle supports it. If Codex finds packaging-specific issues, it should document them rather than switching to remote or cloud storage.

## Out of scope

- Full schema migration. That is LWO-M1-005.
- Repository methods. That is LWO-M1-007.
- UI integration. That is LWO-M1-010.
- Cloud/libSQL remote database.

## Implementation method

1. Add database package dependencies:

```text
drizzle-orm
drizzle-kit
better-sqlite3
```

2. Create:

```text
packages/db/drizzle.config.ts
packages/db/src/connection/createDatabaseConnection.ts
packages/db/src/connection/databasePath.ts
packages/db/src/services/MigrationService.ts
packages/db/src/services/DatabaseHealthService.ts
```

3. Connection factory should accept a database file path:

```ts
createDatabaseConnection({ databasePath })
```

4. Database path should resolve from workspace root:

```text
<workspaceRoot>/data/local-work-os.sqlite
```

5. Migration service should support:

```text
getCurrentSchemaVersion
runPendingMigrations
getMigrationStatus
```

6. The first implementation may use Drizzle migrations or explicit SQL migration files. Choose one path and document it.
7. Add a placeholder migration directory if no migration exists yet.
8. Ensure the service creates the SQLite file if missing.
9. Do not run migrations from React. Database setup belongs in main process/service layer.

## Files to create or update

```text
packages/db/package.json
packages/db/drizzle.config.ts
packages/db/src/connection/createDatabaseConnection.ts
packages/db/src/connection/databasePath.ts
packages/db/src/services/MigrationService.ts
packages/db/src/services/DatabaseHealthService.ts
packages/db/src/index.ts
packages/db/tests/databaseConnection.test.ts
packages/db/tests/migrationService.test.ts
```

## Acceptance criteria

- [ ] Database package has SQLite/Drizzle dependencies.
- [ ] Database connection can be opened against a temp SQLite file.
- [ ] Database path resolver returns `<workspaceRoot>/data/local-work-os.sqlite`.
- [ ] Migration service can report migration status.
- [ ] Health service can report connected/not connected.
- [ ] No remote database or network service is added.
- [ ] Tests pass.

## Test requirements

Add tests for:

```text
create connection to temp SQLite file
database path resolution
migration status on empty database
health check for valid connection
```

Use a temporary directory and clean up after tests.

## Manual QA

Run:

```bash
pnpm --filter @local-work-os/db test
pnpm test
pnpm typecheck
```

Confirm a SQLite file can be created in a temp folder.

## Codex prompt

```text
Goal: Implement LWO-M1-004 — Add SQLite/Drizzle database connection and migration runner.

Add the database package foundation using SQLite and Drizzle. Implement connection creation, workspace database path resolution, migration service scaffolding, and a database health service. Use local SQLite only. Do not implement the full schema yet.

Add tests for temp database creation, path resolution, migration status, and health checks.
```

## Done when

- [ ] DB package can create/open a local SQLite file.
- [ ] Migration runner structure exists.
- [ ] Tests pass.

## Follow-up tickets

- LWO-M1-005 — Initial database schema migration.
- LWO-M1-006 — Database bootstrap and seed data.


---

<!-- Source file: LWO-M1-005-initial-database-schema-migration.md -->


# LWO-M1-005 — Implement initial database schema migration

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** DB, Data Model
- **Kind:** Migration / Feature
- **Priority:** High
- **Estimate:** 5
- **Suggested labels:** `Phase/MVP`, `Area/DB`, `Kind/Migration`, `Risk/DataModel`, `Quality/NeedsMigrationTest`, `Agent/CodexReady`
- **Dependencies:** LWO-M1-004
- **Suggested branch:** `LWO-M1-005/initial-schema-migration`
- **Suggested PR title:** `LWO-M1-005: Add initial database schema migration`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Create the first real SQLite schema migration for the Local Work OS object graph.

This migration should establish the core tables needed by later modules:

```text
workspaces
app_settings
containers
container_tabs
items
task_details
list_details
list_items
note_details
links
attachments
tags
taggings
categories
relationships
saved_views
dashboards
dashboard_widgets
daily_plans
daily_plan_items
activity_log
search_index or FTS setup placeholder
```

## Why this exists

The app’s power comes from interconnected local objects. This schema must anticipate projects, contacts, tasks, notes, lists, files, tags, categories, search, dashboards, and Today planning without forcing later migrations to undo the foundation.

## Scope

Add schema definitions and migration for the stable foundation tables.

## Out of scope

Do not add advanced tables yet unless needed for a constraint:

```text
attachment_versions
reminder_policies
reminder_events
recurrence_rules
templates
workflow_definitions
workflow_runs
import_jobs
export_jobs
backup_jobs
```

These can be later migrations.

## Implementation method

1. Use text primary keys for IDs, preferably ULIDs generated in application code.
2. Use ISO datetime text fields consistently:

```text
created_at
updated_at
archived_at
deleted_at
completed_at
```

3. Add `workspace_id` to all user/workspace-owned tables.
4. Use soft delete fields where appropriate.
5. Add indexes for common lookups.
6. Add foreign keys where practical.
7. Include `PRAGMA foreign_keys = ON` in connection setup if not already done.
8. For booleans, use integer `0/1` consistently.
9. For JSON, store as text fields with `_json` suffix.
10. Create either a normal `search_index` table or FTS5 virtual table depending on chosen implementation. If FTS5 requires separate migration handling, document it and keep service API stable.

## Required table details

### `containers`

Must support:

```text
inbox
project
contact
```

Required fields include:

```text
id, workspace_id, type, name, slug, description, status,
category_id, color, is_favorite, is_system, sort_order,
created_at, updated_at, archived_at, deleted_at
```

### `items`

Must support:

```text
task, list, note, file, link, heading, location, comment
```

Required fields include:

```text
id, workspace_id, container_id, container_tab_id, type, title, body,
category_id, status, sort_order, pinned,
created_at, updated_at, completed_at, archived_at, deleted_at
```

### `task_details`

Required fields:

```text
item_id, task_status, priority, start_at, due_at, all_day,
timezone, reminder_policy_id, recurrence_rule_id,
created_at, updated_at
```

### `taggings`

Must support tags on:

```text
container
item
list_item
```

### `saved_views`

Must store query JSON for:

```text
collections
smart lists
saved searches
dashboard widgets
```

## Files to create or update

```text
packages/db/src/schema/workspaces.ts
packages/db/src/schema/appSettings.ts
packages/db/src/schema/containers.ts
packages/db/src/schema/containerTabs.ts
packages/db/src/schema/items.ts
packages/db/src/schema/taskDetails.ts
packages/db/src/schema/listDetails.ts
packages/db/src/schema/listItems.ts
packages/db/src/schema/noteDetails.ts
packages/db/src/schema/links.ts
packages/db/src/schema/attachments.ts
packages/db/src/schema/tags.ts
packages/db/src/schema/taggings.ts
packages/db/src/schema/categories.ts
packages/db/src/schema/relationships.ts
packages/db/src/schema/savedViews.ts
packages/db/src/schema/dashboards.ts
packages/db/src/schema/dashboardWidgets.ts
packages/db/src/schema/dailyPlans.ts
packages/db/src/schema/dailyPlanItems.ts
packages/db/src/schema/activityLog.ts
packages/db/src/schema/searchIndex.ts
packages/db/src/schema/index.ts
packages/db/src/migrations/0001_initial_schema.sql
packages/db/tests/migrations.test.ts
docs/DATA_MODEL.md
```

## Acceptance criteria

- [ ] Migration creates all required foundation tables.
- [ ] Migration can run on an empty SQLite database.
- [ ] Migration is idempotent through the migration runner, not by blindly rerunning SQL.
- [ ] Indexes exist for common container/item/task/tag/activity lookups.
- [ ] Schema supports Inbox, projects, contacts, tasks, lists, notes, files, links, tags, categories, relationships, saved views, dashboards, Today, and activity log.
- [ ] `docs/DATA_MODEL.md` is updated with table summaries.
- [ ] No cloud/team/mobile tables are introduced.

## Test requirements

Add migration tests that:

```text
create temp database
run migration
verify each required table exists
verify key indexes exist where practical
insert minimal workspace row
insert minimal container row
insert minimal item row
insert minimal activity_log row
```

Also test foreign-key behaviour if enabled.

## Manual QA

Use a local SQLite inspection tool or script to confirm:

```text
tables exist
indexes exist
foreign keys are reasonable
schema version is recorded
```

## Codex prompt

```text
Goal: Implement LWO-M1-005 — Initial database schema migration.

Create the initial SQLite/Drizzle schema and migration for the Local Work OS object graph. Include tables for workspaces, settings, containers, tabs, items, task/list/note/link details, attachments, tags, taggings, categories, relationships, saved views, dashboards, daily plans, activity log, and search index foundation.

Do not implement advanced reminders, recurrence, templates, workflows, or cloud/team/mobile tables.

Add migration tests that prove the schema can be created and core rows can be inserted.
```

## Done when

- [ ] Migration creates foundation schema.
- [ ] Migration tests pass.
- [ ] Data model docs updated.

## Follow-up tickets

- LWO-M1-006 — Database bootstrap and seed system rows.
- LWO-M1-007 — Repository foundations.
- LWO-M1-009 — Search index foundation.


---

<!-- Source file: LWO-M1-006-database-bootstrap-and-seed-data.md -->


# LWO-M1-006 — Implement database bootstrap and seed system rows

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** DB, Workspace, Dashboard, Inbox
- **Kind:** Feature
- **Priority:** High
- **Estimate:** 3
- **Suggested labels:** `Phase/MVP`, `Area/DB`, `Area/Workspace`, `Area/Inbox`, `Area/Dashboard`, `Kind/Feature`, `Risk/DataModel`, `Agent/CodexReady`, `Quality/NeedsTests`
- **Dependencies:** LWO-M1-003, LWO-M1-005
- **Suggested branch:** `LWO-M1-006/database-bootstrap-seed-data`
- **Suggested PR title:** `LWO-M1-006: Add database bootstrap and seed data`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

When a workspace is created or opened, initialise the database and guarantee required system rows exist.

Required system rows:

```text
workspace row
system Inbox container
default dashboard
default dashboard widgets or placeholders
default app settings
workspace_created activity event
```

## Why this exists

A workspace is not usable just because a folder and SQLite file exist. The app needs a known system Inbox, settings, dashboard placeholder, and activity trail from day one.

## Scope

Implement:

```text
DatabaseBootstrapService
WorkspaceSeedService
ensureSystemInbox
ensureDefaultDashboard
ensureDefaultSettings
workspace_created activity event
```

## Out of scope

- Full dashboard widgets.
- Full Inbox UI.
- Project/task creation.
- Search indexing of all records beyond minimal seed support.

## Implementation method

1. `DatabaseBootstrapService.bootstrapWorkspaceDatabase(input)` should:

```text
open database connection
run pending migrations
upsert/create workspace row
ensure system Inbox container
ensure default dashboard row
ensure default dashboard widgets/placeholders
ensure default settings
log workspace_created only on first creation
return health/bootstrap result
```

2. The system Inbox container should be:

```text
type = inbox
name = Inbox
slug = inbox
status = active
is_system = 1
is_favorite = 1 or 0 depending on UI preference
```

3. Default dashboard should be:

```text
name = Dashboard
is_default = 1
```

4. Default dashboard widgets may be simple rows:

```text
today
overdue
upcoming
favorites
recent_activity
```

5. Default settings can include:

```text
default_view
today_backlog_days
backup_retention
```

6. Make seeding idempotent. Running bootstrap twice must not create duplicate Inbox or duplicate default dashboards.
7. Seed operations should happen in a transaction where possible.

## Files to create or update

```text
packages/db/src/services/DatabaseBootstrapService.ts
packages/db/src/services/WorkspaceSeedService.ts
packages/db/src/repositories/WorkspaceRepository.ts
packages/db/src/repositories/ContainerRepository.ts
packages/db/src/repositories/DashboardRepository.ts
packages/db/src/repositories/AppSettingsRepository.ts
packages/db/src/repositories/ActivityLogRepository.ts
packages/db/tests/databaseBootstrap.test.ts
packages/db/tests/workspaceSeed.test.ts
apps/desktop/src/main/ipc/registerWorkspaceIpc.ts
```

## Acceptance criteria

- [ ] New workspace bootstrap creates workspace row.
- [ ] New workspace bootstrap creates exactly one system Inbox.
- [ ] New workspace bootstrap creates exactly one default dashboard.
- [ ] New workspace bootstrap creates default settings.
- [ ] `workspace_created` activity event is logged on first bootstrap.
- [ ] Running bootstrap twice does not duplicate system rows.
- [ ] Bootstrap returns a useful result containing workspace ID, schema version, and system row status.

## Test requirements

Add tests for:

```text
bootstrap empty database
workspace row exists
system Inbox exists
Inbox is idempotent
default dashboard exists
default settings exist
workspace_created activity exists
second bootstrap does not duplicate system rows
```

## Manual QA

After creating a workspace, inspect database and confirm:

```text
workspaces has one row
containers has one system Inbox row
dashboards has one default row
activity_log contains workspace_created
```

## Codex prompt

```text
Goal: Implement LWO-M1-006 — Database bootstrap and seed data.

Create DatabaseBootstrapService and WorkspaceSeedService. On workspace creation/open, run migrations and ensure workspace row, system Inbox, default dashboard, default settings, and workspace_created activity event exist. Seeding must be idempotent.

Add tests proving bootstrap and idempotency.
```

## Done when

- [ ] Bootstrap service exists.
- [ ] Seed rows exist.
- [ ] Tests pass.

## Follow-up tickets

- LWO-M1-007 — Repository foundations.
- LWO-M1-010 — Workspace onboarding and database health UI.


---

<!-- Source file: LWO-M1-007-repository-foundations.md -->


# LWO-M1-007 — Implement repository foundations for workspace, containers, items, activity, and search

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** DB, Core
- **Kind:** Feature
- **Priority:** High
- **Estimate:** 4
- **Suggested labels:** `Phase/MVP`, `Area/DB`, `Area/Core`, `Kind/Feature`, `Risk/DataModel`, `Agent/CodexReady`, `Quality/NeedsTests`
- **Dependencies:** LWO-M1-005
- **Suggested branch:** `LWO-M1-007/repository-foundations`
- **Suggested PR title:** `LWO-M1-007: Add repository foundations`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Create the repository layer that future feature services will use to read/write database records.

## Why this exists

React components and feature services should not write raw SQL. Repositories isolate database access, make tests easier, and keep Codex from duplicating query logic in random modules.

## Scope

Implement foundational repositories:

```text
WorkspaceRepository
ContainerRepository
ContainerTabRepository
ItemRepository
ActivityLogRepository
SearchIndexRepository
```

The first implementation should support basic create/read/list/update operations.

## Out of scope

- Full task/list/note repositories. These come in feature-specific tickets.
- Complex saved-view evaluation.
- Full text search ranking beyond search foundation.
- UI integration.

## Implementation method

1. Each repository should accept a database connection or transaction handle.
2. Methods should be small and predictable.
3. Use typed inputs and outputs.
4. Do not log activity inside low-level repositories unless the repository is specifically `ActivityLogRepository`. Activity logging should be orchestrated by services/commands.
5. Repositories should filter out `deleted_at IS NOT NULL` by default for normal list methods.
6. Provide explicit methods if archived/deleted records are needed.

Suggested methods:

### `WorkspaceRepository`

```ts
create(input)
getById(workspaceId)
getByRootPath(rootPath)
updateLastOpened(workspaceId)
```

### `ContainerRepository`

```ts
create(input)
getById(id)
listByWorkspace(workspaceId, filters?)
listByType(workspaceId, type)
update(id, patch)
archive(id)
softDelete(id)
findSystemInbox(workspaceId)
```

### `ContainerTabRepository`

```ts
create(input)
ensureDefaultTab(containerId)
listByContainer(containerId)
```

### `ItemRepository`

```ts
create(input)
getById(id)
listByContainer(containerId, filters?)
update(id, patch)
move(id, targetContainerId, targetTabId?)
archive(id)
softDelete(id)
```

### `ActivityLogRepository`

```ts
create(event)
listRecent(workspaceId, limit)
listForTarget(targetType, targetId)
```

### `SearchIndexRepository`

```ts
upsert(record)
remove(targetType, targetId)
search(workspaceId, query, options?)
```

## Files to create or update

```text
packages/db/src/repositories/WorkspaceRepository.ts
packages/db/src/repositories/ContainerRepository.ts
packages/db/src/repositories/ContainerTabRepository.ts
packages/db/src/repositories/ItemRepository.ts
packages/db/src/repositories/ActivityLogRepository.ts
packages/db/src/repositories/SearchIndexRepository.ts
packages/db/src/repositories/index.ts
packages/db/tests/workspaceRepository.test.ts
packages/db/tests/containerRepository.test.ts
packages/db/tests/containerTabRepository.test.ts
packages/db/tests/itemRepository.test.ts
packages/db/tests/activityLogRepository.test.ts
packages/db/tests/searchIndexRepository.test.ts
```

## Acceptance criteria

- [ ] Workspace repository can create/read workspace.
- [ ] Container repository can create/read/list/update/archive/soft-delete containers.
- [ ] Container tab repository can create/list tabs and ensure default tab.
- [ ] Item repository can create/read/list/update/move/archive/soft-delete items.
- [ ] Activity log repository can create/list events.
- [ ] Search index repository has a stable service-facing interface.
- [ ] Repositories do not import React or Electron.
- [ ] Tests use temporary SQLite databases.

## Test requirements

Add tests covering:

```text
create/read workspace
create project container
list active containers excludes deleted rows
archive container
create item in container
move item between containers
soft-delete item
create activity log event
search index upsert/search if implementation exists
```

## Manual QA

No UI QA required. Run:

```bash
pnpm --filter @local-work-os/db test
pnpm test
```

## Codex prompt

```text
Goal: Implement LWO-M1-007 — Repository foundations.

Create repository classes/functions for workspace, containers, container tabs, items, activity log, and search index. Repositories should hide SQL/Drizzle details from feature services and include tests against temporary SQLite databases.

Do not implement feature-specific task/list/note logic yet. Do not put activity orchestration inside generic repositories.
```

## Done when

- [ ] Repositories exist.
- [ ] Repository tests pass.
- [ ] Repositories are exported from db package.

## Follow-up tickets

- LWO-M1-008 — Transaction and activity-log write pattern.
- Future: Task/List/Note repository tickets.


---

<!-- Source file: LWO-M1-008-transaction-and-activity-log-pattern.md -->


# LWO-M1-008 — Implement transaction service and activity-log write pattern

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** DB, Core
- **Kind:** Feature
- **Priority:** High
- **Estimate:** 3
- **Suggested labels:** `Phase/MVP`, `Area/DB`, `Area/Core`, `Kind/Feature`, `Risk/DataModel`, `Agent/CodexReady`, `Quality/NeedsTests`
- **Dependencies:** LWO-M1-006, LWO-M1-007
- **Suggested branch:** `LWO-M1-008/transaction-activity-log-pattern`
- **Suggested PR title:** `LWO-M1-008: Add transaction and activity-log write pattern`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Define and implement the standard write flow used by all future features:

```text
validate input
start transaction
write domain data
write activity event
update search index if relevant
commit transaction
```

## Why this exists

The activity log is central to recent activity, debugging, future undo, backup confidence, and coherent state changes. If every feature invents its own write flow, the app will become inconsistent.

## Scope

Implement:

```text
TransactionService
ActivityLogService
ActivityAction constants/types
standard write helper or command pattern
example command using container creation or item creation
```

The example command should prove the pattern works.

## Out of scope

- Full project/task feature implementation.
- Full search index integration if LWO-M1-009 is not done yet.
- Undo functionality.
- Sync functionality.

## Implementation method

1. Create `ActivityAction` constants in `packages/core`:

```text
workspace_created
workspace_opened
container_created
container_updated
container_archived
item_created
item_updated
item_moved
item_archived
task_completed
tag_added
tag_removed
category_assigned
relationship_created
file_attached
search_index_rebuilt
backup_created
export_created
```

2. Create `TransactionService` in `packages/db`:

```ts
runInTransaction<T>(fn: (tx: TransactionHandle) => T | Promise<T>): Promise<T>
```

Actual implementation may be synchronous if using `better-sqlite3`; keep external API stable.

3. Create `ActivityLogService.logEvent()` that accepts:

```ts
workspaceId
actorType
action
targetType
targetId
summary
beforeJson
afterJson
```

4. Add an example application-level command, such as:

```text
CreateContainerCommand
```

It should:

```text
create container
create default tab if project/contact
write container_created activity event
return created container
```

5. Ensure tests prove the data row and activity row are committed together.
6. If search service exists, include optional search update hook; otherwise leave a documented extension point.

## Files to create or update

```text
packages/core/src/events/ActivityAction.ts
packages/core/src/events/DomainEvent.ts
packages/db/src/services/TransactionService.ts
packages/db/src/services/ActivityLogService.ts
packages/features/src/workspace/WorkspaceCommands.ts
packages/features/src/projects/CreateContainerCommand.ts or packages/features/src/containers/CreateContainerCommand.ts
packages/db/tests/transactionService.test.ts
packages/db/tests/activityLogService.test.ts
packages/features/tests/createContainerCommand.test.ts
```

## Acceptance criteria

- [ ] Activity action constants exist.
- [ ] Transaction service exists.
- [ ] Activity log service exists.
- [ ] At least one command uses transaction + activity log.
- [ ] Test proves command creates domain row and activity row.
- [ ] Test proves failed transaction does not leave partial writes.
- [ ] Future features have an obvious pattern to follow.

## Test requirements

Add tests for:

```text
successful transaction commits all writes
failed transaction rolls back all writes
activity event can be logged
example command creates both domain record and activity event
```

## Manual QA

No UI QA required. Inspect test output and example command to confirm it is copyable for future features.

## Codex prompt

```text
Goal: Implement LWO-M1-008 — Transaction service and activity-log write pattern.

Create TransactionService, ActivityLogService, ActivityAction constants, and one example command that creates a container while logging activity in the same transaction. Add tests for commit and rollback behaviour.

Do not implement full projects/tasks UI. This ticket establishes the write pattern future features must follow.
```

## Done when

- [ ] Transaction pattern exists.
- [ ] Activity log service exists.
- [ ] Example command demonstrates pattern.
- [ ] Tests prove rollback/commit.

## Follow-up tickets

- LWO-M1-009 — Search index foundation.
- Future feature commands must reuse this pattern.


---

<!-- Source file: LWO-M1-009-search-index-foundation.md -->


# LWO-M1-009 — Implement local search index foundation

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** Search, DB
- **Kind:** Feature
- **Priority:** High
- **Estimate:** 3
- **Suggested labels:** `Phase/MVP`, `Area/Search`, `Area/DB`, `Kind/Feature`, `Risk/SearchIndex`, `Agent/CodexReady`, `Quality/NeedsTests`
- **Dependencies:** LWO-M1-005, LWO-M1-007
- **Suggested branch:** `LWO-M1-009/search-index-foundation`
- **Suggested PR title:** `LWO-M1-009: Add local search index foundation`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Create the foundation for local full-text search across containers and items.

## Why this exists

Search is a core navigation mode. It should not be bolted on later. Even before all features exist, the app should have a stable search service API and database search index foundation.

## Scope

Implement:

```text
SearchIndexService
SearchIndexRepository if not already complete
basic FTS or fallback search table
upsert container searchable record
upsert item searchable record
remove/deactivate searchable record
basic search query
rebuildWorkspaceIndex placeholder or simple implementation
```

## Out of scope

- Advanced ranking.
- Saved views/collections query evaluator.
- Search UI beyond health placeholder.
- Searching attachment file contents.
- OCR.

## Implementation method

1. Prefer SQLite FTS5 if available with the chosen driver.
2. If FTS5 setup is complex, create a normal `search_index` table now and document FTS5 upgrade path, but keep service API FTS-compatible.
3. Search index records should include:

```text
target_type
target_id
workspace_id
title
body
tags
category
metadata
updated_at
```

4. `SearchIndexService.upsertContainer(container)` should derive searchable text from:

```text
name
description
category
tags later
```

5. `SearchIndexService.upsertItem(item, details?)` should derive searchable text from:

```text
title
body
note content later
link URL/title later
file metadata later
```

6. Search should exclude deleted records if it joins source tables. If using standalone index only, record active/deleted state or resolve results through source repositories.
7. Add `rebuildWorkspaceIndex(workspaceId)` placeholder or basic implementation for containers/items.

## Files to create or update

```text
packages/db/src/schema/searchIndex.ts
packages/db/src/repositories/SearchIndexRepository.ts
packages/db/src/services/SearchIndexService.ts
packages/features/src/search/SearchService.ts
packages/db/tests/searchIndexRepository.test.ts
packages/db/tests/searchIndexService.test.ts
packages/features/tests/searchService.test.ts
```

## Acceptance criteria

- [ ] Search index table or FTS virtual table exists.
- [ ] Search service API is stable.
- [ ] Container records can be indexed.
- [ ] Item records can be indexed.
- [ ] Basic search returns matching target IDs and titles.
- [ ] Removed/deleted targets can be removed from search results.
- [ ] Tests cover simple container and item searches.

## Test requirements

Add tests for:

```text
index container and search by name
index item and search by title
update indexed record and search new term
remove indexed record and confirm result disappears
workspace isolation between two workspaces
```

## Manual QA

No full UI QA required. Optionally add a temporary debug call in Settings to show search availability, but avoid product UI scope creep.

## Codex prompt

```text
Goal: Implement LWO-M1-009 — Local search index foundation.

Create SearchIndexService and repository support for indexing and searching containers/items. Prefer SQLite FTS5, but if not practical in this scaffold, use a normal search_index table while keeping the service API ready for FTS.

Add tests for indexing, searching, updating, removing, and workspace isolation. Do not implement collections/smart lists or advanced UI.
```

## Done when

- [ ] Search service exists.
- [ ] Basic search tests pass.
- [ ] Search API can be used by future modules.

## Follow-up tickets

- Future: Global search UI.
- Future: Saved views and collections.
- Future: Note/file/link search integration.


---

<!-- Source file: LWO-M1-010-renderer-workspace-onboarding-and-health-ui.md -->


# LWO-M1-010 — Implement renderer workspace onboarding and database health UI

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** Desktop, Workspace, DB, UI
- **Kind:** Feature
- **Priority:** High
- **Estimate:** 4
- **Suggested labels:** `Phase/MVP`, `Area/Desktop`, `Area/Workspace`, `Area/DB`, `Area/UI`, `Kind/Feature`, `Risk/FileSystem`, `Risk/ElectronSecurity`, `Agent/CodexReady`, `Quality/NeedsManualQA`
- **Dependencies:** LWO-M1-002, LWO-M1-003, LWO-M1-006
- **Suggested branch:** `LWO-M1-010/workspace-onboarding-health-ui`
- **Suggested PR title:** `LWO-M1-010: Add workspace onboarding and database health UI`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Wire the renderer to the workspace and database services so a user can create/open a workspace and see database health.

## Why this exists

The scaffold becomes real when the user can launch the desktop app, create a local workspace, initialise the database, and see evidence that the local system is healthy.

## Scope

Implement UI for:

```text
Welcome page create workspace action
Welcome page open workspace action
Recent workspaces list if available
Workspace home health summary
Settings page workspace/database details
```

Show at least:

```text
workspace name
workspace root path
database path
schema version
Inbox exists yes/no
activity log available yes/no
search index available yes/no
```

## Out of scope

- Creating projects/tasks/notes.
- Full settings system.
- Polished design.
- Backup/export buttons.
- Search UI.

## Implementation method

1. Add renderer state store for current workspace:

```text
apps/desktop/src/renderer/state/workspaceStore.ts
```

2. Welcome page should call preload API:

```text
workspace.createWorkspace
workspace.openWorkspace
workspace.listRecentWorkspaces
```

3. On successful create/open:

```text
workspace folder is created/opened
database bootstrap runs
current workspace is set
app navigates to /workspace or /dashboard
```

4. Workspace home page should call:

```text
database.getHealthStatus
```

5. Settings page should display workspace and database details.
6. Handle loading, error, and empty states.
7. All filesystem/database calls must go through preload API.

Suggested health shape:

```ts
type DatabaseHealth = {
  connected: boolean;
  schemaVersion: number;
  workspaceExists: boolean;
  inboxExists: boolean;
  defaultDashboardExists: boolean;
  searchIndexAvailable: boolean;
  activityLogAvailable: boolean;
  databasePath: string;
};
```

## Files to create or update

```text
apps/desktop/src/renderer/pages/WelcomePage.tsx
apps/desktop/src/renderer/pages/WorkspaceHomePage.tsx
apps/desktop/src/renderer/pages/SettingsPage.tsx
apps/desktop/src/renderer/state/workspaceStore.ts
apps/desktop/src/renderer/api/desktopApiClient.ts
apps/desktop/src/main/ipc/registerWorkspaceIpc.ts
apps/desktop/src/main/ipc/registerDatabaseIpc.ts
apps/desktop/src/preload/api.ts
packages/db/src/services/DatabaseHealthService.ts
```

## Acceptance criteria

- [ ] User can create a workspace from Welcome page.
- [ ] Workspace folder and `workspace.json` are created.
- [ ] SQLite database is created/bootstrapped.
- [ ] User can open an existing workspace.
- [ ] Current workspace state appears in renderer.
- [ ] Workspace home shows health status.
- [ ] Settings page shows workspace path, database path, schema version, Inbox status, activity log status, and search index status.
- [ ] Errors are displayed clearly rather than crashing.
- [ ] No renderer direct filesystem/database access.

## Test requirements

Add component or integration tests for:

```text
Welcome page empty state
Workspace health display with mocked API
Error state when create/open fails
```

If Playwright is configured, add E2E smoke:

```text
launch app
see Welcome page
create temp workspace
see Workspace Home
see health status
```

## Manual QA

Run app and verify:

```text
Create workspace.
Confirm workspace folder exists.
Confirm database file exists.
Confirm Settings page shows schema version and Inbox exists.
Quit and reopen app.
Open existing workspace.
```

## Codex prompt

```text
Goal: Implement LWO-M1-010 — Renderer workspace onboarding and database health UI.

Wire the Welcome page, Workspace Home, and Settings page to the typed preload API. User should be able to create/open a local workspace, trigger database bootstrap, and see health details including workspace path, database path, schema version, Inbox status, activity log status, and search index status.

Do not implement project/task/note features. All filesystem/database operations must go through preload IPC.
```

## Done when

- [ ] Create/open workspace works through UI.
- [ ] Health UI shows real data.
- [ ] Tests/QA pass.

## Follow-up tickets

- LWO-M1-011 — Test harness and smoke tests.
- Future: Inbox/project/task UI slices.


---

<!-- Source file: LWO-M1-011-test-harness-and-smoke-tests.md -->


# LWO-M1-011 — Add test harness, temp workspace utilities, and smoke tests

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** Testing, Workspace, DB, Desktop
- **Kind:** Test / Feature
- **Priority:** High
- **Estimate:** 3
- **Suggested labels:** `Phase/MVP`, `Area/Testing`, `Area/Workspace`, `Area/DB`, `Area/Desktop`, `Kind/Test`, `Agent/CodexReady`
- **Dependencies:** LWO-M1-003, LWO-M1-006, LWO-M1-010
- **Suggested branch:** `LWO-M1-011/test-harness-smoke-tests`
- **Suggested PR title:** `LWO-M1-011: Add test harness and scaffold smoke tests`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Create shared test utilities and smoke tests that future Codex tickets can reuse.

## Why this exists

Agent-built software needs reliable tests. Future database, workspace, file, and UI tickets should not each invent their own temp-directory and temp-database setup.

## Scope

Create shared utilities:

```text
createTestWorkspace
createTestDatabase
seedTestData
cleanupTestWorkspace
makeTestIds
```

Add tests covering:

```text
workspace create/open
migration/bootstrap
system Inbox seed
activity log seed
workspace health
renderer shell smoke
```

If Playwright/Electron smoke testing is practical, add it. If not, add clear docs for how to add it next.

## Out of scope

- Full E2E suite for product features.
- Visual regression testing.
- Performance testing.
- Packaging tests.

## Implementation method

1. Create `packages/test-utils` helpers.
2. Helpers should create temp folders and delete them after tests.
3. Avoid polluting the developer’s real workspace or app data.
4. Create a test workspace fixture that contains:

```text
workspace.json
data/local-work-os.sqlite
attachments/backups/exports/logs folders
```

5. Add database tests that run against temp SQLite files.
6. Add renderer tests with mocked preload API.
7. If using Playwright, make one smoke test:

```text
app launches
Welcome page visible
```

8. Document test commands in `docs/TESTING.md`.

## Files to create or update

```text
packages/test-utils/src/createTestWorkspace.ts
packages/test-utils/src/createTestDatabase.ts
packages/test-utils/src/seedTestData.ts
packages/test-utils/src/cleanupTestWorkspace.ts
packages/test-utils/src/index.ts
packages/test-utils/tests/createTestWorkspace.test.ts
apps/desktop/tests/smoke/app-launch.spec.ts
apps/desktop/tests/renderer/WorkspaceHealth.test.tsx
packages/db/tests/bootstrapIntegration.test.ts
docs/TESTING.md
playwright.config.ts if not already present
```

## Acceptance criteria

- [ ] Shared temp workspace utility exists.
- [ ] Shared temp database utility exists.
- [ ] Bootstrap integration test uses shared utilities.
- [ ] Renderer can be tested with mocked preload API.
- [ ] At least one desktop shell smoke test exists or a documented blocker explains why not.
- [ ] `docs/TESTING.md` explains test commands and patterns.
- [ ] Tests do not write to real user workspace paths.

## Test requirements

This ticket is primarily tests. Required test coverage:

```text
temp workspace utility creates expected structure
temp DB can run migrations/bootstrap
Inbox exists after bootstrap
workspace_created activity exists after bootstrap
renderer health component handles healthy and error states
```

## Manual QA

Run:

```bash
pnpm test
pnpm --filter @local-work-os/db test
pnpm --filter @local-work-os/desktop test
```

If E2E exists:

```bash
pnpm --filter @local-work-os/desktop test:e2e
```

## Codex prompt

```text
Goal: Implement LWO-M1-011 — Test harness, temp workspace utilities, and smoke tests.

Create reusable test utilities for temporary workspaces and databases. Add tests for workspace creation/bootstrap, system Inbox seed, workspace_created activity event, and renderer health display with mocked preload API. Add a desktop launch smoke test if practical.

Do not add product features. Focus on making future Codex work safer.
```

## Done when

- [ ] Test utilities exist.
- [ ] Scaffold tests pass.
- [ ] Testing docs updated.

## Follow-up tickets

- Future: Add Playwright flows for create project/add task once those features exist.


---

<!-- Source file: LWO-M1-012-packaging-and-development-build-verification.md -->


# LWO-M1-012 — Add packaging configuration and development build verification

## Linear metadata

- **Phase:** M1 — Workspace and database foundation
- **Area:** Desktop, Testing
- **Kind:** Feature / Test
- **Priority:** Medium
- **Estimate:** 2
- **Suggested labels:** `Phase/MVP`, `Area/Desktop`, `Area/Testing`, `Kind/Feature`, `Kind/Test`, `Agent/CodexReady`
- **Dependencies:** LWO-M1-001, LWO-M1-010, LWO-M1-011
- **Suggested branch:** `LWO-M1-012/packaging-build-verification`
- **Suggested PR title:** `LWO-M1-012: Add packaging and build verification`


## Strategic document links

This ticket connects to the two major planning documents already produced:

- **Full Build Specification v0.1**: use as the product and architecture source of truth. In the future repo this should live as `docs/PRODUCT_SPEC.md`, with extracted architecture/database sections in `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.
- **Linear / GitHub / Codex Operating Plan v0.1**: use as the workflow source of truth. In the future repo this should live as `docs/OPERATING_PLAN.md`, with extracted workflow sections in `docs/LINEAR_WORKFLOW.md`, `docs/GITHUB_WORKFLOW.md`, and `docs/CODEX_WORKFLOW.md`.

Relevant permanent guardrails:

- Local-only desktop app.
- No cloud sync, hosted accounts, public sharing, telemetry, or mobile app code.
- Renderer must not directly access SQLite or the filesystem.
- Database access must go through repositories/services.
- Data-changing operations must create activity-log entries.
- Searchable data changes must update the search index once the search service exists.
- Soft-delete user data by default.


## Goal

Add initial desktop packaging configuration and verify the scaffold can build as a desktop app.

## Why this exists

The scaffold should be deployable, not just runnable in dev mode. Full production packaging and code signing can come later, but the project should prove that the Electron app can be built without breaking workspace/database paths.

## Scope

Implement or verify:

```text
electron-builder configuration
app build command
package command
basic packaged-app path handling
README packaging instructions
```

## Out of scope

- Code signing.
- Notarisation.
- Auto-update.
- Release CI.
- Installer polish.
- Multi-platform release matrix.

## Implementation method

1. Add or update:

```text
apps/desktop/electron-builder.yml
```

2. Ensure desktop package scripts include:

```bash
pnpm build
pnpm package
```

3. Verify app path assumptions:

```text
workspace paths are user-selected
SQLite database lives inside workspace, not app bundle
recent workspace settings live in app user data
attachments live inside workspace
```

4. Add packaging notes to README:

```text
how to build
where packaged output appears
known limitations
code signing not configured
```

5. Do not require packaging to pass on every OS in CI yet unless environment supports it.

## Files to create or update

```text
apps/desktop/electron-builder.yml
apps/desktop/package.json
README.md
docs/TESTING.md or docs/GITHUB_WORKFLOW.md
```

## Acceptance criteria

- [ ] `pnpm build` completes.
- [ ] `pnpm package` exists and attempts to package desktop app.
- [ ] Packaging config does not bundle a workspace database.
- [ ] Workspace/database paths remain user/workspace controlled.
- [ ] README documents packaging command and limitations.
- [ ] No auto-update/cloud service is added.

## Test requirements

At minimum:

```bash
pnpm build
```

If package command works on current OS:

```bash
pnpm package
```

Optional: add a script that validates packaging config exists.

## Manual QA

Run:

```bash
pnpm build
pnpm package
```

Launch packaged app if available and confirm:

```text
app opens
Welcome page appears
workspace creation/opening still works if implemented
```

## Codex prompt

```text
Goal: Implement LWO-M1-012 — Packaging and development build verification.

Add initial electron-builder configuration and ensure build/package scripts exist. The app should build as a desktop scaffold. Do not add code signing, auto-update, cloud services, or release automation. Document packaging commands and limitations.
```

## Done when

- [ ] Build passes.
- [ ] Package command exists.
- [ ] Packaging docs updated.

## Follow-up tickets

- Future: MVP packaging smoke test.
- Future: Code signing/notarisation only if needed.
