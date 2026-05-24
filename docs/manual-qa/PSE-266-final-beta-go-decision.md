# PSE-266 — Final beta go/no-go decision

Date: 2026-05-24  
Decision owner action required: accept internal-beta caveats and distribute the workflow-enabled `win-unpacked` folder plus tester handoff note.

## Decision

**GO WITH CAVEATS for controlled nontechnical internal beta.**

The previous Search No-go from PSE-268 is lifted. The previous Workflow scaffold caveat is updated: Workflows are now beta-supported only as predefined guided local workflows with preview, confirmation, result summary, Search retrieval, and run history evidence.

## Final candidate

- Folder: `C:\tmp\pse-269-review-merge\apps\desktop\dist-packaged\win-unpacked`
- Executable: `C:\tmp\pse-269-review-merge\apps\desktop\dist-packaged\win-unpacked\Local Work OS.exe`
- Executable SHA-256: `6f4886ad03ab6f097d8adaceb419535d1c13eb5202ee53eaf76e629585d06cb9`
- app.asar SHA-256: `3d144627764840e218b27b2eee86bdfa9cf32bb663d25d30b90cc1612f968b66`
- Handoff note: `docs/NONTECHNICAL_BETA_HANDOFF_DRAFT.md`
- Status report: `docs/BETA_HANDOFF_STATUS_2026-05-24.md`
- Complete pass: `docs/manual-qa/PSE-264-complete-functionality-beta-pass.md`
- Workflow evidence: `docs/manual-qa/workflow-beta-evidence-2026-05-24.md`

## Acceptance checks

- PSE-264 complete functionality pass: **Pass with caveats**.
- PSE-265 nontechnical handoff package: **Prepared and synced to workflow-enabled artifact**.
- PSE-266 final decision: **Go with caveats**.
- PSE-267 HRQA packaged evidence rerun: **Pass**.
- PSE-268 Search blocker: **Fixed and evidenced**.
- PSE-269 through PSE-274 guided Workflow beta sequence: **Done and evidenced**.

## Caveats to accept before sending

1. Unsigned unpacked internal beta; not a public release.
2. No installer or auto-update.
3. Workspace data must be outside the app folder.
4. Manual backup required before real imports, workflow runs on important data, or upgrades.
5. Packaged OS firewall/no-network monitor was not run in this pass; public-release local-only claims remain blocked until that is done.
6. Workflows are limited to predefined guided beta templates; no arbitrary scripting, background runs, webhooks, cloud services, or general workflow builder.

## Owner send checklist

- [ ] Zip/copy the entire workflow-enabled `win-unpacked` folder.
- [ ] Include `docs/NONTECHNICAL_BETA_HANDOFF_DRAFT.md` with the artifact.
- [ ] Give testers the checksum values above.
- [ ] Tell testers where to create workspace folders.
- [ ] Tell testers to back up before real imports, workflow runs, or upgrades.
- [ ] Keep PR #235 and the docs-sync PR traceable to the handoff artifact.
