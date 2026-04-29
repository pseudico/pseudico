# Codex Workflow — Local Work OS

Codex is used for scoped implementation, testing, refactoring, and review.

## Implementation rule

Codex must plan before coding for non-trivial work.

Required plan:

```text
understanding of task
files likely to change
implementation steps
test plan
risks/assumptions
```

## Assignment prompt

```text
@Codex implement this issue. Read AGENTS.md and the linked docs first. Produce a short plan before coding. Keep the change scoped to this issue. Add/update tests. Open a PR using the template.
```

## Review prompt

```text
@codex review this PR for architecture violations, local-only violations, missing tests, activity log gaps, search index inconsistencies, unsafe IPC/filesystem behaviour, migration risks, and scope creep.
```

## Do not assign Codex when

```text
The issue is vague.
The issue has unresolved decisions.
The issue is estimated 8.
The issue spans too many modules.
The task is primarily visual judgement.
```
