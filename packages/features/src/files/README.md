# Files Module

Purpose: own local attachment item behavior and safe attachment metadata
workflows.

Owns:

- File item and attachment application operations.
- Attachment metadata contracts.
- Missing-file and attachment-integrity behavior at the feature layer.

Does not own:

- Direct renderer filesystem access.
- Arbitrary path reads or writes.
- Backup implementation, though it supplies attachment data to backups.

Likely service methods later:

- `attachFile`
- `listAttachments`
- `getAttachmentMetadata`
- `markAttachmentMissing`
- `createAttachmentVersion`

Integration points:

- Electron main/preload IPC for safe local file operations.
- Workspace attachment storage conventions.
- Search, backup, export, projects, and contacts.
