# Local Work OS Documentation

This folder is the durable source of product, architecture, operating, and
delivery guidance for Local Work OS. The full planning artifacts remain in the
repository, but future implementation work should start from these normalized
docs and the linked Linear issue.

## Primary References

- `PRODUCT_SPEC.md` contains the full product specification and feature scope.
- `OPERATING_PLAN.md` contains the Linear, GitHub, and Codex operating model.
- `COVERAGE_MATRIX.md` maps the broad feature surface to planned tickets.
- `tickets/MASTER_TICKET_INVENTORY.md` indexes the imported roadmap tickets.

## Extracted Guides

- `ARCHITECTURE.md` defines the desktop, package, IPC, database, and local
  workspace boundaries.
- `DATA_MODEL.md` summarizes the workspace, container, item, relationship,
  activity, search, and attachment model direction.
- `TESTING.md` defines expected verification for documentation, domain logic,
  database work, Electron IPC, renderer work, and release checks.
- `TEST_COVERAGE_MAP.md` maps feature families to unit, integration,
  component, smoke/E2E, and manual QA expectations.
- `SECURITY.md` records local-only, Electron, filesystem, database, and privacy
  guardrails.
- `SECURITY_AUDIT.md` records the current Electron IPC, external link, widget,
  and drag/drop hardening posture plus manual QA checks.
- `TEMPLATE_FILE_FORMAT.md` defines the versioned `.lwo-template` JSON
  envelope for portable local templates.
- `BROWSER_CAPTURE.md` explains the disabled-by-default local browser capture
  extension scaffold, pairing token, and localhost/native messaging setup.
- `IMAP_IMPORT.md` documents the optional local IMAP importer boundary,
  credential approach, duplicate prevention, and current adapter limitation.
- `CSV_TSV_IMPORT.md` documents local CSV/TSV task, contact, and project
  import preview, mapping, conflict behavior, and activity logging.
- `import-research/COMMON_APP_IMPORT_FORMATS.md` records researched local
  export formats, importer tradeoffs, fixture needs, and follow-up importer
  recommendations.
- `ROADMAP.md` summarizes the staged implementation path.
- `MODULE_REGISTRY.md` names planned product modules and their responsibilities.
- `QA_SCRIPTS.md` lists manual and automated smoke checks for MVP workflows.
- `PERFORMANCE.md` defines large-workspace benchmark fixtures, budgets, and
  report artifacts.
- `DEMO_WORKSPACE.md` documents the optional local demo workspace generator and
  manual QA path.
- `DB_CORRUPTION_RECOVERY.md` documents the local-only corrupt database
  detection and backup-restore recovery flow.
- `MIGRATIONS.md` documents SQLite migration behavior, backup-before-migration,
  downgrade refusal, and the migration fixture test matrix.
- `ATTACHMENT_MANIFEST_AUDIT.md` documents local attachment manifest audits and
  reversible orphan-file quarantine cleanup.
- `ACCESSIBILITY.md` documents keyboard behavior and manual accessibility checks.
- `LOCALIZATION.md` documents the English-only i18n scaffold and future locale
  preference boundary.
- `help/` contains local Markdown help center content mirrored in the app.
- `DECISIONS/` stores accepted architecture decision records.

## Local-Only Rule

Local Work OS is a single-user desktop app with local workspaces, local files,
SQLite, and local backup/export/import. Cloud sync, hosted accounts, telemetry,
team collaboration, public sharing, remote file storage, and mobile apps are out
of scope unless the owner explicitly approves a future change.
