# Release Candidate Packaging Evidence

PSE-204 / PSE-OR-009 records how Local Work OS can be handed to an operator as a local desktop build without overclaiming public release readiness.

## Current distribution tier

**Internal pilot / operator-readiness candidate:** unpacked Electron directory package produced by `pnpm package` and verified by `pnpm package:smoke` plus `pnpm release:package-check`.

Not yet public-release ready because installer targets, Windows signing, macOS signing/notarization, public checksum publishing, release-channel hosting, and auto-update remain owner decisions or future tickets.

## Build artifacts

Current packaging command:

```bash
pnpm package
```

Current package type:

- Windows: `apps/desktop/dist-packaged/win-unpacked/Local Work OS.exe`
- macOS: `apps/desktop/dist-packaged/mac/Local Work OS.app` when packaged on macOS
- Linux: `apps/desktop/dist-packaged/linux-unpacked/local-work-os` when packaged on Linux

Current Electron Builder settings:

- `target: dir` only; no installer is produced.
- `asar: true`; native `.node` files are unpacked.
- `publish: null`; no release feed or auto-update publishing is configured.
- Windows `signAndEditExecutable: false`; the Windows development package is unsigned.

## Required local verification

Run in this order on the target OS:

```bash
pnpm package
pnpm package:smoke
pnpm release:package-check
```

`pnpm package:smoke` launches the packaged app in smoke mode and verifies that it can:

- create a temporary local workspace;
- write SQLite data through the main-process service layer;
- attach a local file and resolve open/reveal paths;
- create a manual backup;
- reopen the database and verify activity persistence; and
- keep workspace database, attachments, and backups outside the packaged app bundle.

`pnpm release:package-check` writes `docs/release/package-artifact-check.json` with:

- artifact paths;
- SHA-256 checksums for the executable and `app.asar`;
- signing/update/package status;
- package configuration checks; and
- a scan for workspace database/manifest artifacts inside the packaged app folder.

## Data boundary guarantee

Operator data must live in one of these local user-controlled locations:

- the workspace folder chosen by the operator;
- workspace subfolders such as `data/`, `attachments/`, `backups/`, `exports/`, and `logs/`; or
- Electron `userData` for app-level metadata such as recent workspace pointers.

Operator data must not be stored inside:

- `apps/desktop/dist-packaged/`;
- `resources/app.asar`;
- `resources/app.asar.unpacked/`; or
- installed application bundle directories.

The package smoke and release package check both enforce parts of this boundary, but manual packaged-app QA should still inspect a real temporary workspace before handoff.

## Manual update / upgrade instruction

Until a signed installer/update channel exists:

1. Quit Local Work OS.
2. Back up each important workspace folder, or run the in-app manual backup first.
3. Keep a copy of the previous app build until the new build opens the workspace successfully.
4. Replace the app folder/bundle with the new provided build.
5. Launch the new build and open the existing workspace.
6. Confirm workspace health, recent records, search, attachments, and backup listing.
7. If anything looks wrong, quit and restore the workspace folder from backup before continuing.

Removing the app must not be treated as deleting workspace data. Workspace folders are separate local data and should be deleted only by explicit operator action.

## Signing, checksum, and public release status

| Area | Current status | Required before public release |
| --- | --- | --- |
| Windows signing | Unsigned development package; `signAndEditExecutable: false`. | Trusted code-signing provider and release-owner certificate process. |
| macOS signing/notarization | Not configured in current package evidence. | Developer ID signing, hardened runtime review, and notarization. |
| Linux package signing | Not configured in current package evidence. | Checksums at minimum; repository/package signing if distributed broadly. |
| Checksums | Generated locally by `pnpm release:package-check`. | Publish SHA-256 checksums next to artifacts handed to operators. |
| Auto-update | Disabled; `publish: null`; no update feed. | Separate scoped ticket after signing, rollback, and local-only update controls are designed. |
| Installer | Not produced; current artifact is an unpacked directory. | Explicit installer target and QA if nontechnical installation is required. |

## Handoff standard

A nontechnical operator may receive an internal pilot build only when:

- package, package smoke, release package check, dependency audit, and core tests pass on the target OS;
- the operator runbook names the exact build and known limitations;
- the operator has backup-before-upgrade instructions;
- any unsigned/unnotarized app warning is explained before handoff; and
- open P0/P1 release risks are fixed or explicitly accepted by the owner.
