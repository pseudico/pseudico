# Final Release Documentation Sync

This document is the M14 release-documentation reconciliation index. It records
which normalized docs are the current source of truth, which planning artifacts
remain historical, and which release gaps are intentionally still open.

## Source Of Truth

Start future release or Linear planning work from these files:

| Area | Current source | Notes |
|---|---|---|
| Product scope | `docs/PRODUCT_SPEC.md` | Defines local-only product scope, implemented baseline, exclusions, and known limitations. |
| Architecture | `docs/ARCHITECTURE.md` | Defines Electron, preload, renderer, package, repository, IPC, workspace, and packaged-smoke boundaries. |
| Data model | `docs/DATA_MODEL.md` | Describes current schema/service coverage and planned model direction without requiring a migration. |
| Module ownership | `docs/MODULE_REGISTRY.md` | Routes future tickets to feature modules and records implemented versus future-heavy slices. |
| Delivery workflow | `docs/OPERATING_PLAN.md` | Defines Linear, GitHub, Codex, PR, CI, and release operating rules. |
| Testing and QA | `docs/TESTING.md`, `docs/TEST_COVERAGE_MAP.md`, `docs/QA_SCRIPTS.md` | Defines automated checks, coverage expectations, and manual release-candidate QA. |
| Release notes | `docs/RELEASE.md` | Records MVP release checklist, current limitations, packaging notes, and distribution planning links. |
| Security/privacy | `docs/SECURITY.md`, `docs/SECURITY_AUDIT.md`, `docs/DISTRIBUTION_LICENSING_PRIVACY.md` | Records local-only, IPC, network, privacy, signing, license, and update-path guardrails. |
| User help | `docs/help/`, `packages/features/src/help/HelpContent.ts` | Markdown help source and mirrored in-app help article definitions. |
| Ticket inventory | `docs/tickets/MASTER_TICKET_INVENTORY.md` and source ticket files | Historical planning map; Linear is the active plan. |

Historical aggregate files at the repository root and under `docs/tickets/`
remain useful context, but they should not override the normalized docs above
or the current Linear issue state.

## Current Implementation Status Summary

The repository now contains concrete local-only foundations for:

- Workspace creation/opening, SQLite bootstrap, migrations, health checks, and
  package smoke verification.
- Inbox, projects, contacts, mixed content items, tasks, lists, notes, links,
  files, tabs, metadata, relationships, activity, search, saved views,
  collections, Today, dashboards, templates, workflows, reminders, recurrence,
  timeline, calendar, import/export, backup, maintenance, printing, appearance,
  localization scaffolding, demo workspace generation, and local help.
- Electron main/preload IPC boundaries for filesystem and native actions, with
  renderer code remaining Node/SQLite-free.
- Local-only release hardening docs for privacy, network controls, security,
  distribution, licensing, updates, performance, corruption recovery,
  migrations, attachment manifests, accessibility, and QA.

## Known Release Gaps

These are still intentionally not release-complete:

- Signed installers, notarization, update channels, and public distribution
  automation.
- Cloud sync, hosted accounts, telemetry, team collaboration, public sharing,
  mobile apps, billing, and remote file storage.
- Advanced rich-text editing, advanced saved-view builder UX, custom dashboard
  editing, browser capture production bridge, external live calendar sync,
  monthly/yearly recurrence, workflow scheduling, and broader third-party import
  execution beyond the currently documented local import paths.
- Release owner decisions for license text, signing certificates, platform
  store requirements, checksum publication, and privacy notice wording.

## Ticket Cross-Reference Reconciliation

The source ticket set contains `LWO-M14-014` for distribution/licensing/update
research and `LWO-M14-015` for final documentation synchronization. The master
ticket inventory has been corrected to show M14 as a fifteen-ticket phase so the
Linear `PSE-189` issue maps to `LWO-M14-015`.

Linear remains the active plan. When a Linear issue disagrees with a historical
aggregate ticket pack, prefer Linear and update the normalized docs instead of
copying stale aggregate wording into new work.

## Verification Performed

The final sync should be considered release-ready only after:

1. Local Markdown link verification finds no broken relative links in `docs/`.
2. User help Markdown and in-app help article IDs stay synchronized.
3. `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass locally and
   in CI.
4. The release PR links the Linear issue and records any known limitations that
   remain after review.

