# PSE-234 Project Detail Space-Budget Evidence

## Production renderer evidence

Captured from the production-built desktop renderer at the hidden route
`#/project-detail-space-budget-fixture`. The route uses the same production
`ProjectDetailPage`, item cards, inspector, and project-summary components with
live IPC loading disabled so long-data fixture evidence can run without a
workspace database.

- `docs/manual-qa/screenshots/PSE-234-project-detail/01-project-detail-mixed-feed-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-234-project-detail/02-project-detail-mixed-feed-1280x800.png`
- `docs/manual-qa/screenshots/PSE-234-project-detail/03-project-detail-mixed-feed-full-1440x2200.png`
- `docs/manual-qa/screenshots/PSE-234-project-detail/04-project-detail-mixed-feed-all-types-1440x6200.png`

## Operator review

- Primary operator goal: use a project as the working room for next action,
  checklist, note, file, link, location, related contact, and activity context.
- Dominant information: project identity, next work, content counts, mixed feed,
  quick-start actions, and selected-item inspector.
- Secondary/advanced information: outline/tab summaries and related contacts;
  these collapse before the central feed is squeezed.
- Next safe actions: add task/checklist/note/file/link/location, refresh,
  complete/snooze/reschedule task, inspect first feed item, or open/reveal
  attachments through existing guarded IPC actions.
- Long-data result: long task titles use readable multi-line cards; filename,
  domain, path, tags, category, and note preview remain visible instead of
  shrinking into tiny controls or syllable-wrapped labels.
- 1280x800 result: the central feed keeps its readable width while the secondary
  outline collapses and the inspector remains available; below narrower widths
  the inspector follows the existing drawer path.
- Feedback/trust: summaries, activity, and inspector copy show what changed and
  why before the operator opens files or external references.
- Local Work OS loop: capture, plan, review evidence, relate contacts, and act
  from one local project container rather than exposing maintenance/admin work.

## Risks and notes

- P2: the hidden fixture is intentionally isolated from the persistent shell for
  browser-based evidence capture; PSE-232 covers the production shell layout.
- P3: future SBUX passes can tune per-item edit controls, but the current pass
  preserves existing behavior and improves container-level readability.
