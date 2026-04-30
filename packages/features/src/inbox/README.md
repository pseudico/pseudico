# Inbox Module

Purpose: own quick capture and triage flows before work is filed into a project,
contact, or other container.

Owns:

- Inbox capture and triage application operations.
- Movement from Inbox into other containers.
- Inbox-specific projections and empty states.

Does not own:

- Project/contact container persistence.
- Task, note, file, or link internals.
- Search index implementation.

Likely service methods later:

- `captureToInbox`
- `listInboxItems`
- `moveInboxItem`
- `dismissInboxItem`

Integration points:

- Tasks, notes, files, links, and metadata.
- Activity log and search updates through the standard write flow.
- Today and dashboard projections.
