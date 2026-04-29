# Local Work OS — Stop Conditions and Escalation Rules

Codex must stop and ask for human approval when any stop condition appears.

---

# 1. Immediate stop conditions

Stop immediately if the task would require:

```text
cloud sync
hosted backend
mobile app work
team collaboration permissions
public sharing
telemetry/analytics SDKs
billing/accounts
unsafe filesystem access
hard delete of user data
destructive migration
bypassing activity log
bypassing search index for searchable data
disabling CI
disabling branch protection
self-merging a PR
large unrelated rewrite
```

---

# 2. Dependency stop conditions

Stop and ask before adding:

```text
new production dependency
native module
rich text editor framework
browser extension framework
webview/iframe framework
encryption library
large UI framework
file watcher library
```

Required output:

```text
Dependency name
Why needed
Alternatives considered
Security/performance risk
Bundle/runtime impact
Recommendation
```

---

# 3. Schema stop conditions

Stop and ask before:

```text
removing columns
renaming core tables
changing ID strategy
hard-deleting records
changing workspace file layout
changing saved-view query schema
changing attachment storage convention
```

Required output:

```text
Proposed schema change
Why needed
Migration path
Backup implications
Rollback implications
Tests required
```

---

# 4. Architecture stop conditions

Stop and ask before:

```text
moving business logic into React components
letting renderer directly access SQLite
letting renderer directly access filesystem
changing package dependency direction
replacing Electron/Vite/React/SQLite stack
changing activity-log transaction model
```

---

# 5. Escalation format

When blocked, Codex should post:

```text
Blocked reason:

Decision needed:

Options:
1. Option A — pros/cons
2. Option B — pros/cons
3. Option C — pros/cons

Recommendation:

Impact if delayed:

Suggested next action:
```

---

# 6. Human decision outcomes

The human owner can reply with:

```text
Approved: proceed with option X.
Rejected: do not implement this.
Plan only: create a deeper plan but no code.
Split: turn this into smaller tickets.
Escalate: pause until external review.
```
