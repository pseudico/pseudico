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
- `SECURITY.md` records local-only, Electron, filesystem, database, and privacy
  guardrails.
- `ROADMAP.md` summarizes the staged implementation path.
- `MODULE_REGISTRY.md` names planned product modules and their responsibilities.
- `DECISIONS/` stores accepted architecture decision records.

## Local-Only Rule

Local Work OS is a single-user desktop app with local workspaces, local files,
SQLite, and local backup/export/import. Cloud sync, hosted accounts, telemetry,
team collaboration, public sharing, remote file storage, and mobile apps are out
of scope unless the owner explicitly approves a future change.
