# Local Work OS

Local Work OS is a local-only desktop productivity app planned around projects,
contacts, Inbox capture, tasks, lists, notes, files, links, tags, categories,
search, saved views, Today planning, dashboards, timeline/calendar views,
backup/export/import, and local hardening.

This repository is intentionally governed by scoped Linear tickets and small
pull requests. The source planning artifacts have been normalized into stable
repository docs:

- `docs/README.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/OPERATING_PLAN.md`
- `docs/TESTING.md`
- `docs/SECURITY.md`
- `docs/ROADMAP.md`
- `docs/MODULE_REGISTRY.md`
- `docs/COVERAGE_MATRIX.md`
- `docs/DECISIONS/`
- `docs/tickets/MASTER_TICKET_INVENTORY.md`
- `docs/tickets/M0_M1_TICKET_PACK.md`
- `docs/tickets/M2_M8_TICKET_PACK.md`
- `docs/tickets/M9_M14_TICKET_PACK.md`

## Operating Model

- Linear tracks planned and active work.
- GitHub tracks code, branches, pull requests, CI, and reviews.
- Codex implements one scoped Linear issue per branch/PR.
- CI and tests prove behavior before merge.
- The human owner remains the merge gate.

## Local-Only Guardrails

Out of scope unless explicitly approved:

- cloud sync
- hosted accounts
- telemetry or analytics SDKs
- mobile apps
- team collaboration
- public sharing
- remote databases or hosted file storage

## First Build Phase

The first implementation wave is M0/M1: repository governance, Electron shell,
local workspace creation, SQLite/Drizzle foundation, migrations, seed data,
activity logging, search foundation, health UI, and smoke tests.

## Monorepo

This repo is a pnpm TypeScript workspace:

- `apps/desktop` - future Electron/Vite/React desktop app.
- `packages/core` - shared core types, constants, and guardrails.
- `packages/db` - future SQLite/Drizzle database layer.
- `packages/features` - future feature services and module boundaries.
- `packages/ui` - future shared UI primitives.
- `packages/test-utils` - future shared test utilities.

Install and verify:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the desktop app during development:

```bash
pnpm dev
```

## Packaging

The desktop package has an initial `electron-builder` configuration at
`apps/desktop/electron-builder.yml`. Development packaging uses the unpacked
directory target so the scaffold can be verified without code signing,
notarisation, auto-update, release CI, or installer polish:

```bash
pnpm package
```

The packaged output is written under `apps/desktop/dist-packaged/`. The current
configuration packages the built Electron app from `apps/desktop/dist` and does
not bundle any user workspace, SQLite database, attachment folder, backup, or
export output. Workspace paths remain user-selected folders, workspace SQLite
files live under each workspace `data/` directory, attachments live under each
workspace `attachments/` directory, and the recent-workspace list remains in
Electron user data.

Known limitations:

- Code signing and notarisation are not configured.
- Windows executable metadata editing is disabled for the development package
  because it uses the same helper path as code-signing tooling.
- Native dependencies are rebuilt for the packaged app, then the local
  development install is rebuilt back for Node/Vitest.
- Installer targets are intentionally deferred.
- Release CI and multi-platform packaging matrix are not configured.
- Packaged-app smoke coverage is manual until a later packaging smoke ticket.
