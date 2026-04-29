# Codex PR Review Guidelines

Review this project as a local-only desktop app with a strict object-graph architecture.

## High-priority review concerns

1. Local-only scope
   - No cloud sync
   - No hosted backend
   - No remote telemetry
   - No mobile-specific implementation
   - No team/public-sharing implementation

2. Architecture boundaries
   - React must not directly access SQLite.
   - Renderer must not directly access filesystem.
   - Electron IPC must be typed and narrow.
   - Domain logic must not be hidden in UI components.

3. Data integrity
   - Writes must create activity log events.
   - Migrations must be safe.
   - Soft delete preferred.
   - Workspace-relative paths preferred.

4. Search consistency
   - Searchable fields must update FTS/search index.
   - Tag/category changes must affect search and saved views where relevant.

5. Testing
   - New commands/services need unit tests.
   - New repository logic needs database tests.
   - New critical UI flows need component or E2E tests.

6. Scope control
   - PR should implement only the linked Linear issue.
   - Flag unrelated rewrites.
   - Flag hidden feature additions.

## Review output

Give:

- Summary
- P0/P1 issues
- Suggested fixes
- Missing tests
- Questions for human reviewer
