# Todoist CSV/Backup ZIP Import

Local Work OS supports a local-only Todoist adapter foundation for user-provided
project CSV files and backup ZIPs that have been expanded/scanned by the
desktop import boundary.

## Packaged-app pilot status

PSE-223 did **not** find a pilot operator UI/preload path for Todoist import in
the packaged app. Treat this as a service foundation with fixture/unit coverage,
not as a packaged operator-ready importer, until a focused UI/dialog ticket adds
and reviews that flow.

## Scope

- Detect a single project CSV versus a backup-style source containing one or
  more project CSV files.
- Preview projects, sections, tasks, subtasks, comments, due date text, labels,
  priorities, and inert attachment-link metadata.
- Import tasks through the existing task, tag, search, relationship, project,
  item, and activity-log services.
- Warn that Todoist exports/backups can omit completed tasks and archived
  projects.

## Out of scope

- Todoist API access, account login, cloud sync, backup download, or telemetry.
- Downloading remote attachment links. Links from comments/export fields are
  preserved as task-body metadata only.
- Reconstructing every Todoist behavior such as recurring-date semantics from
  free-text due strings.

## Write flow

```text
validate local source entries
  -> parse Todoist CSV rows
  -> preview warnings and row actions
  -> create project/section heading/task rows
  -> add labels as tags
  -> create subtask/section relationships
  -> write task/search/activity records via existing services
  -> write todoist_import_completed activity event
```

## Fidelity notes

- Concrete ISO/date-only due values become task due dates. Natural-language or
  recurring due text is preserved in the task body with a preview warning.
- Todoist sections are imported as heading items and related tasks are linked to
  the heading.
- Parent/subtask structure is preserved with `belongs_to` relationships when an
  export provides parent identifiers, parent titles, or indentation.
