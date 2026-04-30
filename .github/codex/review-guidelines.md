# Codex PR Review Guidelines

Review every PR against these inputs:

- `AGENTS.md`
- the linked Linear issue
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/OPERATING_PLAN.md`
- `docs/TESTING.md`
- `docs/SECURITY.md`

Treat Linear as the scope source. Treat GitHub diff, tests, and CI as proof.

## Blocking Review Concerns

### Local-Only Scope

Flag any unapproved cloud, hosted backend, remote database, telemetry, analytics,
remote file storage, hosted account, team collaboration, public sharing, billing,
licensing, or mobile-app dependency.

Flag copied proprietary branding, screenshots, wording, icons, visual design,
source code, or assets from reference products.

### Architecture Boundaries

Flag direct SQLite access from React components.

Flag direct Node filesystem access from renderer code.

Flag broad Electron IPC surfaces, unvalidated IPC inputs, arbitrary path access,
or untyped preload APIs.

Flag business logic hidden in UI components when it belongs in `packages/core`
or `packages/features`.

Flag dependency direction violations:

```text
apps/desktop -> packages/features, packages/ui, packages/db, packages/core
packages/features -> packages/core, packages/db, packages/ui
packages/db -> packages/core types
packages/ui -> packages/core types where necessary
packages/core -> no React, Electron, SQLite, or UI packages
```

### Data Integrity

Flag data-changing operations that do not validate input, write in a transaction,
or create activity log entries.

Flag hard deletes of user data where soft delete or archive behavior is expected.

Flag schema changes without migrations, migration verification, or repository
coverage.

Flag persisted absolute paths where workspace-relative paths are practical.

### Search Consistency

Flag searchable content changes that do not update the local search index when
the search service exists.

Flag tag, category, note, task, container, file, or link changes that leave
search projections or saved-view inputs stale.

### Testing And CI

Flag missing tests for new domain logic, repositories, services, IPC handlers,
renderer workflows, migrations, or high-risk bug fixes.

Flag PRs that skip the expected verification without a clear reason:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Flag GitHub Actions changes that require secrets, network services outside
package installation, or state outside a clean checkout.

### Scope Control

Flag implementation beyond the linked Linear issue.

Flag unrelated rewrites, formatting churn, opportunistic feature additions, and
large abstractions that are not needed for the acceptance criteria.

Flag missing documentation updates when behavior, architecture, schema, testing,
or workflow changes.

## Review Output

Start with findings, ordered by severity. Use file and line references.

Then include:

- missing tests or verification gaps
- open questions or human decisions
- brief scope summary

If no issues are found, say that clearly and note any residual risk.
