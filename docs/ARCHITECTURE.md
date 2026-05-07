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

## Implemented MVP Architecture

The current implementation follows the planned split:

- Electron main owns workspace folder selection, safe file operations,
  packaged-app smoke mode, SQLite connection/bootstrap, and narrow IPC
  handlers.
- Preload exposes typed APIs for workspace, project, item, metadata, search,
  dashboard, backup, export, import validation, file, and package-smoke flows.
- The renderer calls those APIs through `desktopApiClient` and renders routed
  React pages for Inbox, projects, project detail, Today, dashboard,
  collections, search, tags/categories, settings, contacts placeholder, and
  workspace health.
- `packages/db` owns schema, migrations, repositories, transaction helpers,
  database health, activity logging, and search-index persistence.
- `packages/features` owns application services for user workflows such as
  project/task/list/note/link/file operations, search hydration, saved-view
  evaluation, Today planning, dashboard widgets, backup, export, import
  validation, and integrity diagnostics.

Renderer code must continue to avoid direct Node filesystem APIs and direct
SQLite imports. New native capabilities should extend typed main/preload APIs
first, then expose feature-facing client methods to React.

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

## Performance Guardrails

Local Work OS should treat long feeds as normal workspace data, not as an edge
case. Service and repository APIs that read project feeds, search results,
activity streams, and saved-view or collection results should expose bounded
pagination before a renderer displays the data. Default pages should stay small
enough for responsive desktop rendering, with hard caps at the service boundary
to avoid accidental unbounded scans in large local workspaces.

Current guardrails:

- Item feed repository queries support stable cursor pagination ordered by
  pinned state, sort order, creation time, and ID.
- Search queries support `limit` and `offset` over the local search index.
- Activity feeds support cursor pagination ordered by newest event first.
- Saved-view and collection evaluation returns a total count plus bounded
  `limit`/`offset` result pages.
- Renderer feed surfaces should use load-more controls for long result sets.

Virtualisation should be added only when measured UI rendering costs exceed the
load-more threshold. The current project detail page still composes type-specific
task/list/note/link/file feeds, so it uses a renderer load-more guard while the
service-level paged item feed remains the foundation for a later unified mixed
feed.

## Security Boundary

The renderer is not trusted with direct filesystem or database access. Native
capabilities stay in Electron main and are exposed through typed preload IPC.
Any new IPC endpoint must have a narrow purpose, validate inputs, return typed
results, and avoid exposing arbitrary filesystem paths or SQL.

## Release And Verification Boundary

Development packaging is verified with `pnpm package` and `pnpm package:smoke`.
The package smoke path launches the unpacked Electron app in a main-process
smoke mode, creates a temporary workspace, writes data through service layers,
reopens SQLite, and confirms workspace data stays outside the application
bundle.

This is not a release installer pipeline. Code signing, notarization,
installer generation, auto-update, and release-channel publishing remain
future release-hardening work.

## Source Documents

This document extracts architecture rules from:

- `docs/PRODUCT_SPEC.md`
- `docs/OPERATING_PLAN.md`
- `docs/tickets/M0_M1_TICKET_PACK.md`
- `docs/DECISIONS/ADR-0001-local-only-desktop.md`
- `docs/DECISIONS/ADR-0002-electron-react-sqlite.md`
- `docs/DECISIONS/ADR-0003-universal-container-item-model.md`
