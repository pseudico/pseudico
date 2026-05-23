# PSE-255 — Contact detail route fix evidence

Status: PASS by automated regression on `2026-05-23`; packaged screenshot recapture remains recommended before final release handoff.

## Operator-facing problem

A valid linked contact returned by `contacts.get` could render `/contacts/:contactId` as `Contact not found`, blocking relationship navigation from contacts, projects, search, and recent targets.

## Change / reconciliation

- Reconciled against prior PSE-249/PSE-244 route work on current `main`; the route implementation already consumes `ContactDetailSummary` correctly.
- Added a renderer regression that mounts production `/contacts/:contactId` and asserts a valid contact detail route renders contact identity, fields, and related project context rather than the not-found state.
- Missing/deleted contacts still resolve to the existing not-found branch because `contact === null` is unchanged.

## Evidence

- `apps/desktop/tests/renderer/projectsPage.test.tsx` contact-detail route regression — PASS in targeted and root suites.
- Existing hard-failure screenshots remain under the complete-examination evidence set in the original QA workspace; no new packaged screenshots were captured in this automated pass.

## Risks / follow-up

- P2: capture final 1440x1000 and 1280x800 packaged-app screenshots against the complete-examination workspace before release sign-off.
