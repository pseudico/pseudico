---
title: Local Work OS Reference Document
created: 2026-04-29
scope: local-only desktop productivity app
status: generated aggregate reference for Codex / Linear setup
---

# Local Work OS — Master Ticket Inventory M0–M14

This is the aggregate ticket inventory for the local-only full-scope build attempt.

**Total planned tickets:** 183

## Count by phase

| Phase | Ticket count | Purpose |
|---|---:|---|
| M0/M1 | 16 | Repo, governance, scaffold, database foundation |
| M2 | 8 | Core object graph |
| M3 | 12 | Core work objects |
| M4 | 10 | Metadata, search, saved views |
| M5 | 9 | Today, dashboard, collections, project health |
| M6 | 8 | Files, backup, export, MVP stabilisation |
| M7 | 8 | V1 depth: contacts, tabs, reminders, timeline/calendar, templates |
| M8 | 8 | Advanced local power: recurrence, pipelines, versions, workflows |
| M9 | 18 | Navigation, command, UX, supervision power |
| M10 | 18 | Advanced project/contact/container depth |
| M11 | 20 | Advanced items, tasks, lists, notes, files, links |
| M12 | 18 | Planning views, dashboard, search, saved views |
| M13 | 16 | Local workflows, templates, capture, import/export/backup |
| M14 | 14 | Security, performance, release, docs, QA |

## Recommended Linear import waves

| Wave | Import | Reason |
|---|---|---|
| 1 | M0/M1 only | Validate development factory and scaffold foundation |
| 2 | M2/M3 | Build real object graph and first useful app slice |
| 3 | M4/M5/M6 | Complete MVP usability and safety |
| 4 | M7/M8 | V1/V2 depth after MVP works |
| 5 | M9–M14 | Full-scope parity backlog after foundation is stable |

## Inventory


### M0/M1

| Key | Title |
|---|---|
| M0-001 | Bootstrap pnpm monorepo and package structure |
| M0-002 | Add governance docs, AGENTS.md, and decision records |
| M0-003 | Configure GitHub CI, PR template, and Codex review guidelines |
| M0-004 | Add module registry and feature placeholder contracts |
| M1-001 | Build Electron/Vite/React desktop shell and placeholder routes |
| M1-002 | Implement typed preload IPC boundary |
| M1-003 | Implement local workspace filesystem create/open/validate service |
| M1-004 | Add SQLite/Drizzle database connection and migration runner |
| M1-005 | Implement initial database schema migration |
| M1-006 | Implement database bootstrap and seed system rows |
| M1-007 | Implement repository foundations |
| M1-008 | Implement transaction service and activity-log write pattern |
| M1-009 | Implement local search index foundation |
| M1-010 | Implement renderer workspace onboarding and database health UI |
| M1-011 | Add test harness, temp workspace utilities, and smoke tests |
| M1-012 | Add packaging configuration and development build verification |

### M2

| Key | Title |
|---|---|
| M2-001 | Implement container service and repository CRUD |
| M2-002 | Implement universal item service and repository CRUD |
| M2-003 | Implement container content feed queries |
| M2-004 | Implement relationship service |
| M2-005 | Implement manual ordering service |
| M2-006 | Implement archive and trash semantics |
| M2-007 | Implement activity feed queries |
| M2-008 | Add object graph integration tests |

### M3

| Key | Title |
|---|---|
| M3-001 | Implement project creation and project list |
| M3-002 | Implement project overview and content page |
| M3-003 | Implement Inbox service and Inbox page |
| M3-004 | Implement task creation service |
| M3-005 | Implement task editing and completion |
| M3-006 | Implement task due-date queries |
| M3-007 | Implement checklist/list service |
| M3-008 | Implement list reordering and bulk paste |
| M3-009 | Implement Markdown note service |
| M3-010 | Implement file item metadata service |
| M3-011 | Implement link item service |
| M3-012 | Add first vertical app slice |

### M4

| Key | Title |
|---|---|
| M4-001 | Implement inline tag parser |
| M4-002 | Implement tag repository and service |
| M4-003 | Implement tag browser foundation |
| M4-004 | Implement category repository and service |
| M4-005 | Implement category management UI |
| M4-006 | Implement FTS search index writes |
| M4-007 | Implement global search page |
| M4-008 | Implement search index rebuild and diagnostics |
| M4-009 | Implement saved view schema and evaluator |
| M4-010 | Implement basic collection from tag/keyword |

### M5

| Key | Title |
|---|---|
| M5-001 | Implement Today due and overdue view |
| M5-002 | Implement manual daily planning lanes |
| M5-003 | Implement Today lane ordering and move actions |
| M5-004 | Implement default dashboard data service |
| M5-005 | Implement default dashboard UI |
| M5-006 | Implement project health calculation |
| M5-007 | Implement collections page |
| M5-008 | Implement quick add foundation |
| M5-009 | Add usability-view integration tests |

### M6

| Key | Title |
|---|---|
| M6-001 | Implement safe local file import |
| M6-002 | Implement open and reveal attachment actions |
| M6-003 | Implement missing-file and integrity checks |
| M6-004 | Implement manual backup service |
| M6-005 | Implement full JSON export |
| M6-006 | Implement MVP smoke test suite |
| M6-007 | Implement package build verification |
| M6-008 | MVP documentation and regression sync |

### M7

| Key | Title |
|---|---|
| M7-001 | Implement contact containers and contact list |
| M7-002 | Implement flexible contact fields |
| M7-003 | Implement related projects and follow-ups for contacts |
| M7-004 | Implement content tabs UI |
| M7-005 | Implement local reminders foundation |
| M7-006 | Implement timeline view foundation |
| M7-007 | Implement calendar month view |
| M7-008 | Implement list/project templates foundation |

### M8

| Key | Title |
|---|---|
| M8-001 | Implement recurring task foundation |
| M8-002 | Implement quick snooze and reschedule actions |
| M8-003 | Implement pipeline mode for lists |
| M8-004 | Implement attachment snapshots and file versions |
| M8-005 | Implement manual local workflows |
| M8-006 | Implement local browser capture spike/prototype |
| M8-007 | Implement import foundations |
| M8-008 | V2 architecture review and hardening |

### M9

| Key | Title |
|---|---|
| M9-001 | Implement command palette foundation |
| M9-002 | Implement keyboard shortcut registry |
| M9-003 | Implement context menus |
| M9-004 | Implement pinned items and favourites expansion |
| M9-005 | Implement app navigation history |
| M9-006 | Implement open recent and jump-to switcher |
| M9-007 | Implement multi-tab app navigation |
| M9-008 | Implement item inspector panel |
| M9-009 | Implement bulk selection and bulk actions |
| M9-010 | Implement drag-and-drop across containers/views |
| M9-011 | Implement undo foundation |
| M9-012 | Implement trash and restore UI |
| M9-013 | Implement print/export current view |
| M9-014 | Implement density/theme preferences |
| M9-015 | Implement empty/loading/error-state standards |
| M9-016 | Implement accessibility audit fixes |
| M9-017 | Implement onboarding checklist |
| M9-018 | Implement UI telemetry-free diagnostics panel |

### M10

| Key | Title |
|---|---|
| M10-001 | Implement rich project summary view |
| M10-002 | Implement project banner and visual identity |
| M10-003 | Implement project hierarchy and subproject relationships |
| M10-004 | Implement project archive/restore workflow |
| M10-005 | Implement project clone/duplicate |
| M10-006 | Implement project kanban/status board |
| M10-007 | Implement advanced contact profile UI |
| M10-008 | Implement contact label browser |
| M10-009 | Implement contact interaction timeline |
| M10-010 | Implement contact import from CSV/vCard |
| M10-011 | Implement advanced content tab summaries |
| M10-012 | Implement tab templates |
| M10-013 | Implement hidden/private local tabs |
| M10-014 | Implement backlinks panel |
| M10-015 | Implement relationship graph view |
| M10-016 | Implement wikilinks/internal links |
| M10-017 | Implement auto-grouped container feeds |
| M10-018 | Implement container-level custom fields |

### M11

| Key | Title |
|---|---|
| M11-001 | Implement robust natural-language date parser |
| M11-002 | Implement quick snooze menu everywhere |
| M11-003 | Implement deferred and someday task states |
| M11-004 | Implement waiting/blocked task workflow |
| M11-005 | Implement recurring task UI |
| M11-006 | Implement reminder preferences and defaults |
| M11-007 | Implement keyboard-first list editing |
| M11-008 | Implement task-to-list conversion |
| M11-009 | Implement list item dates and Today integration |
| M11-010 | Implement Markdown editor improvements |
| M11-011 | Implement note autosave and conflict guard |
| M11-012 | Implement comments and annotations |
| M11-013 | Implement attachment preview cards |
| M11-014 | Implement attachment version browser |
| M11-015 | Implement attachment integrity audit |
| M11-016 | Implement location objects |
| M11-017 | Implement link metadata fetching with privacy controls |
| M11-018 | Implement web widget safety spike |
| M11-019 | Implement local email object model |
| M11-020 | Implement item conversion framework |

### M12

| Key | Title |
|---|---|
| M12-001 | Implement unified view switcher |
| M12-002 | Implement advanced timeline ranges |
| M12-003 | Implement timeline drag rescheduling |
| M12-004 | Implement calendar week view |
| M12-005 | Implement calendar day view |
| M12-006 | Implement calendar drag and drop |
| M12-007 | Implement ICS import |
| M12-008 | Implement Rapid Day Planner keyboard mode |
| M12-009 | Implement planning modes |
| M12-010 | Implement dashboard layout editor |
| M12-011 | Implement dashboard saved-view widgets |
| M12-012 | Implement project health dashboard widgets |
| M12-013 | Implement visual smart-list builder |
| M12-014 | Implement structured search syntax |
| M12-015 | Implement advanced metadata browser |
| M12-016 | Implement collection inline creation |
| M12-017 | Implement search ranking and snippets |
| M12-018 | Implement saved-view diagnostics |

### M13

| Key | Title |
|---|---|
| M13-001 | Implement workflow definition registry |
| M13-002 | Implement workflow manual trigger UI |
| M13-003 | Implement workflow item-created trigger |
| M13-004 | Implement workflow file-import trigger |
| M13-005 | Implement workflow variables |
| M13-006 | Implement workflow date manipulation |
| M13-007 | Implement workflow template actions |
| M13-008 | Implement workflow history and rollback |
| M13-009 | Implement template library UI |
| M13-010 | Implement template import/export |
| M13-011 | Implement browser capture extension bridge |
| M13-012 | Implement local EML/Maildir import |
| M13-013 | Implement optional IMAP import spike |
| M13-014 | Implement advanced CSV import mapping |
| M13-015 | Implement advanced export bundles |
| M13-016 | Implement backup scheduler and retention |

### M14

| Key | Title |
|---|---|
| M14-001 | Electron security audit |
| M14-002 | Optional workspace encryption spike |
| M14-003 | Privacy and network controls |
| M14-004 | Large workspace performance benchmark |
| M14-005 | Database corruption recovery plan |
| M14-006 | Attachment manifest audit and repair |
| M14-007 | Migration test matrix |
| M14-008 | Release packaging hardening |
| M14-009 | In-app help and local documentation |
| M14-010 | Demo workspace generator |
| M14-011 | Internationalisation scaffold |
| M14-012 | Regression coverage map |
| M14-013 | Full parity QA pass |
| M14-014 | Final documentation sync and release readiness |
