# Release Notes

## MVP Release Checklist

Before tagging an MVP release candidate:

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass locally
  and in CI.
- `pnpm package` creates the unpacked desktop app for the target platform.
- `pnpm package:smoke` passes against the unpacked app.
- `pnpm release:package-check` passes and writes
  `docs/release/package-artifact-check.json`.
- `pnpm audit:dependencies` passes and generated dependency/license notices
  are reviewed.
- The MVP smoke suite in `apps/desktop/tests/smoke/mvp-flow.test.ts` passes.
- Manual QA in `docs/QA_SCRIPTS.md` has been run on a temporary workspace.
- The final release documentation sync in `docs/FINAL_RELEASE_SYNC.md` has been
  reviewed against the linked Linear issue and PR.
- `docs/OPERATOR_READINESS_REPORT.md` has been reviewed and its verdict matches
  the intended handoff tier.
- Workspace data is created under the selected workspace folder, not inside the
  packaged app bundle.
- Backup, workspace JSON export, project Markdown export, task CSV/TSV export,
  and JSON import validation are checked with local files.
- Data integrity and search consistency audit guidance has no unresolved P0/P1
  findings.
- Linear has no open P0/P1 issues for MVP launch, and the release PR links the
  remaining known limitations below.

## Known MVP Limitations

- The packaged build is an unpacked development package. Installer targets,
  code signing, notarization, auto-update, and release-channel publishing are
  not implemented.
- Advanced rich-text editing, custom dashboard editing, advanced saved-view
  builder UX, browser capture production bridge, workflow scheduling, external
  live calendar sync, monthly/yearly recurrence, and broader third-party import
  execution remain future work.
- Backup and export are manual local workflows; automatic backup scheduling and
  retention foundations exist, but release owners should still verify backup
  and restore behavior manually before important data changes.
- Search is local and integrated with MVP/V1 records, including structured
  tokens and diagnostics foundations, but advanced relevance tuning and
  builder-style query UX remain future work.
- The MVP smoke suite covers the core local workflow path. It does not replace
  manual review of visible desktop flows before release.

## Distribution, Licensing, Privacy, And Updates

Distribution planning is tracked in `docs/DISTRIBUTION_LICENSING_PRIVACY.md`.
Operator handoff packaging evidence is tracked in
`docs/RELEASE_CANDIDATE_PACKAGING.md`.
Before public release, verify the platform signing/notarization gates,
dependency license notices, local-only privacy notice, checksums, and manual
update/backup instructions in that checklist.

The repeatable dependency/license/privacy gate is:

```bash
pnpm audit:dependencies
```

It writes `docs/release/dependency-license-audit.json` and
`docs/release/THIRD_PARTY_NOTICES.md` for release-owner review.

Auto-update, license activation, billing, hosted accounts, telemetry, and cloud
services are not part of the current release path. Any future auto-update or
commercial licensing work needs a separate scoped ticket and must preserve user
access to local workspace data.

## Packaged Development Builds

Use the development packaging target before release candidates:

```bash
pnpm package
pnpm package:smoke
pnpm release:package-check
```

`pnpm package` creates an unpacked app under `apps/desktop/dist-packaged/`.
`pnpm package:smoke` launches that packaged executable with a main-process smoke
mode that creates a temporary workspace, writes SQLite data through services,
reopens the database, and verifies workspace data paths are outside the app
bundle.

`pnpm release:package-check` verifies the unpacked artifact exists, records
SHA-256 checksums for the packaged executable and `app.asar`, checks that
Electron Builder remains a non-publishing `dir` package, records signing/update
status, and scans the packaged app folder for workspace database/manifest files.

The current Windows development package intentionally disables executable
signing with `signAndEditExecutable: false` in `apps/desktop/electron-builder.yml`.
Code signing, notarization, installer targets, and certificate management remain
release-hardening work for a future ticket.

## Artifact Naming And Platform Scope

Electron Builder is configured with this artifact name pattern for future
installer/archive targets:

```text
Local Work OS-<version>-<os>-<arch>.<ext>
```

The current `dir` target still produces unpacked development folders such as
`win-unpacked`, `mac/Local Work OS.app`, or `linux-unpacked` depending on the
host OS. Cross-OS packaging is not guaranteed from a single workstation; run the
package command on each target OS or in matching CI runners.

The package smoke check now verifies that a packaged app can:

- create/open a local workspace outside the app bundle,
- persist project and task data,
- copy an attachment into workspace-local storage,
- resolve local open/reveal paths through main-process handlers, and
- create a manual backup under the workspace `backups/` folder.

Manual OS release QA should still install or launch the generated app on the
target platform and repeat the workspace, attachment, backup, restart, and
external-open checks from `docs/QA_SCRIPTS.md`.
