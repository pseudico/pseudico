# QA Scripts

## MVP Smoke Test

Run the automated smoke suite:

```bash
pnpm test -- apps/desktop/tests/smoke/mvp-flow.test.ts
```

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
11. Export workspace JSON and task CSV.
12. Quit and reopen the workspace.
13. Confirm the project, completed task, note, category, backup, and exports persist.

Known limitations to confirm during MVP QA:

- Contact, timeline, calendar, template, workflow, reminder, browser-capture,
  and file-version surfaces should not appear as completed MVP workflows.
- Import validation may report whether a workspace JSON file is valid, but full
  import/restore into a new workspace is still future work.
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

## Packaged App Smoke Test

Run the package build and packaged smoke entry point:

```bash
pnpm package
pnpm package:smoke
```

The packaged smoke command launches the packaged executable with
`--package-smoke`. It creates a temporary workspace, bootstraps SQLite, creates
a project and task through the main-process service layer, reopens the database,
checks activity-log persistence, verifies the database and attachment paths are
outside the packaged app bundle, then removes the temporary workspace.

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
