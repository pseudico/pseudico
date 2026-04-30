# Calendar Module

Purpose: own month/week/day calendar projections over local dated work.

Owns:

- Calendar projections over local dated work.
- Month/week/day query contracts.
- Future local calendar import coordination.

Does not own:

- External live calendar sync.
- Task lifecycle internals.
- Timeline rendering.

Likely service methods later:

- `listCalendarEntries`
- `createTaskFromCalendarDate`
- `moveEntryToDate`
- `importLocalIcsFile`

Integration points:

- Tasks as source records.
- Timeline for date-range projections.
- Metadata filters and Today planning.
