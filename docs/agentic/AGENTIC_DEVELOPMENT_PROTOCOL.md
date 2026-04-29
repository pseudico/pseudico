# Local Work OS — Agentic Development Protocol

This protocol tells Codex how to run development agentically under human supervision.

---

# 1. Mission

Build Local Work OS as a local-only desktop productivity system inspired by Pagico-style functionality:

```text
workspace
projects
contacts
inbox
tasks
lists
notes
files
links
tags
categories
relationships
search
collections
saved views
today planner
dashboard
timeline/calendar
backup/export
advanced local productivity features
```

Do not clone any proprietary product’s branding, exact UI, assets, wording, screenshots, or implementation.

---

# 2. Product constraints

Always keep the app:

```text
local-only
desktop-first
single-user-first
SQLite-backed
file-system-backed
offline capable
```

Out of scope unless explicitly approved:

```text
cloud sync
mobile apps
hosted backend
team workspaces
public sharing
remote file storage
billing/user accounts
telemetry/analytics SDKs
```

---

# 3. Architecture constraints

Use the object graph:

```text
Workspace
  -> Containers: Inbox, Project, Contact
  -> Items: Task, List, Note, File, Link, Heading, Location, Comment
  -> Metadata: Tags, Categories, Relationships
  -> Views: Search, Collections, Dashboard, Today, Timeline, Calendar
```

Architecture rules:

```text
Renderer never directly accesses SQLite.
Renderer never directly accesses Node filesystem APIs.
Electron main/preload own local operations.
Repositories own database access.
Feature services own application workflows.
Core owns pure domain logic.
Every data-changing operation logs activity.
Searchable data changes update search indexing once available.
Soft delete before hard delete.
Workspace-relative file paths for local files.
```

---

# 4. Implementation standard

For every feature:

```text
schema if needed
repository/service logic
activity logging
search indexing consideration
tests
UI only after service exists
docs update if architecture/data model changed
```

Do not hide business logic inside React components.

---

# 5. Ticket lifecycle

Each Linear issue moves through:

```text
Backlog
Spec Ready
Codex Ready
Assigned to Codex
PR Open
Review
QA
Done
Blocked
```

Codex must not treat Backlog or Spec Draft issues as implementation-ready unless the human owner explicitly says so.

---

# 6. Done means

A Codex task is done when:

```text
acceptance criteria met
tests added/updated
checks run
PR opened
Linear updated
known limitations documented
human-readable summary included
```

A feature is truly done only when the PR is merged by the human owner.

---

# 7. Owner-friendly output

Codex must write summaries for a non-technical owner:

```text
What changed
Why it matters
How to test it
What is not included yet
Risks / warnings
```

Avoid relying on jargon without explanation.

---

# 8. Follow-up issue discipline

If Codex notices useful extra work, it should not implement it silently.

Instead, propose follow-up tickets:

```text
Title
Why needed
Suggested priority
Dependency
Acceptance criteria
```

---

# 9. Retrospective rule

If the same kind of mistake happens twice, Codex should propose an update to:

```text
AGENTS.md
nested AGENTS.md
review guidelines
prompt library
```

The purpose is to improve the agent system over time.
