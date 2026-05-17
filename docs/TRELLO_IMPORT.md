# Trello JSON Board Import

Local Work OS supports a local-only Trello adapter foundation for
user-provided board JSON exports and optional raw attachment files that have
already been expanded/scanned by the desktop import boundary.

## Packaged-app pilot status

PSE-223 did **not** find a pilot operator UI/preload path for Trello import in
the packaged app. Treat this as a service foundation with fixture/unit coverage,
not as a packaged operator-ready importer, until a focused UI/dialog ticket adds
and reviews that flow.

## Scope

- Preview one Trello board JSON file at a time.
- Map the board to a project, Trello lists to local list items, cards to local
  tasks, checklists/check items to nested list rows, comments to local item
  comments, labels to tags, and concrete due dates to task/list-row dates.
- Match optional raw attachment ZIP files by Trello attachment ID or filename
  and attach already-copied local files to the imported card task.
- Report archived lists/cards, unsupported action-history entries, inert remote
  attachment URLs, unmatched raw files, and unsupported files before import.

## Out of scope

- Trello API access, account login, cloud sync, remote attachment fetching, or
  telemetry.
- Recreating exact Trello action history, board power-ups, automations,
  members, permissions, or visual board layout.
- Downloading attachment URLs. Remote URLs from the JSON are preserved as
  metadata only unless a future explicitly-approved local fetch workflow exists.

## Write flow

```text
validate local source entries
  -> parse Trello board JSON
  -> preview warnings and row actions
  -> create project/list/task/list-row/comment/attachment records
  -> add labels as tags
  -> create card-to-list-row relationships
  -> write search/activity records via existing services
  -> write trello_import_completed activity event
```

## Fidelity notes

- Archived cards/lists are skipped by default. The adapter also supports an
  `import_archived` option that imports them and archives local task/list items.
- Trello checklists are nested under the corresponding card row inside the
  imported local list so the checklist hierarchy remains visible locally.
- Unsupported action history is reported but not converted into editable local
  objects.
