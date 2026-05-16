# QA Scripts

## MVP Smoke Test

Run the automated smoke suite:

```bash
pnpm test -- apps/desktop/tests/smoke/mvp-flow.test.ts
```

## Operator Readiness Fresh-Workspace Smoke (PSE-196)

Run the integrated operator-readiness smoke:

```bash
pnpm test -- apps/desktop/tests/smoke/operator-readiness-flow.test.ts
```

This test starts from a disposable fresh workspace, bootstraps the local
database, confirms workspace health and Inbox availability, creates an
operator-style project/contact/task/note/list/file/link dataset, relates
records, evaluates search and collection/saved-view results, plans Today work,
checks dashboard/timeline/calendar projections, then closes and reopens the
SQLite database to prove persistence.

Use this as the first automated evidence gate for nontechnical handoff. It does
not replace packaged-app manual QA because it drives the service and server-side
renderer harness rather than OS file dialogs.

## Operator Backup/Restore Golden Smoke (PSE-197)

Run the golden backup/restore workflow:

```bash
pnpm test -- apps/desktop/tests/smoke/backup-restore-golden.test.ts
```

This test creates a populated local workspace with project, contact, task, note,
list, list row, link, file attachment, tag/category metadata, relationships,
saved views/collections, Today planning, dashboard widgets, and dated work. It
then creates both a manual backup and workspace JSON export, restores each into
separate clean workspace folders, copies attachment files, rebuilds search via
the restore service, and verifies records, attachment bytes, search entries,
relationships, activity logs, dashboard data, and workspace health.

Use this as the first automated evidence gate for local data recovery. It does
not replace packaged-app restore QA through real file pickers and OS dialogs.

## Operator Failure-Mode Regression Pack (PSE-199)

Run the focused failure-mode regression pack:

```bash
pnpm test -- apps/desktop/tests/main/safeFileSystem.test.ts apps/desktop/tests/main/workspaceFileSystemService.test.ts apps/desktop/tests/main/backupHandlers.test.ts packages/features/tests/backupService.test.ts packages/features/tests/restoreService.test.ts packages/features/tests/importValidationService.test.ts packages/features/tests/maintenanceService.test.ts packages/features/tests/linkService.test.ts packages/features/tests/noteService.test.ts packages/features/tests/searchIndexOrchestrator.test.ts packages/features/tests/largeWorkspaceBenchmarkService.test.ts apps/desktop/tests/smoke/backup-restore-golden.test.ts
```

This covers the automated side of `docs/FAILURE_MODE_MATRIX.md`: rejected
path traversal, missing attachments, malformed URLs/imports, restore validation,
search rebuild, maintenance failure logging, large-workspace benchmark
contracts, and backup/restore recovery. It does not replace manual OS QA for
permission-denied folders, app interruption during writes/backups, locked
databases, large real attachments through file pickers, or packaged-app
long-running maintenance jobs.

## Local-Only Security Regression Pack (PSE-201)

Run the local-only security regression pack:

```bash
pnpm test -- apps/desktop/tests/security/renderer-boundary.test.ts apps/desktop/tests/security/localOnlyNetwork.test.ts apps/desktop/tests/main/electronSecurity.test.ts apps/desktop/tests/main/workspaceWindowSecurity.test.ts apps/desktop/tests/main/ipc-handlers.test.ts apps/desktop/tests/preload/api.test.ts packages/features/tests/privacySettingsService.test.ts packages/features/tests/linkService.test.ts apps/desktop/tests/smoke/operator-readiness-flow.test.ts
```

This pack verifies renderer boundary rules, explicit network-capable source
allowlists, BrowserWindow hardening, external URL validation, optional network
defaults, preload routing, and a fresh-workspace operator smoke with `fetch`
blocked. It does not replace manual packaged-app network monitoring.

Manual packaged-app no-network check:

1. Disconnect network or enable an OS firewall/network monitor.
2. Launch the packaged app.
3. Create/open a temporary local workspace.
4. Run the operator smoke workflow without enabling metadata fetch, web widgets,
   ICS URL import, IMAP import, or browser capture.
5. Confirm no unexpected outbound connections and no required network service.

## Activity/Search Reconciliation Smoke

Run the PSE-202 regression before handoff or after changing item, attachment,
tag, category, saved-view, Today planning, search, or maintenance write flows:

```bash
pnpm test packages/features/tests/activitySearchReconciliation.test.ts
```

Expected result: core operator mutations have readable activity entries, updated
search projections, healthy search-index diagnostics, and maintenance rebuild
can repair intentionally missing/orphaned/stale search rows.

Manual verification for a temporary workspace:

1. Launch the desktop app.
2. Create a new local workspace.
3. Confirm the Inbox exists and workspace health is connected.
4. Create a project.
5. Add a task to the project.
6. Complete the task.
7. Add a note to the project.
8. Search for the note text.
9. Create a category and assign it to the project or task.
10. Create a manual backup.
11. Enable daily automatic backups, run a due check, and confirm automatic
    backup status plus retention settings update.
12. Export workspace JSON, task CSV, and the portable HTML/CSV/TSV/Markdown bundle.
13. Quit and reopen the workspace.
14. Confirm the project, completed task, note, category, backup settings,
    backup snapshots, and exports persist.

Known limitations to confirm during MVP QA:

- Advanced rich-text editing, custom dashboard editing, advanced saved-view
  builder UX, browser capture production bridge, workflow scheduling,
  external live calendar sync, and monthly/yearly recurrence should not appear
  as completed release workflows.
- Broader third-party import execution remains intentionally scoped; verify the
  documented local import/restore paths rather than assuming cloud migration or
  remote import support.
- Packaged development builds should not contain user workspace databases,
  attachments, backups, exports, or logs inside the app bundle.

## File Safety QA

1. Attach a file.
2. Confirm the file is copied inside workspace attachment storage.
3. Rename the original source file.
4. Confirm the app attachment still opens.
5. Delete the copied workspace file manually.
6. Confirm the app shows a missing-file state.
7. Attach a file with an unusual filename.
8. Confirm the stored path remains inside the workspace.

## Release Candidate Documentation Check

1. Confirm `docs/PRODUCT_SPEC.md` contains current implemented and remaining
   MVP notes.
2. Confirm `docs/DATA_MODEL.md` reflects the current schema/repository/service
   baseline without claiming future migrations are complete.
3. Confirm `docs/ARCHITECTURE.md` describes the main/preload/renderer,
   repository/service, and packaged-smoke boundaries.
4. Confirm `docs/MODULE_REGISTRY.md` separates implemented MVP modules from
   placeholder/future modules.
5. Confirm `docs/RELEASE.md` lists the MVP release checklist and known
   limitations.
6. Confirm `docs/FINAL_RELEASE_SYNC.md` links the current source-of-truth docs,
   ticket cross-reference correction, and release verification gates.

## Packaged App Smoke Test

Run the package build and packaged smoke entry point:

```bash
pnpm package
pnpm package:smoke
pnpm release:package-check
```

The packaged smoke command launches the packaged executable with
`--package-smoke`. It creates a temporary workspace, bootstraps SQLite, creates
a project and task through the main-process service layer, reopens the database,
checks activity-log persistence, verifies the database and attachment paths are
outside the packaged app bundle, then removes the temporary workspace.
The release package check writes artifact checksums and package/data-boundary
status to `docs/release/package-artifact-check.json`.

Manual verification for a temporary workspace:

1. Run `pnpm package`.
2. Open `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe` on Windows,
   or the equivalent unpacked app for the current platform.
3. Create a new workspace in a temporary folder.
4. Confirm `workspace.json`, `data/local-work-os.sqlite`, `attachments/`,
   `backups/`, `exports/`, and `logs/` are created under that workspace folder.
5. Create a project and task.
6. Quit the packaged app.
7. Reopen the packaged app and open the same workspace.
8. Confirm the project and task still appear, and workspace health reports the
   SQLite database path under the workspace folder.

## Large result performance smoke (PSE-154)

- Use the local performance fixture service (PerformanceFixtureService.seedLargeWorkspace) to seed a workspace with 10k generated items for manual QA.
- Verify project feeds, grouped search/collection results, and recent activity lists render as virtualized windows instead of mounting every row.
- Verify dashboard widgets request bounded pages through widget data limits and show only the configured page of items.
- Enable a slow-query sink in service construction during diagnostics to capture local query timings without network or telemetry.

## Large workspace benchmark budgets

Run the local benchmark harness from a clean checkout:

```bash
pnpm benchmark:large -- --sizes=1000,10000 --out=docs/performance/reports/latest.json
```

For release gates, include the 100k fixture:

```bash
pnpm benchmark:large -- --sizes=1000,10000,100000 --out=docs/performance/reports/full.json
```

Compare each operation against `docs/PERFORMANCE.md` budgets and attach the JSON
report to the PR or release notes when it is part of the acceptance criteria.

## Operator large-workspace UI QA (PSE-203)

Use `docs/PERFORMANCE_SCALE_QA.md` for the full manual script. Minimum
operator-readiness evidence:

1. Run:
   ```bash
   pnpm benchmark:large -- --sizes=1000,10000 --out=docs/performance/reports/operator-readiness-pse-203.json
   ```
2. Open retained or generated 1k and 10k local workspaces in the packaged app.
3. Check startup/open, search, Dashboard, Today, project/contact feed scrolling,
   backup/export duration, and maintenance feedback.
4. Record wall-clock seconds and OS memory/CPU observations in the PR/release
   notes or a report file.
5. Split any P0/P1 blocker into its own fix ticket before handoff.
