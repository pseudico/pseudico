# Task/List Conversion Mapping

Task/list conversions are local service-layer operations. They do not add cloud
state or new persisted conversion tables.

## Mapping rules

- Task to list: create a list item record in the same container/tab, copy item
  title/body/category/pinned/sort metadata, create one list row from the task
  title/body/status/start/due/completion fields, move attachments to the new
  list item, copy tags and relationships, then soft-delete the original task.
- List item to task: create a task in the parent list's container/tab, copy row
  title/body/status/start/due fields, inherit the parent list category, copy row
  tags and relationships, then soft-delete the original list row.
- Task merge into list: create a row in the target list from the task
  title/body/status/start/due/completion fields, copy task tags and
  relationships to the new row, move task attachments to the target list item,
  then soft-delete the original task.

Every conversion writes one conversion activity event and refreshes search
records for the created target and the soft-deleted source.
