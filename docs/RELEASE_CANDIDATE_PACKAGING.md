# Release Candidate Packaging Evidence

PSE-204 / PSE-OR-009 records how Local Work OS can be handed to an operator as a local desktop build without overclaiming public release readiness.

## Current distribution tier

**Internal pilot / operator-readiness candidate:** unpacked Electron directory package produced by `pnpm package` and verified by `pnpm package:smoke`, `pnpm qa:packaged-launch`, and `pnpm release:package-check`.

Not yet public-release ready because installer targets, Windows signing,
macOS signing/notarization, public checksum publishing, release-channel hosting,
legal/support process, and auto-update remain owner decisions or future tickets.

## Evidence baseline

Latest reconciled package metadata and release-caveat evidence is PSE-227:

- `docs/manual-qa/PSE-227-package-metadata-release-caveats.md` records
  `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm package`,
  `pnpm package:smoke`, and `pnpm release:package-check` passing from a clean
  worktree based on PSE-226's merged main.
- `docs/release/package-artifact-check.json` records current Windows unpacked
  artifact paths, checksums, disabled publish/update status, unsigned
  development-package status, package metadata checks, and data-boundary checks.
- Desktop package metadata now includes a package description and author, so the
  Electron Builder missing description/author warnings are resolved.

Latest packaged dialog/operator evidence is PSE-228:

- `docs/manual-qa/PSE-228-packaged-os-dialog-qa.md` records packaged Windows
  OS-native picker coverage for file attach cancel/select, Markdown folder
  preview/import, and backup restore target cancel/select.
- The same evidence explicitly marks typed-path and workspace-relative flows
  that do not currently use native dialogs: workspace create/open, CSV/TSV
  import, export destination, and backup create/list.
- The Windows email import native picker remains **Not reviewed** in PSE-228
  because the mixed file/folder dialog could not be reliably completed in the
  manual automation pass; direct packaged `.eml` import by local path passed.

PSE-229 closes the EML-file portion of that caveat:

- `docs/manual-qa/PSE-229-email-native-picker.md` records that packaged Windows
  email import now exposes separate EML-file and email-folder actions.
- The native EML file picker cancel/select path passed in the packaged app, and
  the selected `.eml` created visible Inbox work with the original email copied
  as a local attachment.

Prior package-hardening evidence is PSE-221:

- `docs/manual-qa/PSE-221-packaged-release-qa.md` records `pnpm package`,
  `pnpm package:smoke`, and `pnpm release:package-check` passing from a clean
  worktree after the `.tsbuildinfo` / pnpm linked-package failure was fixed.
- `docs/manual-qa/PSE-221-package-contents-check.json` records that
  `.tsbuildinfo` files are absent from the packaged output and that runtime
  files such as `better_sqlite3.node` are present.
- PSE-221 fixed the unsafe `.tsbuildinfo` / pnpm linked-package packaging
  failure and remains the baseline for the staging/package-boundary design.

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
- Desktop package metadata includes `description` and `author`; Electron Builder
  no longer emits missing description/author warnings for the staged app.
- Packaging runs from a temporary `apps/desktop/.package-app/` staging directory
  produced by `pnpm deploy --prod --legacy`; the staging directory is deleted
  after packaging.
- Bundled local workspace packages are resolved by Vite aliases at build time,
  not packaged as pnpm workspace symlinks under `node_modules/@local-work-os`.
- TypeScript build cache files (`*.tsbuildinfo` / `.tsbuildinfo/`) and source
  maps are excluded from package inputs.

Current non-blocking packaging advisories:

- `pnpm deploy --legacy` can print shared-lockfile/registry timing warnings while
  building the temporary staging app. These are packaging-machine/tooling
  warnings, not runtime network dependencies for the operator.
- Electron Builder can print an `@electron/rebuild` duplicate-use advisory. The
  packaging script still deliberately rebuilds and copies `better-sqlite3` for
  the packaged Electron ABI because PSE-221 proved this path is needed for the
  packaged smoke test.

## Required local verification

Run in this order on the target OS:

```bash
pnpm package
pnpm package:smoke
pnpm qa:packaged-launch -- --screenshot=docs/manual-qa/screenshots/<ticket>/welcome.png
pnpm release:package-check
```

`pnpm package:smoke` launches the packaged app in smoke mode and verifies that it can:

- create a temporary local workspace;
- write SQLite data through the main-process service layer;
- attach a local file and resolve open/reveal paths;
- create a manual backup;
- reopen the database and verify activity persistence; and
- keep workspace database, attachments, and backups outside the packaged app bundle.

`pnpm qa:packaged-launch` is the canonical packaged-app launch proof for
manual QA and screenshot runs. It launches the current packaged executable with
a bounded timeout and DevTools endpoint, verifies the welcome shell rendered,
optionally captures a screenshot, and prints artifact evidence:

- packaged executable path and SHA-256;
- `resources/app.asar` path and SHA-256;
- artifact modified times and sizes;
- root and desktop package names/versions;
- git SHA when available; and
- normal-launch status and stderr tail for display/sandbox diagnostics.

Use this helper before final operator screenshots so the evidence proves which
modern/current packaged artifact is under test. Do not substitute an unbounded
background `pnpm dev` launch for release/operator QA screenshots. `pnpm dev`
is acceptable for active development only; it runs a Vite/Electron dev shell
and may not reflect the packaged app an operator receives.

On Windows, Electron may fail from sandboxed or non-display sessions with
messages such as `No displays detected`, `platform_channel`, or `Access is
denied`. Rerun package smoke/launch checks from a display-capable session
before filing a product launch regression. Those errors are launch-environment
evidence unless reproduced in the normal packaged app session.

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
- any unsigned/unnotarized app warning is explained before handoff;
- package metadata warnings are either resolved or explicitly documented for the
  internal-pilot recipient; and
- open P0/P1 release risks are fixed or explicitly accepted by the owner.
