# Workspace Module

Purpose: coordinate workspace-facing application operations for local workspace
identity, metadata, health, and maintenance entry points.

Owns:

- Current workspace application service contracts.
- Workspace metadata and health summaries at the feature boundary.
- Coordination with Electron main/preload IPC for local folder actions.

Does not own:

- Raw filesystem access from renderer code.
- SQLite schema, migrations, or repositories.
- Product content such as projects, contacts, tasks, notes, files, or links.

Likely service methods later:

- `createWorkspace`
- `openWorkspace`
- `listRecentWorkspaces`
- `getWorkspaceHealth`
- `repairWorkspaceStructure`

Integration points:

- Electron main/preload IPC.
- Database bootstrap and health services.
- Backup and export maintenance flows.
