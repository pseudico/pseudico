---
title: Local Work OS Reference Document
created: 2026-04-29
scope: local-only desktop productivity app
status: generated aggregate reference for Codex / Linear setup
---


# Local Work OS — Full-Scope Pagico-Style Parity Coverage Matrix

This coverage matrix maps the broad Pagico-style feature surface to the local-only Local Work OS ticket system.

The purpose is to help Codex, Linear, and the owner verify that the planned system has explicit coverage and that excluded cloud/mobile/team features are not accidentally introduced.

## Coverage rule

A feature is considered covered when at least one ticket defines:

- where it lives in the architecture,
- what local-only behaviour it should provide,
- which modules/services/tables are affected,
- what acceptance criteria prove completion.

## Matrix

| Feature area | Ticket phases | Local Work OS coverage | Local-only note |
|---|---|---|---|
| Local workspace and database | M0/M1 | workspace folder, SQLite, migrations, system Inbox, health UI | No cloud workspace |
| Projects | M3, M5, M10 | project containers, overview, content feed, health, hierarchy, clone, archive | No public share |
| Contacts / clients | M7, M10 | contact containers, fields, related projects, interaction timeline | No team CRM backend |
| Inbox | M1, M3, M5 | system Inbox, quick capture, triage, move to project/contact | Local capture only |
| Tasks | M3, M5, M8, M11 | create/edit/complete/dates/recurrence/snooze/reminders/statuses | No teammate assignment |
| Lists and checklists | M3, M8, M11 | checklists, bulk paste, indent/outdent, conversion, pipeline mode | Local only |
| Notes | M3, M11 | Markdown notes, search, autosave, editor improvements | Rich text optional later |
| Files and attachments | M3, M6, M8, M11, M14 | local import, metadata, open/reveal, versions, integrity, previews | No hosted storage |
| Links and bookmarks | M3, M11, M13 | URL items, metadata, browser capture bridge | No cloud capture service |
| Tags | M4, M12 | inline @tags, browser, multi-filter, collections | Local metadata |
| Categories | M4, M12 | colour-coded classification, assignment, browser | Local metadata |
| Search | M4, M12 | FTS, global search, structured syntax, ranking, diagnostics | No external search service |
| Collections | M4, M5, M12 | saved tag/keyword views, grouped results, inline creation | Local saved views |
| Smart Lists / Saved Views | M4, M12 | query JSON, evaluator, builder, diagnostics | No remote query engine |
| Dashboard | M5, M12 | default widgets, layout editor, saved-view widgets, project health | Local widgets |
| Today / Day Planner | M5, M8, M12 | due/overdue, Tomorrow planning, rollover, Rapid Planner keyboard mode | Local date logic |
| Timeline | M7, M12 | dated task timeline, grouping, drag reschedule | No cloud calendar dependency |
| Calendar | M7, M12 | month/week/day views, drag-drop, ICS import | No live external sync |
| Content tabs | M7, M10 | tabs in projects/contacts, summary cards, tab templates | No shared/public tabs |
| Relationships/backlinks | M2, M7, M10 | cross-object links, backlinks, graph view | Local graph only |
| Templates | M7, M13 | list/project/contact/tab templates, import/export | Local template files |
| Recurrence/reminders | M7, M8, M11 | local notifications, recurrence rules, defaults | No push cloud notifications |
| Pipelines | M8, M11 | list-to-pipeline and card movement | Local display mode |
| Workflows | M8, M13 | manual/local triggers, variables, date manipulation, templates | No webhooks/cloud actions |
| Browser capture | M8, M13 | local native messaging/localhost bridge | No hosted browser account |
| Email objects/import | M11, M13 | local EML/Maildir import, optional IMAP spike | No hosted email-to-task address |
| Backup/export/import | M6, M13, M14 | manual/scheduled backup, JSON/Markdown/CSV bundles, restore/integrity | Local files only |
| Security/privacy | M0/M1, M9, M14 | IPC boundary, local-only guardrails, audits, privacy controls | No telemetry by default |
| Release/QA/docs | M6, M14 | packaging, smoke tests, regression matrix, help docs | Desktop release only |


## Explicit exclusions

| Excluded reference feature class | Reason | Local alternative |
|---|---|---|
| Cloud sync | Out of project scope and adds backend complexity | Local backup/export/import |
| Mobile app | Out of project scope | Desktop-first local app |
| Team workspaces | Out of project scope | Single-user local workspaces |
| Public share links | Requires hosted web infrastructure | Print/export bundles |
| Hosted accounts/billing | Not needed for local-only app | Local workspace files |
| Hosted email-to-task | Requires hosted inbound email | Local EML/Maildir import; optional IMAP spike |
| Team assignment | Requires user/account model | Local status/category/tag workflows |
| Push notifications | Requires external service | Local desktop notifications |

## Coverage gaps to monitor

These are not omissions, but they require careful timing:

1. Rich text editing should wait until Markdown notes are stable.
2. Workflows should wait until item/tag/category/container operations are mature.
3. File versions should wait until attachment import and integrity checks are solid.
4. Browser capture should wait until Inbox/link/task creation APIs are stable.
5. Timeline/calendar drag-and-drop should wait until task date handling is robust.
6. Encryption should be a spike, not a default MVP commitment.
