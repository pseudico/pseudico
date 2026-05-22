# PSE-249 â€” Contact detail route fix evidence

- Route/workflow: packaged app `#/contacts/container_mpg4y33y_0icdh4olyn8`, `#/projects/container_mpg4xp68_0703fc0zpbr`, and `/contacts` list routing.
- Operator intent: open a linked renovation contact (`DJ DeRiu`) from project relationship context or direct route without losing object identity.
- Before: the direct linked-contact route rendered `Contact not found` although the contact row existed and was active in the workspace database.
- Change: related contact cards expose an `Open contact` action, contact search destinations now route to `/contacts/:contactId`, relationship cards separate object names from status badges, linked projects expose `Open project`, and the contact header uses an intentional `No contact tags assigned` empty state instead of placeholder copy.
- Evidence: `docs/manual-qa/screenshots/PSE-249-contact-detail-route-fix/contact-direct-dj-deriu.png`; `docs/manual-qa/screenshots/PSE-249-contact-detail-route-fix/project-relationship-open-contact.png`; `docs/manual-qa/screenshots/PSE-249-contact-detail-route-fix/contact-direct-card-polished.png`; `docs/manual-qa/screenshots/PSE-249-contact-detail-route-fix/project-relationship-card-polished.png`.
- Tests: `packages/ui/tests/contactComponents.test.tsx`; `packages/features/tests/searchService.test.ts`; `pnpm typecheck`; `pnpm lint`.
- Status: pass for implemented route/link/search destination behavior; true missing/deleted not-found behavior remains covered by existing detail fallback tests.
