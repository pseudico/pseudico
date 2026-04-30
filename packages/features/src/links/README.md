# Links Module

Purpose: own URL/link item behavior and locally stored link metadata.

Owns:

- Link item application operations.
- URL normalization and metadata contracts.
- Local browser-capture intake later.

Does not own:

- Hosted preview services.
- Browser extension implementation.
- General notes/files search internals.

Likely service methods later:

- `createLink`
- `updateLinkMetadata`
- `normalizeUrl`
- `listLinksForContainer`

Integration points:

- Projects, contacts, and Inbox as link contexts.
- Search and metadata modules.
- Future local browser capture bridge.
