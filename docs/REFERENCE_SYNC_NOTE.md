---
title: Local Work OS Reference Document
created: 2026-04-29
scope: local-only desktop productivity app
status: generated aggregate reference for Codex / Linear setup
---


# Reference Sync Note — Missing Aggregate Documents Fixed

Codex reported missing aggregate documents referenced by tickets. This bundle restores those aggregate files so references resolve before importing to Linear.

## Files generated

Place these at the repository root if ticket references expect root paths:

```text
local-work-os-m2-m8-complete-feature-ticket-pack.md
local-work-os-m2-m8-core-feature-module-specifications.md
local-work-os-m9-m14-full-scope-parity-ticket-pack.md
local-work-os-master-ticket-inventory-m0-m14.md
local-work-os-full-scope-pagico-parity-coverage-matrix.md
```

Recommended long-term repo layout is to keep copies under `docs/strategy/` or `docs/tickets/aggregate/`, but root-level files are provided here because the existing ticket references expect these exact names.

## After copying into GitHub

1. Commit these files in a docs-only PR.
2. Ask Codex to run a reference check against all tickets.
3. If all references resolve, proceed with Linear import.
4. Do not import M9–M14 as active work yet; keep them as backlog/reference.

## Suggested Codex prompt

```text
@Codex please verify that all ticket references to aggregate docs now resolve. Do not modify implementation code. If references are still broken, open a docs-only PR updating the paths consistently.
```
