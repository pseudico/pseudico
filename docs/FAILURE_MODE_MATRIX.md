# Failure Mode Matrix

Status: PSE-199 baseline for operator-readiness hardening.
Purpose: make recoverable local-only failures understandable to a nontechnical operator and prove the highest-risk cases with automated or manual evidence.

## Operator-facing failure standard

Every recoverable failure should tell the operator:

1. **What happened** in plain language.
2. **Whether their data was changed**.
3. **What to do next**.
4. **What to preserve for support**.

Avoid raw stack traces, silent failures, and destructive recovery. When a safe automated test cannot simulate an OS condition, keep a manual QA step and do not mark the scenario release-ready until the manual result is recorded.

## Matrix

| ID | Severity | Scenario | Owner module | Expected behavior | Operator-facing message standard | Recovery instruction | Evidence |
|---|---:|---|---|---|---|---|---|
| FM-001 | P0 | Path traversal or absolute path supplied for workspace-relative file action. | Electron main filesystem / files / backup | Reject before read/write; no file copied, moved, deleted, or revealed outside the workspace. | "That path is not allowed because it leaves the workspace." | Choose a file/folder through the app picker or use a workspace-contained path. Preserve the attempted path for support. | Automated: `apps/desktop/tests/main/safeFileSystem.test.ts`, `packages/features/tests/backupService.test.ts`, `packages/features/tests/restoreService.test.ts`. |
| FM-002 | P0 | Permission-denied workspace folder. | Workspace filesystem | Workspace creation/open fails before partial setup or reports the incomplete step. | "Pseudico cannot write to this workspace folder." | Choose a writable local folder or fix OS folder permissions; do not continue entering real work until health passes. | Manual OS QA required: create/read-only temp folder and try create/open. |
| FM-003 | P0 | Missing referenced attachment file. | Files / maintenance | App preserves attachment record, reports missing path, and does not silently remove the record. | "The attachment record exists, but the file is missing from workspace storage." | Run attachment audit, reattach from original source, or restore from verified backup. | Automated: `packages/features/tests/maintenanceService.test.ts`; manual: File Safety QA in `docs/QA_SCRIPTS.md`. |
| FM-004 | P1 | Malformed or unsafe URL. | Links / external opener | Reject unsupported protocols and malformed URLs before creating/updating link or opening externally. | "Links must be valid HTTP or HTTPS URLs." | Correct the URL; do not paste `file:`, `javascript:`, `data:`, or custom schemes. | Automated: `packages/features/tests/linkService.test.ts`; external opener covered by security tests. |
| FM-005 | P0 | Malformed workspace export/import JSON. | Import / restore | Validation returns errors without applying rows or changing active workspace. | "This import file is not valid JSON or does not match the workspace export format." | Keep the original file, fix a copy, and retry in a test workspace first. | Automated: `packages/features/tests/importValidationService.test.ts`, `packages/features/tests/restoreService.test.ts`. |
| FM-006 | P1 | Huge note content. | Notes / search | Save remains transactional; preview is bounded; full searchable content remains indexed. | If too large in future UI, explain size limit before save. | Split extremely large notes only if the app reports a clear size/performance limit. | Automated: `packages/features/tests/noteService.test.ts`. |
| FM-007 | P1 | Large attachment boundary. | Files / maintenance / backup | Attachment copy validates source file and records size/checksum; backup/manifest/audit reports large files without UI freeze. | "The file is large; the operation may take longer. Do not close the app until it finishes." | Wait for completion; if it fails, verify disk space and retry after backup. | Partial automated: file checksum/copy and manifest tests; manual large-file QA required. |
| FM-008 | P1 | Large workspace slow path. | Performance / UI | Slow paths are benchmarked, bounded, and documented against budgets. | "This view is taking longer than expected." | Narrow date/search filters or run the large-workspace benchmark for evidence. | Automated benchmark: `pnpm benchmark:large`; PSE-203 owns release evidence. |
| FM-009 | P0 | App closed or interrupted during write/backup. | DB / backup / workspace | Transactions prevent partial DB writes where feasible; backup restore should use complete snapshots only. | "The previous operation may not have completed. Verify workspace health and backup status." | Run workspace health; create a new backup; restore only from snapshots with valid manifest/database. | Manual interruption QA required; automated transaction coverage exists in service tests. |
| FM-010 | P0 | Search index out of sync. | Search / maintenance | Rebuild creates deterministic search records and logs activity. | "Search results may be stale. Rebuild the local search index." | Run search rebuild; verify known project/task/note terms. | Automated: `packages/features/tests/maintenanceService.test.ts`, `packages/features/tests/searchIndexOrchestrator.test.ts`. |
| FM-011 | P0 | Backup restore failure or unsafe restore target/source. | Backup / restore / workspace filesystem | Reject unsafe manifests and active/in-place targets; leave source and target safe. | "This backup cannot be restored safely. The active workspace was not changed." | Restore into a fresh empty folder; keep the original backup unchanged; escalate with validation issues. | Automated: `packages/features/tests/restoreService.test.ts`, `apps/desktop/tests/main/backupHandlers.test.ts`, `apps/desktop/tests/smoke/backup-restore-golden.test.ts`. |
| FM-012 | P0 | Database locked, unavailable, or corrupt. | Workspace / DB recovery | Opening fails into recovery path; original database remains untouched. | "The workspace database could not be opened. Use recovery options and restore into a new workspace." | Close duplicate apps/tools; copy the workspace folder; restore latest verified backup into a new folder. | Automated: `apps/desktop/tests/main/workspaceFileSystemService.test.ts`, `apps/desktop/tests/main/backupHandlers.test.ts`; manual corruption QA in `docs/DB_CORRUPTION_RECOVERY.md`. |
| FM-013 | P1 | Duplicate records from repeated import or repeated operator action. | Import / domain services | Duplicate detection or explicit duplicate creation behavior is documented; no silent overwrite. | "This looks like a duplicate. Review before importing/creating again." | Review preview/conflict output; import into test workspace first. | Partial automated importer duplicate tests; broader duplicate UX remains follow-up if gaps are found. |
| FM-014 | P2 | Empty states. | Renderer / feature modules | Empty views explain what the screen is for and give a safe next action. | "No items yet. Capture work in the Inbox or create a project/contact." | Create a first record or open Help. | Automated renderer coverage across pages; manual operator QA required. |
| FM-015 | P1 | Long-running maintenance job. | Maintenance / UI | Job records status, preflight backup where required, and failure reason; operations are local-only. | "Maintenance is running. Do not close the app until it finishes." | Wait for completion; if failed, read job log, keep backup/report, and escalate. | Automated: `packages/features/tests/maintenanceService.test.ts`; manual large-job QA required. |

## P0/P1 evidence command

Run this focused regression pack when working on local failure behavior:

```bash
pnpm test -- apps/desktop/tests/main/safeFileSystem.test.ts apps/desktop/tests/main/workspaceFileSystemService.test.ts apps/desktop/tests/main/backupHandlers.test.ts packages/features/tests/backupService.test.ts packages/features/tests/restoreService.test.ts packages/features/tests/importValidationService.test.ts packages/features/tests/maintenanceService.test.ts packages/features/tests/linkService.test.ts packages/features/tests/noteService.test.ts packages/features/tests/searchIndexOrchestrator.test.ts packages/features/tests/largeWorkspaceBenchmarkService.test.ts apps/desktop/tests/smoke/backup-restore-golden.test.ts
```

Run the standard checks before PR handoff:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Manual QA backlog

These cases are intentionally kept manual until safe deterministic automation exists:

1. Permission-denied workspace folder on the target OS.
2. App/process closed during backup or write.
3. Database locked by another process.
4. Large attachment through real OS file picker.
5. Long-running maintenance job from the packaged app.

Record manual evidence in the PR or final operator-readiness report. If any P0 case risks silent data loss, split a dedicated P0 bug before claiming operator readiness.
