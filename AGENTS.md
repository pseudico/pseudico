# AGENTS.md

## Project mission

Build Local Work OS: an original local-only desktop productivity app for projects, contacts, Inbox, tasks, lists, notes, files, links, tags, categories, relationships, search, saved views, collections, dashboards, Today planning, timeline/calendar, templates, workflows, backup/export/import, and local maintenance tools.

The app is inspired by the broad category of local-first productivity/work-management tools. Do not copy proprietary branding, screenshots, wording, icons, visual design, source code, or assets from any reference product.

## Scope

In scope:

- Desktop app
- Local workspace folder
- SQLite database
- Local attachment storage
- Local search
- Local backup/export/import
- Single-user workflows
- Local browser capture later
- Local automation later

Out of scope:

- Cloud sync
- Mobile apps
- Team collaboration
- Hosted accounts
- Billing/licensing systems
- Public sharing
- Remote file storage
- Telemetry/analytics unless explicitly approved

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

- Business logic belongs in `packages/core` or `packages/features`.
- Database access must go through repositories/services.
- React components must not call SQLite directly.
- Renderer code must not access Node filesystem APIs directly.
- Filesystem actions must go through Electron main/preload IPC.
- All data-changing operations must create activity log entries.
- Searchable content changes must update the search index.
- Prefer soft delete over hard delete.
- Keep file paths workspace-relative where possible.
- Do not introduce cloud dependencies.
- Keep feature work scoped to the linked Linear issue.

## Dependency direction

```text
apps/desktop
  may depend on packages/features, packages/ui, packages/db, packages/core

packages/features
  may depend on packages/core, packages/db, packages/ui

packages/db
  may depend on packages/core types

packages/ui
  may depend on packages/core types where necessary

packages/core
  must not depend on React, Electron, SQLite, or UI packages
```

## Standard write flow

Every data-changing feature should follow this pattern:

```text
validate input
  → start transaction
  → write domain data
  → write activity_log event
  → update search index if relevant
  → commit transaction
  → notify UI/query cache
```

## Development workflow

Before implementation:

1. Read the linked Linear issue.
2. Read the linked docs.
3. Produce a short plan.
4. Identify files likely to change.
5. Identify risks and assumptions.
6. Identify tests to add/update.

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
- Run `pnpm build` where relevant.
- Update docs if behaviour, architecture, or schema changed.
- Fill the PR template.

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
- Human reviewer approves.
```
