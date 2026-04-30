# Roadmap

The roadmap is tracked in Linear and in `docs/tickets/`. This document gives a
short implementation overview for future contributors.

## M0: Governance And Repo Setup

- Bootstrap the pnpm TypeScript monorepo.
- Add durable Codex, documentation, and ADR guardrails.
- Configure GitHub CI and PR workflow.
- Define module registry and placeholder feature contracts.

## M1: Scaffold And Database Foundation

- Add Electron/Vite/React desktop shell.
- Add typed preload IPC boundary.
- Add local workspace filesystem service.
- Add SQLite/Drizzle setup, migrations, bootstrap, seed data, repositories,
  transaction write pattern, search index foundation, health UI, tests, and
  packaging verification.

## M2-M3: Core Work Objects

- Establish relationships and backlinks.
- Build initial Inbox, project, contact, task, note, file, link, and metadata
  flows on top of the local data foundation.

## M4-M6: Search, Views, Dashboard, Backup

- Implement tags, categories, saved views, collections, local full-text search,
  dashboard widgets, Today planning, local backup/export/import, and release
  hardening.

## M7-M8: Timeline, Calendar, Templates, Workflows

- Add timeline/calendar views, richer project/contact tabs, local templates,
  recurrence/reminders, pipelines, local workflow foundations, and browser
  capture groundwork.

## M9-M14: Hardening And Extended Local Workflows

- Improve security, import/export breadth, advanced search/views, workflow
  maturity, help docs, diagnostics, maintenance tools, and packaging quality.

## Operating Rule

The next implementation branch should come from a Linear issue in `Codex Ready`
status. Keep each branch scoped to one issue and one PR.
