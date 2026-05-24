# Nontechnical beta tester handoff draft — blocked pending PSE-268

This document is a **draft**. Do not send it to nontechnical testers until `docs/BETA_HANDOFF_STATUS_2026-05-24.md` is updated from No-go to Go/Go-with-caveats.

## Candidate artifact

- App folder: `C:\tmp\Pseudico-beta-candidate\apps\desktop\dist-packaged\win-unpacked`
- Run: `Local Work OS.exe`
- Executable SHA-256: `149e0ec7220a7e78b2ad4d3f69b7be4ae3c2441159e37a4ee1c339c4b7543ec0`
- app.asar SHA-256: `89ac0db77f2dd1f7035a22bb4f0afa88ff0ecbc1b2980f3d9b348f1b415d61eb`

## Current caveat

This candidate is blocked by PSE-268. Search is a primary way for a tester to retrieve work, and packaged Search route evidence is not yet acceptable.

## Tester instructions once unblocked

1. Unzip or copy the entire `win-unpacked` folder to a local folder.
2. Run `Local Work OS.exe`.
3. If Windows warns about an unsigned app, continue only if the build came from the project owner.
4. Create a new local workspace folder outside the app folder.
5. Do not store workspace data inside `dist-packaged`, `resources`, or `app.asar.unpacked`.
6. Before importing real data or trying a newer build, create a manual backup from Settings.
7. Report issues with: what you tried, expected result, actual result, screenshot, workspace path, and whether data was changed.

## Rollback

1. Quit Local Work OS.
2. Keep the workspace folder; do not delete it with the app folder.
3. Restore the previous app folder/build.
4. If workspace data looks wrong, restore from the most recent manual backup before continuing.
