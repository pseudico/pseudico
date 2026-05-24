# PSE-266 — Final beta go/no-go decision

Date: 2026-05-24  
Decision owner action required: accept internal-beta caveats and distribute the `win-unpacked` folder plus tester handoff note.

## Decision

**GO WITH CAVEATS for controlled nontechnical internal beta.**

The previous No-go from PSE-268 is lifted. The Search route rerender/cancellation bug was fixed, the final package was rebuilt, and Search/Today packaged production-route evidence passed.

## Final candidate

- Folder: `C:\tmp\Pseudico-beta-candidate\apps\desktop\dist-packaged\win-unpacked`
- Executable: `C:\tmp\Pseudico-beta-candidate\apps\desktop\dist-packaged\win-unpacked\Local Work OS.exe`
- Executable SHA-256: `e3c131148ffd8da8964b17aff72800441cc6b2758c58858912981d9b9a22198f`
- app.asar SHA-256: `761e44b39ae1631ec448776aa9221f947435e2df336a5b6fca742e36148eee56`
- Handoff note: `docs/NONTECHNICAL_BETA_HANDOFF_DRAFT.md`
- Status report: `docs/BETA_HANDOFF_STATUS_2026-05-24.md`
- Complete pass: `docs/manual-qa/PSE-264-complete-functionality-beta-pass.md`

## Acceptance checks

- PSE-264 complete functionality pass: **Pass with caveats**.
- PSE-265 nontechnical handoff package: **Prepared**.
- PSE-266 final decision: **Go with caveats**.
- PSE-267 HRQA packaged evidence rerun: **Pass**.
- PSE-268 Search blocker: **Fixed and evidenced**.

## Caveats to accept before sending

1. Unsigned unpacked internal beta; not a public release.
2. No installer or auto-update.
3. Workspace data must be outside the app folder.
4. Manual backup required before real imports/upgrades.
5. Packaged OS firewall/no-network monitor was not run in this pass; public-release local-only claims remain blocked until that is done.
6. Workflows are lab/scaffold only.

## Owner send checklist

- [ ] Zip/copy the entire `win-unpacked` folder.
- [ ] Include `docs/NONTECHNICAL_BETA_HANDOFF_DRAFT.md` with the artifact.
- [ ] Give testers the checksum values above.
- [ ] Tell testers where to create workspace folders.
- [ ] Tell testers to back up before real imports or upgrades.
- [ ] Keep this PR/branch traceable to the handoff artifact.
