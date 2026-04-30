# Architecture

Local Work OS is a local-only Electron desktop app built with TypeScript,
React, Vite, SQLite, Drizzle ORM, and pnpm workspaces.

## Runtime Shape

```text
Electron main process
  owns native window lifecycle
  owns filesystem access
  owns SQLite connection setup
  exposes narrow IPC handlers through preload

Electron preload
  exposes typed, minimal APIs to the renderer
  validates renderer calls at the boundary
  never exposes unrestricted Node APIs

React renderer
  renders the user interface
  calls typed preload APIs
  does not import Node filesystem APIs
  does not call SQLite directly

packages/core
  shared domain types, constants, and pure utilities

packages/db
  SQLite schema, migrations, repositories, and database services

packages/features
  application services and feature-level business logic

packages/ui
  shared React UI primitives

packages/test-utils
  reusable test helpers and temporary workspace utilities
```

## Dependency Direction

The dependency direction is intentionally narrow:

```text
apps/desktop -> packages/features, packages/ui, packages/db, packages/core
packages/features -> packages/core, packages/db, packages/ui
packages/db -> packages/core types
packages/ui -> packages/core types when needed
packages/core -> no React, Electron, SQLite, or UI dependencies
```

Renderer components should depend on feature-facing APIs and UI components, not
database internals. Database access should be hidden behind repositories and
services so future schema changes do not leak across the UI.

## Local Workspace Boundary

Each user workspace is a local folder. The workspace should contain its SQLite
database, attachment storage, metadata files, backup/export outputs, and
maintenance artifacts. Paths stored in the app should be workspace-relative
where practical so workspaces can move between local folders.

## Write Flow

Data-changing operations follow the standard write flow:

```text
validate input
  -> start transaction
  -> write domain data
  -> write activity_log event
  -> update search index if relevant
  -> commit transaction
  -> notify UI/query cache
```

This keeps domain state, audit history, and search state aligned.

## Security Boundary

The renderer is not trusted with direct filesystem or database access. Native
capabilities stay in Electron main and are exposed through typed preload IPC.
Any new IPC endpoint must have a narrow purpose, validate inputs, return typed
results, and avoid exposing arbitrary filesystem paths or SQL.

## Source Documents

This document extracts architecture rules from:

- `docs/PRODUCT_SPEC.md`
- `docs/OPERATING_PLAN.md`
- `docs/tickets/M0_M1_TICKET_PACK.md`
- `docs/DECISIONS/ADR-0001-local-only-desktop.md`
- `docs/DECISIONS/ADR-0002-electron-react-sqlite.md`
- `docs/DECISIONS/ADR-0003-universal-container-item-model.md`
