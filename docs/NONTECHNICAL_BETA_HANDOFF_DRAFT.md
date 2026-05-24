# Nontechnical beta tester handoff — 2026-05-24 internal beta candidate

This note is the tester-facing handoff for a controlled **internal beta** of Local Work OS / Pseudico. It is suitable for nontechnical testers if the project owner accepts the caveats below.

## What to run

- App folder to copy or zip: `C:\tmp\pse-269-review-merge\apps\desktop\dist-packaged\win-unpacked`
- App to launch after copying the whole folder: `Local Work OS.exe`
- Executable SHA-256: `6f4886ad03ab6f097d8adaceb419535d1c13eb5202ee53eaf76e629585d06cb9`
- app.asar SHA-256: `3d144627764840e218b27b2eee86bdfa9cf32bb663d25d30b90cc1612f968b66`

## Before you start

1. Copy the **entire** `win-unpacked` folder to a normal local folder.
2. Run `Local Work OS.exe` from inside that copied folder.
3. If Windows warns that the app is unsigned, continue only if this build came from the project owner.
4. Create your workspace in a separate local folder, not inside the app folder.
5. Do not store workspace data inside `dist-packaged`, `resources`, or `app.asar.unpacked`.
6. Before importing real files, running workflows on real data, or trying a newer build, open Settings and create a manual backup.

## What to try first

Use ordinary, realistic data. Suggested first pass:

1. Create a workspace.
2. Create one project, one contact, a few tasks, a note, a link, and one attachment.
3. Use Search to retrieve the project, contact, note, task, and attachment.
4. Use Today to review due/planned work.
5. Try a predefined guided Workflow only after reading the preview and confirming the created tasks/notes make sense.
6. Export or back up from Settings.
7. Quit and reopen the app, then confirm the same data, search results, and workflow run history are still present.

## Known caveats

- This is an unsigned internal beta build, not a public installer.
- There is no auto-update. Keep the old app folder until a replacement build has opened your workspace successfully.
- Workflows are a small guided beta feature only. They support predefined local templates with preview and confirmation; they do not run in the background, execute scripts, send messages, or contact cloud services.
- Optional network-capable features are off by default. Do not enable them unless the test specifically asks for it.
- Very large Today lanes may show limited initial cards with counts/load-more controls.
- Public release items such as signing, installers, legal/support policy, and update channels are not part of this beta.

## How to report an issue

Please include:

- What you were trying to do.
- What you expected.
- What actually happened.
- A screenshot if possible.
- The workspace folder path.
- Whether you imported, exported, backed up, restored, deleted, ran a workflow, or changed data.
- Whether the issue still happens after quitting and reopening the app.

## Rollback / recovery

1. Quit Local Work OS.
2. Keep the workspace folder; deleting the app folder should not delete workspace data.
3. Restore the previous app folder/build if needed.
4. If workspace data looks wrong, restore from the most recent backup before continuing.
