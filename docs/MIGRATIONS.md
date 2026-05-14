# Migrations

Local Work OS uses ordered SQLite migrations owned by `packages/db`. The
migration log table is `local_work_os_migrations`; each applied migration stores
its version, name, timestamp, and checksum.

## Runtime behavior

- Migrations run through `MigrationService`; app startup uses
  `DatabaseBootstrapService`.
- Existing workspace databases are backed up before pending migrations are
  applied. Backups are written under the workspace `backups/` folder by default.
- Fresh databases at schema version `0` do not create a pre-migration backup.
- If a workspace has migration records newer than the app knows about,
  migration is refused. This prevents accidentally opening a newer workspace
  with an older app build.

## Test fixture matrix

The migration fixture tests live in `packages/db/tests`:

- `migrationFixtures.ts` defines versioned workspace database fixtures.
- `migrationTestRunner.ts` materializes a fixture, upgrades it to the current
  schema, checks preservation assertions, and verifies the backup copy.
- `migrationFixtures.test.ts` runs the fixture matrix.

Current fixtures cover:

- schema v1 foundation workspace/task data,
- schema v8 workflow and attachment-version data,
- schema v20 comments, calendar data, and workflow rollback metadata.

Add a fixture when a migration reshapes tables, broadens `check` constraints, or
touches data that must survive upgrades. Keep fixture data small and deterministic
so CI can run the full matrix on every PR.

## Verification commands

```bash
pnpm --filter @local-work-os/db test
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
