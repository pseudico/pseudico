# ADR-0002: Electron, React, And SQLite

- Status: Accepted
- Date: 2026-04-30
- Owners: Local Work OS maintainers

## Context

The app needs a desktop runtime, a rich local interface, local filesystem
access, local database storage, and a TypeScript-friendly development model.
The project scope includes Electron, React, Vite, SQLite, Drizzle ORM, pnpm
workspaces, Vitest, React Testing Library, Playwright, and electron-builder.

## Decision

Use Electron for the desktop shell, React and Vite for the renderer, SQLite for
local persistence, Drizzle ORM for typed database access, and TypeScript across
the workspace.

Electron main owns filesystem and database capabilities. The renderer accesses
native capabilities only through typed preload IPC and feature-facing APIs.

## Consequences

- The app can ship as a desktop application while retaining web UI ergonomics.
- SQLite provides local durability without a remote database.
- Electron security rules are mandatory because the renderer must not receive
  broad Node, filesystem, or SQL access.
- Database access must stay behind repositories and services.

## Alternatives Considered

- Browser-only web app: rejected because local filesystem and desktop packaging
  are core requirements.
- Native-only UI toolkit: rejected for the initial build because React/Vite
  better match the planned TypeScript workspace and test stack.
- Remote database: rejected because it violates the local-only scope.

## Related Documents

- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
