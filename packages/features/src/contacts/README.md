# Contacts Module

Purpose: own contact/client container behavior and local CRM-style context.

Owns:

- Contact container application operations.
- Contact profile and interaction-history projections.
- Relationships between contacts, projects, and work items.

Does not own:

- General project lifecycle behavior.
- Raw database repositories.
- Hosted CRM, account sync, or team functionality.

Likely service methods later:

- `createContact`
- `updateContact`
- `listContactItems`
- `linkContactToProject`
- `getContactSummary`

Integration points:

- Projects and relationship services.
- Metadata, search, dashboard, and saved views.
- Files, notes, links, and tasks for interaction history.
