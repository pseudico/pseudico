# Local Parity QA Report

Status: PSE-187 release-hardening QA pass  
Last reviewed: 2026-05-14  
Validation: `pnpm qa:parity`

## Scope

This report is the M14 local parity QA pass over the feature families in
`docs/COVERAGE_MATRIX.md` and `docs/TEST_COVERAGE_MAP.md`. It records whether
each local-only product area has current automated evidence, which smoke tag
should be used in PR/manual QA notes, and which release-hardening gaps remain.

This pass does not add cloud sync, hosted accounts, mobile apps, public sharing,
team collaboration, telemetry, or remote storage checks. Any future parity work
must remain local-only unless the project owner explicitly changes scope.

## QA pass summary

- Source matrix reviewed: `docs/COVERAGE_MATRIX.md`.
- Coverage evidence reviewed: `docs/TEST_COVERAGE_MAP.md`, existing Vitest
  suites under `packages/*/tests`, and desktop tests under `apps/desktop/tests`.
- Automated coverage map validation: `pnpm coverage:map`.
- Parity report validation: `pnpm qa:parity`.
- Decision: no P0/P1 local-only parity blocker is recorded in this pass; the
  remaining gaps are scoped release-hardening follow-ups and manual QA items.

## Feature parity QA matrix

| Map key | Smoke tag | Current QA status | Gap log |
|---|---|---|---|
| `workspace-core` | `@smoke:workspace` | Automated unit, DB, renderer, and smoke coverage exists for workspace create/open/bootstrap foundations. Manual reopen QA remains required for release candidates. | Track browser-level create/open/reopen in `LWO-QA-001`. |
| `electron-security` | `@smoke:security` | Automated core, main, and renderer-boundary security tests exist for IPC, URL/path, and drag/drop guardrails. | Expand fixture automation in `LWO-QA-002`. |
| `projects-containers` | `@smoke:projects` | Automated project/container service, repository, UI, and smoke evidence exists for core project workflows. | Add cross-container regression in `LWO-QA-003`. |
| `contacts` | `@smoke:contacts` | Automated service, repository, relationship, timeline, and UI component coverage exists. | Add future contact E2E smoke when renderer workflow is release-critical. |
| `inbox-capture` | `@smoke:inbox` | Automated Inbox, capture, command palette, quick-add, and shortcut smoke coverage exists. | Add keyboard-only capture/triage regression after E2E harness lands. |
| `tasks-planning` | `@smoke:tasks` | Automated task, date parsing, recurrence, reminder, repository, Today UI, and smoke coverage exists. | Build the dated-task matrix in `LWO-QA-006`. |
| `lists` | `@smoke:lists` | Automated list state-machine, list service, conversion, board, repository, and component coverage exists. | Add list-to-task and pipeline regression smoke when flows are release-critical. |
| `notes` | `@smoke:notes` | Automated note service, autosave, wikilink, comments, repository, and editor coverage exists. | Add autosave crash/reopen Markdown fixture regression later. |
| `files-attachments` | `@smoke:files` | Automated attachment, version, integrity, repository, safe filesystem, and media preview coverage exists. | Add attachment import/open/reveal/quarantine smoke in `LWO-QA-009`. |
| `links-browser-capture` | `@smoke:links` | Automated link parsing, link service, capture service, repositories, capture bridge, native messaging, and result-card coverage exists. | Add local bridge smoke after harness approval. |
| `metadata` | `@smoke:metadata` | Automated tag/category parsers, metadata services, repositories, and form/component coverage exists. | Add mutation regression for activity/search/saved-view effects later. |
| `search` | `@smoke:search` | Automated search service, structured query, index orchestration, repository, diagnostics, and result-card coverage exists. | Add deterministic golden fixtures in `LWO-QA-012`. |
| `saved-views` | `@smoke:saved-views` | Automated saved view, collection, smart list, repository, and editor coverage exists. | Include saved-view evaluator golden fixtures in `LWO-QA-012`. |
| `today-dashboard` | `@smoke:planning` | Automated Today, preferences, dashboard, project health, repository, and page coverage exists. | Add Today rollover/dashboard widget regression smoke later. |
| `timeline-calendar` | `@smoke:calendar` | Automated timeline/date range/calendar/feed services plus page and UI component coverage exists. | Add drag/reschedule/import smoke with local fixtures later. |
| `templates-workflows` | `@smoke:automation` | Automated template library/file format, workflow schema/service, repositories, and renderer page coverage exists. | Add workflow/template fixture regression with disabled unsafe/network actions later. |
| `import-export-backup` | `@smoke:backup-import` | Automated backup, restore, export, CSV/TSV, Markdown, email, IMAP, handler, and read-repository coverage exists. | Add golden import/export/restore regression in `LWO-QA-017`. |
| `privacy-maintenance` | `@smoke:privacy` | Automated privacy settings, maintenance, appearance, DB health, diagnostics, settings, and theme coverage exists. | Add no-network/privacy maintenance release regression later. |
| `demo-help-i18n-release` | `@smoke:release` | Automated demo workspace, help content, i18n, package smoke, help center, and settings coverage exists. | Add packaged release-candidate checklist in `LWO-QA-019`. |

## Gap log

| Gap ID | Scope | Release risk | Recommended status |
|---|---|---|---|
| `LWO-QA-001` | Add Playwright workspace create/open/reopen smoke with disposable local workspaces. | Medium until browser-level Electron smoke exists. | Spec Ready after Playwright dependency ticket is approved. |
| `LWO-QA-002` | Automate IPC URL/path security regression fixtures and allowlist checks. | Medium because Electron guardrails are release-sensitive. | Spec Ready. |
| `LWO-QA-003` | Add project/contact mixed-content, tab, relationship, activity, and search regression flow. | Medium for cross-module regressions. | Spec Ready. |
| `LWO-QA-006` | Build dated-task due/start/range/recurrence/reminder regression matrix. | Medium for planning reliability. | Spec Ready. |
| `LWO-QA-009` | Add local attachment import/open/reveal/quarantine smoke with filesystem fixtures. | Medium because file handling crosses OS boundaries. | Spec Ready. |
| `LWO-QA-012` | Add deterministic search and saved-view ranking/evaluator golden fixtures. | Medium for search regressions. | Spec Ready. |
| `LWO-QA-017` | Add workspace JSON, CSV/TSV, Markdown, EML/Maildir, backup restore golden fixtures. | Medium for local portability workflows. | Spec Ready. |
| `LWO-QA-019` | Add packaged-app release-candidate smoke checklist and evidence artifact. | Medium for final desktop release confidence. | Spec Ready for release-candidate wave. |

## Release decision

This parity pass finds broad automated evidence for every current feature family
and records the release-hardening gaps that remain. The app should not be
considered final-release ready until manual QA from `docs/QA_SCRIPTS.md`, package
smoke, and the relevant gap tickets for the release milestone are completed.

## Machine-check contract

The validator in `scripts/check-local-parity-qa.mjs` enforces that:

- this report exists and contains all required sections;
- every feature family from the coverage map appears exactly once in the parity
  matrix;
- every smoke tag from the test coverage map is referenced; and
- every release-hardening gap ID selected for this pass is logged.
