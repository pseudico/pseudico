# Linear Setup Runbook — Local Work OS

This document configures Linear as the work-management layer for Local Work OS.

Linear is the source of truth for active work, not the source of truth for product architecture. Keep long specifications in the repository docs.

---

# 1. Create the Linear workspace/team

Recommended:

```text
Workspace: Local Work OS
Team key: LWO
Team name: Local Work OS
```

Issue keys should look like:

```text
LWO-1
LWO-2
LWO-3
```

The ticket packs use phase labels such as M0/M1 etc. You can either preserve the ticket title prefix from the packs or let Linear assign numeric issue IDs.

---

# 2. Create the main project

Project:

```text
Local Work OS — Local-Only Build
```

Project description:

```text
Build a local-only desktop productivity app with a Pagico-style feature surface: projects, contacts, Inbox, tasks, lists, notes, files, links, tags, categories, search, collections, smart lists, Today planning, dashboard, timeline/calendar, templates, workflows, backup/export/import, and local hardening. Cloud/mobile/team/public sharing are out of scope.
```

Suggested project links:

```text
GitHub repo: https://github.com/<owner>/local-work-os
Product spec: docs/PRODUCT_SPEC.md
Operating plan: docs/OPERATING_PLAN.md
Master inventory: docs/tickets/MASTER_TICKET_INVENTORY.md
```

---

# 3. Create milestones

Create these milestones inside the Linear project:

| Milestone | Description |
|---|---|
| M0 — Governance and Repo Setup | Docs, AGENTS.md, PR template, CI, Codex review guidance |
| M1 — Scaffold and Database Foundation | Electron shell, workspace filesystem, SQLite, migrations, seed data |
| M2 — Core Containers and Items | Containers, items, Inbox, projects, relationships foundation |
| M3 — Core Work Objects | Tasks, lists, notes, links, initial files |
| M4 — Metadata and Search | Tags, categories, search, saved views, collections |
| M5 — Usability Views | Today, dashboard, project health, collection workflows |
| M6 — Files, Backup, Export, MVP Stabilisation | Attachments, backup/export, smoke tests, MVP QA |
| M7 — V1 Depth | Contacts, tabs, reminders, timeline/calendar |
| M8 — Advanced Local Power | Templates, recurrence, pipelines, file versions, workflows |
| M9 — Advanced UX and Navigation | Command palette, context menus, app tabs, bulk actions, undo, accessibility |
| M10 — Rich Containers and Relationships | Summaries, banners/photos, contact labels, wikilinks, graph, clone/archive |
| M11 — Advanced Object Behaviours | NLP dates, advanced lists, Markdown, comments, previews, locations, email objects |
| M12 — Advanced Planning and Smart Views | Advanced timeline/calendar, dashboard builder, smart list builder, search syntax |
| M13 — Automation, Import, Export, Maintenance | Workflow engine, browser capture, importers, backup scheduler, DB maintenance |
| M14 — Hardening, QA, Release | Security, privacy, performance, corruption recovery, migration matrix, release packaging |

---

# 4. Configure statuses

Use this workflow:

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

Status meanings:

| Status | Meaning |
|---|---|
| Triage | Captured idea or raw imported ticket; not yet accepted |
| Backlog | Accepted, not ready to implement |
| Spec Draft | Needs missing details or scope correction |
| Spec Ready | Product scope clear, not yet ready for Codex |
| Codex Ready | Has enough detail, acceptance criteria, and tests |
| Assigned to Codex | Codex has been asked to implement or review |
| PR Open | A branch/PR exists |
| Review | Human and/or Codex review active |
| QA | Tests pass; manual verification pending |
| Done | Merged and accepted |
| Blocked | Needs decision, dependency, environment fix, or tool setup |
| Canceled | Not needed |

---

# 5. Configure labels

Important Linear note: if you use actual Linear label groups, labels within a group are not multi-selectable. Because many issues touch multiple areas, use actual one-of groups only for fields that should be exclusive.

Recommended:

## Actual label groups / one-of labels

```text
Phase/M0
Phase/M1
...
Phase/M14

Kind/Feature
Kind/Bug
Kind/Refactor
Kind/Test
Kind/Docs
Kind/Spike
Kind/Migration
Kind/QA

Agent/CodexReady
Agent/NeedsPlan
Agent/NeedsHumanDecision
Agent/ReviewOnly
Agent/TestOnly
Agent/DoNotDelegate
```

## Plain labels, not one-of groups, when multi-select is useful

```text
area:core
area:db
area:desktop
area:workspace
area:projects
area:contacts
area:inbox
area:tasks
area:lists
area:notes
area:files
area:links
area:tags
area:categories
area:search
area:saved-views
area:today
area:dashboard
area:timeline
area:calendar
area:templates
area:workflows
area:backup
area:export
area:import
area:security
area:testing
area:docs

risk:data-model
risk:migration
risk:file-system
risk:electron-security
risk:search-index
risk:performance
risk:ux
risk:scope-creep

quality:needs-tests
quality:needs-e2e
quality:needs-migration-test
quality:needs-manual-qa
quality:needs-docs
```

---

# 6. Create custom views

Create these Linear views:

| View | Filter |
|---|---|
| Codex Ready | Status = Codex Ready |
| Assigned to Codex | Status = Assigned to Codex |
| PRs Open | Status = PR Open |
| Needs Human Decision | Label = Agent/NeedsHumanDecision |
| Data Model Risk | Label = risk:data-model or risk:migration |
| Electron Security Risk | Label = risk:electron-security |
| Current Milestone | Project milestone = current milestone |
| MVP Path | Phase M0–M6 |
| Full Scope Backlog | Phase M7–M14 |

---

# 7. Create issue templates

Create templates from `linear/LINEAR_ISSUE_TEMPLATES.md`.

Recommended default template:

```text
Feature / implementation ticket
```

Other templates:

```text
Bug
Spike
Database migration
UI feature
Test-only
Codex review
Docs
```

---

# 8. Link GitHub and Codex

After the repository exists and Codex is connected:

```text
1. Mention @Codex in a Linear issue comment.
2. Confirm Codex responds or links the workspace.
3. Use the validation issue before real implementation.
```

Linear’s Codex integration can delegate work by assigning an issue to Codex or mentioning `@Codex`; Codex then posts progress and task links back into Linear.

---

# 9. First Linear issues to create manually

Do not import all tickets immediately. Create these first:

```text
LWO-1 — Validate Linear/Codex/GitHub workflow
LWO-2 — Bootstrap pnpm monorepo and package structure
LWO-3 — Add governance docs, AGENTS.md, PR template, and CI
LWO-4 — Create Electron/Vite/React desktop shell
LWO-5 — Implement local workspace filesystem service
LWO-6 — Add SQLite/Drizzle setup and migration runner
```

After these are stable, import or create the rest of M0/M1.
