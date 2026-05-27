# Nontechnical beta tester handoff — PSE-275 installer beta candidate

Status: controlled internal beta handoff draft, not public GA. Final checksums must match `docs/release/package-artifact-check.json` from the clean final package build before sending.

## What to distribute first

Preferred Windows artifact: `apps/desktop/dist-packaged/Local Work OS-0.1.0-beta.1-win-x64.exe` (unsigned NSIS installer).

Fallback artifact: `apps/desktop/dist-packaged/Local Work OS-0.1.0-beta.1-win-x64.zip` (extract the folder and run `Local Work OS.exe`).

Also include:

- this handoff note;
- `docs/release/package-artifact-check.json` or a copied checksum note;
- the explicit unsigned-app caveat below.

## Expected Windows warning

This beta is unsigned. Windows SmartScreen or “unknown publisher” warnings are expected. Only continue if the file name and SHA-256 checksum exactly match the owner-provided checksum.

## Install / run

Installer path:

1. Save the installer somewhere local, for example Downloads.
2. Run `Local Work OS-0.1.0-beta.1-win-x64.exe`.
3. Choose the default per-user install unless the owner gives a different path.
4. Launch **Local Work OS** from the installer finish screen, Start Menu, or install folder.

Zip fallback path:

1. Extract the full zip into a normal local folder outside any workspace folder.
2. Run the extracted `Local Work OS.exe`.
3. Do not move or delete files inside the extracted app folder while the app is running.

## Workspace safety

Create or open workspaces in a normal personal folder such as Documents or a dedicated test folder. Do **not** create a workspace inside the app install folder, extracted app folder, `resources`, or `app.asar.unpacked`.

Before using real data or upgrading to a newer build, create an in-app backup from Settings and keep it outside the app install folder.

## Manual upgrade / rollback

There is no auto-update in this beta. To upgrade, back up the workspace, close the app, install or extract the newer build, then reopen the same workspace. To rollback, close the app, uninstall/remove the newer app, reinstall/re-extract the previous app, and open the same workspace folder. Uninstalling the app should not delete workspace folders.

## Support / bug report template

Send the owner:

- artifact file name and SHA-256;
- Windows version;
- workspace path, if safe to share;
- what you clicked;
- what you expected;
- what happened;
- screenshots only if they do not reveal private data.

---
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
