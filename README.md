# Local Work OS

Local Work OS is a local-only desktop productivity app planned around projects,
contacts, Inbox capture, tasks, lists, notes, files, links, tags, categories,
search, saved views, Today planning, dashboards, timeline/calendar views,
backup/export/import, and local hardening.

This repository is intentionally governed by scoped Linear tickets and small
pull requests. The source planning artifacts have been normalized into stable
repository docs:

- `docs/PRODUCT_SPEC.md`
- `docs/OPERATING_PLAN.md`
- `docs/COVERAGE_MATRIX.md`
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

`pnpm dev` and `pnpm package` are wired to the desktop package. They are
placeholders until the Electron shell is implemented in `LWO-M1-001`.
