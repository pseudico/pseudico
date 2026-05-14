# ADR-0005: Final Documentation Source Of Truth

## Status

Accepted.

## Context

Local Work OS has historical aggregate planning files, imported per-ticket
Markdown files, normalized product/architecture docs, Linear issues, and GitHub
PRs. During M14 release hardening, those sources can drift. Release work needs a
single hierarchy so future agents do not reintroduce stale scope, missing ticket
numbers, or claims that already-implemented local features are still future
work.

## Decision

The normalized docs under `docs/` are the durable release source of truth for
product scope, architecture, data model, module ownership, testing, security,
release notes, and user help. Linear remains the active work plan, and GitHub PRs
remain the merge proof. Historical aggregate ticket packs and per-ticket source
files are planning evidence, not authoritative release status.

When sources disagree:

1. Follow Linear for the current ticket status and intended scope.
2. Verify implementation status from the repository.
3. Update the normalized docs and release notes.
4. Leave historical ticket packs intact unless the task is explicitly a ticket
   cross-reference correction.

## Consequences

- Future release candidates start from `docs/FINAL_RELEASE_SYNC.md` and the
  documentation map in `docs/README.md`.
- Documentation updates must distinguish implemented foundations from future
  or release-hardening gaps.
- Ticket inventory corrections can be made when they improve Linear/GitHub/Codex
  alignment, but historical aggregate files should not be treated as generated
  truth after Linear import.
- This decision does not add cloud services, hosted accounts, telemetry,
  licensing systems, billing, public sharing, or remote storage.

