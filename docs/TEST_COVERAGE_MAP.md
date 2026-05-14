# Test Coverage Map

Status: M14 release-hardening baseline  
Owner: Regression Coverage Map  
Last reviewed: 2026-05-14  
Validation: `pnpm coverage:map`

## Purpose

This document maps Local Work OS feature families to expected unit,
integration, component, smoke/E2E, and manual QA coverage. It is the release
hardening companion to `docs/COVERAGE_MATRIX.md`: the coverage matrix proves
feature planning coverage, while this map proves test and QA expectations.

The app remains desktop-only, local-only, and single-user. Coverage must not
introduce cloud test services, hosted accounts, remote storage, telemetry, or
network-dependent assertions.

## Coverage levels

| Level | Primary owner | Expected evidence |
|---|---|---|
| Unit | `packages/core` and `packages/features` | Pure parser, validator, state-machine, and service tests under `packages/*/tests`. |
| Integration | `packages/db`, `packages/features`, Electron main | Repository, migration, service orchestration, IPC handler, attachment, import/export, and scheduler tests. |
| Component | `packages/ui` and desktop renderer | React Testing Library tests for reusable components and page hosts with mocked APIs. |
| Smoke / E2E | `apps/desktop/tests/smoke` now; future Playwright specs later | App-shell, launch, MVP flow, shortcut, packaged-app, and future browser-level workflows. |
| Manual QA | PR template and docs runbooks | Human checks for desktop launch, file dialogs, local filesystem effects, packaging, and visible workflows. |

## Current test organization

- Core/domain unit tests: `packages/core/tests/`
- Feature service tests: `packages/features/tests/`
- Database and migration integration tests: `packages/db/tests/`
- Shared test workspace helpers: `packages/test-utils/tests/`
- Reusable UI component tests: `packages/ui/tests/`
- Electron main/preload/renderer/security tests: `apps/desktop/tests/main/`,
  `apps/desktop/tests/preload/`, `apps/desktop/tests/renderer/`, and
  `apps/desktop/tests/security/`
- Desktop smoke coverage: `apps/desktop/tests/smoke/`

## Playwright organization plan

Playwright is not currently a workspace dependency, so release smoke coverage is
implemented with Vitest and renderer/main harnesses. When Playwright is added by
a scoped ticket, organize browser-level specs without disturbing the existing
Vitest layout:

```text
apps/desktop/tests/e2e/
  fixtures/                 # deterministic local workspaces and file fixtures
  specs/
    smoke/                  # @smoke tags, short release-gate flows
    regression/             # cross-module workflows
    accessibility/          # keyboard/focus-only workflows
  support/
    launchElectron.ts       # safe Electron launch helper
    workspaceFixture.ts     # disposable local workspace helper
```

Future Playwright specs must use disposable local workspaces, must not read or
write user files outside the fixture folder, and must not require external
network access.

## Feature coverage matrix

Legend: **Current** means the repo already has named automated coverage.
**Planned** means coverage must be added before the feature is release-critical.
**Manual** means human verification remains required because the behavior crosses
OS dialogs, packaging, or real filesystem boundaries.

| Map key | Feature family | Unit coverage | Integration coverage | Component coverage | Smoke / E2E coverage | Manual QA | Gaps and follow-up ticket seed | Smoke tag |
|---|---|---|---|---|---|---|---|---|
| `workspace-core` | Workspace create/open, bootstrap, recent workspace, health | Current: `packages/core/tests/smoke.test.ts` | Current: `packages/db/tests/workspaceRepository.test.ts`, `packages/db/tests/workspaceSeed.test.ts`, `apps/desktop/tests/main/workspaceFileSystemService.test.ts` | Current: `apps/desktop/tests/renderer/workspaceOnboarding.test.tsx`, `apps/desktop/tests/renderer/WorkspaceHealth.test.tsx` | Current: `apps/desktop/tests/smoke/app-launch.test.tsx`, `apps/desktop/tests/smoke/app-shell.test.tsx` | Create/open a disposable local workspace and reopen after app restart. | `LWO-QA-001` add Playwright workspace create/open/reopen smoke after Playwright lands. | `@smoke:workspace` |
| `electron-security` | Main/preload IPC, renderer boundary, safe external links, drag/drop guardrails | Current: `packages/core/tests/electronSecurity.test.ts`, `packages/core/tests/dragDrop.test.ts` | Current: `apps/desktop/tests/main/electronSecurity.test.ts`, `apps/desktop/tests/main/safeFileSystem.test.ts`, `apps/desktop/tests/security/renderer-boundary.test.ts` | Planned: focused renderer error-state coverage for rejected IPC inputs | Current: desktop smoke plus package smoke | Manually verify unsafe URL/path inputs are rejected and external links use the shared opener. | `LWO-QA-002` add release security regression checklist automation for IPC allowlists and URL/path fixtures. | `@smoke:security` |
| `projects-containers` | Projects, project hierarchy, status, clone/archive, tabbed containers | Current: `packages/features/tests/projectService.test.ts`, `packages/features/tests/containerCloneService.test.ts`, `packages/features/tests/containerGroupingService.test.ts` | Current: `packages/db/tests/containerRepository.test.ts`, `packages/db/tests/containerTabRepository.test.ts` | Current: `apps/desktop/tests/renderer/projectsPage.test.tsx`, `packages/ui/tests/containerTabSummaryCards.test.tsx` | Current: MVP smoke covers project-oriented flow | Create project, add mixed content, switch tabs, archive/restore locally. | `LWO-QA-003` add cross-container regression flow covering project clone, tabs, and activity/search effects. | `@smoke:projects` |
| `contacts` | Contact containers, profile fields, labels, relationships, timeline | Current: `packages/features/tests/contactService.test.ts`, `packages/features/tests/contactTimelineService.test.ts`, `packages/features/tests/contactRelationshipService.test.ts` | Current: `packages/db/tests/contactFieldRepository.test.ts`, `packages/db/tests/contactLabelBrowserRepository.test.ts` | Current: `packages/ui/tests/contactComponents.test.tsx` | Planned | Manually create a contact, add fields, relate to project, and reopen workspace. | `LWO-QA-004` add contact end-to-end smoke once contact renderer workflows are release-ready. | `@smoke:contacts` |
| `inbox-capture` | Inbox, quick add, command palette, recent/pinned navigation | Current: `packages/features/tests/inboxService.test.ts`, `packages/features/tests/captureService.test.ts`, `packages/core/tests/actionRegistry.test.ts` | Current: task/item repository coverage through capture services | Current: `apps/desktop/tests/renderer/inboxPage.test.tsx`, `apps/desktop/tests/renderer/quickAddModal.test.tsx`, `packages/ui/tests/commandPalette.test.tsx` | Current: `apps/desktop/tests/smoke/mvp-flow.test.ts`, `apps/desktop/tests/smoke/shortcuts.test.ts` | Capture task/note/link into Inbox and move it to a project. | `LWO-QA-005` add keyboard-only capture/triage regression smoke. | `@smoke:inbox` |
| `tasks-planning` | Tasks, dates, recurrence, reminders, snooze, priorities | Current: `packages/core/tests/naturalDateParser.test.ts`, `packages/core/tests/dateExpressionParser.test.ts`, `packages/features/tests/taskService.test.ts`, `packages/features/tests/recurrenceService.test.ts`, `packages/features/tests/reminderService.test.ts` | Current: `packages/db/tests/taskRepository.test.ts`, `packages/db/tests/recurrenceRepository.test.ts`, `packages/db/tests/reminderRepository.test.ts`, `apps/desktop/tests/main/notificationScheduler.test.ts` | Current: `apps/desktop/tests/renderer/todayPage.test.tsx`, `packages/ui/tests/dailyPlannerEditor.test.tsx` | Current: MVP and shortcut smoke | Manually verify local notifications only where OS permits. | `LWO-QA-006` add dated-task regression matrix for due/start/range/recurrence/reminder interactions. | `@smoke:tasks` |
| `lists` | Lists, list items, indentation, conversion, bulk paste, pipeline/board view | Current: `packages/core/tests/listEditorStateMachine.test.ts`, `packages/features/tests/listService.test.ts`, `packages/features/tests/taskListConversionService.test.ts`, `packages/features/tests/projectBoardService.test.ts` | Current: `packages/db/tests/listRepository.test.ts` | Current: `packages/ui/tests/kanbanBoard.test.tsx`, `packages/ui/tests/itemComponents.test.tsx` | Planned | Manually verify list row reorder/indent and conversion preserve data. | `LWO-QA-007` add list-to-task/list-to-pipeline regression smoke. | `@smoke:lists` |
| `notes` | Markdown notes, autosave, wikilinks, comments | Current: `packages/features/tests/noteService.test.ts`, `packages/features/tests/noteAutosaveService.test.ts`, `packages/features/tests/wikilinkService.test.ts`, `packages/features/tests/commentService.test.ts` | Current: `packages/db/tests/noteRepository.test.ts`, `packages/db/tests/commentRepository.test.ts` | Current: `packages/ui/tests/noteEditor.test.tsx`, `packages/ui/tests/markdownEditor.test.tsx` | Planned | Manually verify autosave/reopen and wikilink navigation. | `LWO-QA-008` add note autosave crash/reopen regression and Markdown fixture set. | `@smoke:notes` |
| `files-attachments` | Attachment import, metadata, versions, thumbnails, manifest audit | Current: `packages/features/tests/fileAttachmentService.test.ts`, `packages/features/tests/fileVersionService.test.ts`, `packages/features/tests/integrityCheckService.test.ts` | Current: `packages/db/tests/attachmentRepository.test.ts`, `packages/db/tests/attachmentVersionRepository.test.ts`, `apps/desktop/tests/main/safeFileSystem.test.ts` | Current: `packages/ui/tests/containerMediaPreview.test.tsx` | Planned | Manually attach, reveal/open, backup, and audit files in a disposable workspace. | `LWO-QA-009` add fixture-based attachment import/open/reveal/quarantine smoke. | `@smoke:files` |
| `links-browser-capture` | Links, URL parsing, optional local browser capture bridge | Current: `packages/core/tests/linkParser.test.ts`, `packages/features/tests/linkService.test.ts`, `packages/features/tests/captureService.test.ts` | Current: `packages/db/tests/linkRepository.test.ts`, `apps/desktop/tests/main/captureBridge.test.ts`, `apps/desktop/tests/main/nativeMessagingService.test.ts` | Current: `packages/ui/tests/searchResultCard.test.tsx` | Planned | Manually verify browser capture remains opt-in/local and rejects invalid payloads. | `LWO-QA-010` add localhost/native-messaging capture smoke with no hosted service. | `@smoke:links` |
| `metadata` | Tags, categories, metadata browsers, project/contact labels | Current: `packages/core/tests/tagParser.test.ts`, `packages/features/tests/tagService.test.ts`, `packages/features/tests/categoryService.test.ts`, `packages/features/tests/metadataBrowserService.test.ts` | Current: `packages/db/tests/tagRepository.test.ts`, `packages/db/tests/categoryRepository.test.ts`, `packages/db/tests/metadataBrowserRepository.test.ts` | Current: `packages/ui/tests/projectForm.test.ts`, `packages/ui/tests/contactComponents.test.tsx` | Planned | Manually assign tags/categories and verify views/search reflect changes. | `LWO-QA-011` add metadata mutation regression for activity/search/saved-view updates. | `@smoke:metadata` |
| `search` | FTS indexing, structured query, ranking/highlighting, diagnostics | Current: `packages/features/tests/searchService.test.ts`, `packages/features/tests/structuredSearchQuery.test.ts`, `packages/features/tests/searchIndexOrchestrator.test.ts` | Current: `packages/db/tests/searchIndexRepository.test.ts`, `packages/db/tests/searchIndexService.test.ts`, `apps/desktop/tests/main/diagnosticsHandlers.test.ts` | Current: `packages/ui/tests/searchResultCard.test.tsx` | Planned | Manually rebuild index and verify known fixture queries. | `LWO-QA-012` add deterministic search relevance/highlight regression fixtures. | `@smoke:search` |
| `saved-views` | Saved views, collections, smart lists, diagnostics | Current: `packages/features/tests/savedViewService.test.ts`, `packages/features/tests/collectionService.test.ts`, `packages/features/tests/smartListService.test.ts` | Current: `packages/db/tests/savedViewRepository.test.ts` | Current: `packages/ui/tests/smartListEditor.test.tsx` | Planned | Manually create saved view, reopen app, and evaluate results. | `LWO-QA-013` add saved-view builder/evaluator regression smoke. | `@smoke:saved-views` |
| `today-dashboard` | Today/Tomorrow planning, dashboard, project health widgets | Current: `packages/features/tests/todayService.test.ts`, `packages/features/tests/todayPreferencesService.test.ts`, `packages/features/tests/dashboardService.test.ts`, `packages/features/tests/projectHealthService.test.ts` | Current: `packages/db/tests/dailyPlanRepository.test.ts`, `packages/db/tests/dashboardRepository.test.ts` | Current: `apps/desktop/tests/renderer/todayPage.test.tsx`, `apps/desktop/tests/renderer/dashboardPage.test.tsx` | Current: app-shell smoke reaches dashboard shell | Manually plan/reorder tasks and verify dashboard summaries after restart. | `LWO-QA-014` add Today rollover and dashboard widget regression smoke. | `@smoke:planning` |
| `timeline-calendar` | Timeline, calendar, date ranges, ICS/calendar feeds | Current: `packages/core/tests/timelineDateScale.test.ts`, `packages/core/tests/dateRangeParser.test.ts`, `packages/features/tests/timelineService.test.ts`, `packages/features/tests/calendarService.test.ts`, `packages/features/tests/calendarFeedService.test.ts` | Current: calendar feed repository coverage through DB/service tests | Current: `apps/desktop/tests/renderer/timelinePage.test.tsx`, `apps/desktop/tests/renderer/calendarPage.test.tsx`, `packages/ui/tests/timelineView.test.tsx`, `packages/ui/tests/calendarWeekDay.test.tsx` | Planned | Manually verify local `.ics` import is read-only and no live sync is implied. | `LWO-QA-015` add timeline/calendar drag/reschedule/import smoke with local fixtures. | `@smoke:calendar` |
| `templates-workflows` | Templates, template files, workflow schema/run history/actions | Current: `packages/features/tests/templateLibraryService.test.ts`, `packages/features/tests/templateFileFormat.test.ts`, `packages/features/tests/workflowSchema.test.ts`, `packages/features/tests/workflowService.test.ts` | Current: `packages/db/tests/templateRepository.test.ts`, `packages/db/tests/workflowRepository.test.ts` | Current: `apps/desktop/tests/renderer/templatesPage.test.tsx`, `apps/desktop/tests/renderer/workflowsPage.test.tsx` | Planned | Manually import/export a local template and run a safe local workflow. | `LWO-QA-016` add workflow/template fixture regression with disabled unsafe/network actions. | `@smoke:automation` |
| `import-export-backup` | Backup, restore, export bundles, CSV/TSV, Markdown, EML/Maildir, optional IMAP | Current: `packages/features/tests/backupService.test.ts`, `packages/features/tests/restoreService.test.ts`, `packages/features/tests/exportService.test.ts`, `packages/features/tests/csvImportService.test.ts`, `packages/features/tests/importFoundations.test.ts`, `packages/features/tests/markdownFolderImportService.test.ts`, `packages/features/tests/emailImportService.test.ts`, `packages/features/tests/imapImportService.test.ts` | Current: `apps/desktop/tests/main/backupHandlers.test.ts`, `apps/desktop/tests/main/exportHandlers.test.ts`, `apps/desktop/tests/main/importHandlers.test.ts`, `packages/db/tests/exportReadRepositories.test.ts`, `packages/db/tests/imapImportRepository.test.ts` | Current: `apps/desktop/tests/renderer/emailDropImport.test.ts` for `.eml`/Maildir drop routing; planned: broader import/export settings UI coverage | Planned | Manually create backup/export/import into a new workspace with local fixture files. | `LWO-QA-017` add import/export/restore golden-fixture regression smoke. | `@smoke:backup-import` |
| `privacy-maintenance` | No telemetry/network defaults, app settings, maintenance jobs, DB integrity | Current: `packages/features/tests/privacySettingsService.test.ts`, `packages/features/tests/maintenanceService.test.ts`, `packages/features/tests/appearanceSettingsService.test.ts` | Current: `packages/db/tests/databaseHealthService.test.ts`, `packages/db/tests/performanceDiagnostics.test.ts`, `apps/desktop/tests/main/diagnosticsHandlers.test.ts` | Current: `apps/desktop/tests/renderer/settingsPage.test.tsx`, `apps/desktop/tests/renderer/themeProvider.test.tsx` | Planned | Manually verify maintenance jobs create logs/activity and never report to remote services. | `LWO-QA-018` add no-network/privacy maintenance release regression. | `@smoke:privacy` |
| `demo-help-i18n-release` | Demo workspace, local help, i18n scaffold, packaging/release smoke | Current: `packages/features/tests/demoWorkspaceService.test.ts`, `packages/features/tests/helpContent.test.ts`, `packages/core/tests/i18n.test.ts` | Current: `apps/desktop/tests/main/packageSmoke.test.ts` | Current: `packages/ui/tests/helpCenter.test.tsx`, `apps/desktop/tests/renderer/settingsPage.test.tsx` | Current: package smoke and launch smoke | Manually run packaged dev build when release/packaging changes. | `LWO-QA-019` add packaged-app release candidate checklist and screenshot-free smoke evidence. | `@smoke:release` |

## Smoke tags

Use these stable tags in future Playwright names, PR templates, and manual QA
notes. A PR should include at least one tag when it changes behavior in that
feature family.

- `@smoke:workspace`
- `@smoke:security`
- `@smoke:projects`
- `@smoke:contacts`
- `@smoke:inbox`
- `@smoke:tasks`
- `@smoke:lists`
- `@smoke:notes`
- `@smoke:files`
- `@smoke:links`
- `@smoke:metadata`
- `@smoke:search`
- `@smoke:saved-views`
- `@smoke:planning`
- `@smoke:calendar`
- `@smoke:automation`
- `@smoke:backup-import`
- `@smoke:privacy`
- `@smoke:release`

## Follow-up test ticket seeds

These seeds are intentionally scoped as test/QA work, not product feature work.
Create them in Linear as Spec Ready or Backlog unless one is promoted by the
current foundation wave. Keep exactly one follow-up in Codex Ready at a time.

| Seed | Title | Scope | Suggested status |
|---|---|---|---|
| `LWO-QA-001` | Add Playwright workspace create/open/reopen smoke | Browser-level local workspace lifecycle with disposable fixture folders. | Spec Ready after Playwright dependency ticket is approved. |
| `LWO-QA-002` | Automate IPC URL/path security regression checklist | Rejected IPC, path traversal, URL opener, and drag/drop URL-like path fixtures. | Spec Ready. |
| `LWO-QA-003` | Add cross-container project/contact regression flow | Project/contact mixed content, tabs, relationships, activity, and search refresh. | Spec Ready. |
| `LWO-QA-006` | Build dated-task recurrence/reminder regression matrix | Date parsing, due/start/range, recurrence roll-forward, reminders, and Today. | Spec Ready. |
| `LWO-QA-009` | Add attachment import/open/reveal/quarantine smoke | Fixture-backed local file import, attachment versions, manifest audit, and orphan quarantine. | Spec Ready. |
| `LWO-QA-012` | Add deterministic search and saved-view golden fixtures | Search ranking/highlight/rebuild and saved-view evaluator fixtures. | Spec Ready. |
| `LWO-QA-017` | Add import/export/restore golden-fixture regression | Workspace JSON, CSV/TSV, Markdown folder, EML/Maildir, backup restore. | Spec Ready. |
| `LWO-QA-019` | Add packaged-app release candidate smoke checklist | Package command, local workspace path validation, help/settings/release smoke. | Spec Ready for release candidate wave. |

## PR usage rule

When changing behavior, include this short QA line in the PR body:

```text
Coverage map impact: <map key>; tags <@smoke:...>; tests <unit/integration/component/smoke/manual>.
```

If the change creates a new module or feature family, update this document in
the same PR and add a `coverage:map` validation run to the PR checks list.

## Machine-check contract

The validator in `scripts/check-test-coverage-map.mjs` enforces that:

- this document exists and contains all required top-level sections;
- every required map key appears exactly once in the feature coverage matrix;
- every required smoke tag is listed; and
- every required follow-up seed appears in the follow-up table.
