# Release Notes

## MVP Release Checklist

Before tagging an MVP release candidate:

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass locally
  and in CI.
- `pnpm package` creates the unpacked desktop app for the target platform.
- `pnpm package:smoke` passes against the unpacked app.
- The MVP smoke suite in `apps/desktop/tests/smoke/mvp-flow.test.ts` passes.
- Manual QA in `docs/QA_SCRIPTS.md` has been run on a temporary workspace.
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
- Contacts, timeline, calendar, templates, workflows, reminders, browser
  capture, file versions, custom dashboard editing, advanced saved-view builder
  UX, and full import/restore execution remain future work.
- Backup and export are manual local workflows; automatic backup scheduling and
  restore UX are not part of the current MVP.
- Search is local and integrated with MVP records, but advanced ranking,
  diagnostics UI, and user-triggered full reindex controls remain future work.
- The MVP smoke suite covers the core local workflow path. It does not replace
  manual review of visible desktop flows before release.

## Packaged Development Builds

Use the development packaging target before release candidates:

```bash
pnpm package
pnpm package:smoke
```

`pnpm package` creates an unpacked app under `apps/desktop/dist-packaged/`.
`pnpm package:smoke` launches that packaged executable with a main-process smoke
mode that creates a temporary workspace, writes SQLite data through services,
reopens the database, and verifies workspace data paths are outside the app
bundle.

The current Windows development package intentionally disables executable
signing with `signAndEditExecutable: false` in `apps/desktop/electron-builder.yml`.
Code signing, notarization, installer targets, and certificate management remain
release-hardening work for a future ticket.
