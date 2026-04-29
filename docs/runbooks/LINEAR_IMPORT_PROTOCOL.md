# Linear Import Protocol — Ticket Packs M0–M14

This document explains how to turn the Markdown ticket packs into Linear work without making the board unusable.

---

# 1. Do not import everything at once as active work

The full plan has 183 implementation tickets across M0–M14. Importing everything into active statuses immediately will make Linear noisy and will make Codex delegation harder.

Use staged import.

---

# 2. Import waves

## Wave 1 — Governance and foundation

Import:

```text
M0/M1 scaffold + database ticket pack
```

Statuses:

```text
M0 tickets → Spec Ready or Codex Ready
M1 early tickets → Spec Ready
M1 later tickets → Backlog
```

Do not mark all M1 tickets Codex Ready until the repo and Codex environment work.

## Wave 2 — First usable vertical slice

Import after repo scaffold succeeds:

```text
M2 core containers/items
M3 project/inbox/task early tickets
```

Goal:

```text
workspace → project → task → persist after restart
```

## Wave 3 — MVP completion

Import:

```text
M4 metadata/search
M5 Today/dashboard
M6 files/backup/export/stabilisation
```

## Wave 4 — V1/V2 depth

Import:

```text
M7–M8
```

Only after MVP workflows are usable.

## Wave 5 — Full parity expansion

Import:

```text
M9–M14
```

Keep most in Backlog until the app has real usage.

---

# 3. Manual import method

Because the ticket packs are Markdown and each ticket is detailed, the simplest reliable import process is manual or semi-manual:

```text
1. Open the ticket pack.
2. Copy one ticket into a Linear issue.
3. Preserve title, goal, scope, acceptance criteria, test requirements, and Codex prompt.
4. Add phase, kind, area, risk, and quality labels.
5. Set milestone.
6. Set estimate.
7. Set status.
8. Link relevant docs.
```

This is slower than bulk import but prevents garbage tickets.

---

# 4. Suggested parent structure

If using parent/sub-issues, create parent issues for milestones:

```text
M0 — Governance and Repo Setup
M1 — Scaffold and Database Foundation
M2 — Core Containers and Items
...
M14 — Hardening, QA, Release
```

Attach implementation tickets as sub-issues where useful.

Do not nest deeply. One parent + child issues is enough.

---

# 5. Dependency rules

Use Linear relations:

```text
blocks
blocked by
related
```

Examples:

```text
Database schema blocks repository implementation.
Repository implementation blocks UI flow.
Search index foundation blocks saved views.
Task due dates block Today view.
Safe file service blocks attachment UI.
```

---

# 6. Codex readiness on import

A copied ticket is not automatically Codex Ready. Before assigning to Codex, confirm:

```text
- The repository contains the relevant docs.
- The files/modules referenced exist or the ticket is explicitly creating them.
- The acceptance criteria are still correct.
- The ticket is small enough for one PR.
- The branch name and PR title are clear.
```

---

# 7. Minimal first imported set

Start with:

```text
M0-001 — Bootstrap pnpm monorepo and package structure
M0-002 — Add governance docs, AGENTS.md, and decision records
M0-003 — Configure GitHub CI, PR template, and Codex review guidelines
M1-001 — Build Electron/Vite/React desktop shell and placeholder routes
M1-002 — Implement typed preload IPC boundary
M1-003 — Implement local workspace filesystem create/open/validate service
M1-004 — Add SQLite/Drizzle database connection and migration runner
M1-005 — Implement initial database schema migration
M1-006 — Implement database bootstrap and seed system rows
```

This is enough to get a real app foundation.
