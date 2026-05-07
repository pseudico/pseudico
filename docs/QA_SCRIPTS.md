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

## File Safety QA

1. Attach a file.
2. Confirm the file is copied inside workspace attachment storage.
3. Rename the original source file.
4. Confirm the app attachment still opens.
5. Delete the copied workspace file manually.
6. Confirm the app shows a missing-file state.
7. Attach a file with an unusual filename.
8. Confirm the stored path remains inside the workspace.
