# Notes Module

Purpose: own Markdown note application operations and note search projections.

Owns:

- Note create/update behavior.
- Markdown content handling at the feature boundary.
- Note previews and searchable projections.

Does not own:

- Rich text editor internals.
- File attachments or external document storage.
- Raw search index implementation.

Likely service methods later:

- `createNote`
- `updateNoteContent`
- `getNotePreview`
- `listNotesForContainer`

Integration points:

- Projects, contacts, and Inbox as note contexts.
- Search for content indexing.
- Metadata, saved views, and dashboard widgets.
