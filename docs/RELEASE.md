# Release Notes

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
