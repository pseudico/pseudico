# Saved Views Module

Purpose: own collection and smart-list query definitions.

Owns:

- Saved query and collection application operations.
- Smart-list filter contracts and result grouping.
- Diagnostics for saved view definitions.

Does not own:

- General search index implementation.
- Dashboard widget layout.
- Metadata mutation rules.

Likely service methods later:

- `createSavedView`
- `updateSavedView`
- `evaluateSavedView`
- `listCollections`
- `validateSavedViewQuery`

Integration points:

- Search and metadata modules.
- Tasks, projects, contacts, and notes as query sources.
- Dashboard widgets and collection routes.
