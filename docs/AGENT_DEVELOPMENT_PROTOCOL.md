# Agent Development Protocol — Local Work OS

This protocol applies to all agent-created work.

## Core loop

```text
Linear issue
  → Codex plan
  → implementation branch
  → tests
  → PR
  → CI
  → Codex review
  → human review
  → merge
  → Linear Done
```

## Scope discipline

Every PR should implement one issue. If Codex discovers adjacent work, it should create follow-up suggestions, not implement them silently.

## Architecture discipline

All work must respect:

```text
No direct SQLite from React.
No direct filesystem from renderer.
Services/repositories own data writes.
Activity log tracks user-facing writes.
Search index tracks searchable data.
```

## Local-only discipline

Forbidden without explicit approval:

```text
cloud sync
hosted backend
mobile app
team collaboration
public share links
remote telemetry
remote file storage
```

## Quality discipline

Tests required by feature type:

| Feature type | Tests |
|---|---|
| Domain service | Unit tests |
| Repository | DB tests |
| Migration | Migration tests |
| UI | Component or E2E tests |
| File operations | Path/IPC tests |
| Search | Index/search result tests |
| Planning views | Date/timezone tests |
