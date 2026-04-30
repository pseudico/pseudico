# ADR-0001: Local-Only Desktop App

- Status: Accepted
- Date: 2026-04-30
- Owners: Local Work OS maintainers

## Context

Local Work OS is intended to give a single user a private productivity workspace
for projects, contacts, tasks, notes, files, links, search, dashboards,
planning, backup, and maintenance. The project explicitly excludes cloud sync,
hosted accounts, team collaboration, public sharing, telemetry, mobile apps,
and remote file storage for the initial build.

## Decision

Build Local Work OS as a local-only desktop app. User data lives in local
workspace folders, local SQLite databases, and local attachment storage.
Backup, export, import, and maintenance features use local files.

## Consequences

- The app does not require hosted accounts or a backend service.
- The data model and repositories can optimize for local SQLite workflows.
- Privacy and portability are primary design constraints.
- Collaboration, cloud sync, public sharing, hosted telemetry, and mobile
  clients are out of scope unless a future ADR changes this decision.

## Alternatives Considered

- Cloud-first SaaS app: rejected because it conflicts with the local-only
  privacy and ownership goal.
- Hybrid local/cloud sync: rejected for the initial build because sync adds a
  large distributed-systems surface and account model.

## Related Documents

- `docs/PRODUCT_SPEC.md`
- `docs/SECURITY.md`
- `docs/COVERAGE_MATRIX.md`
