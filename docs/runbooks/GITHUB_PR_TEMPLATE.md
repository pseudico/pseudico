# GitHub Pull Request Template

Copy this to `.github/pull_request_template.md`.

```md
## Summary

Briefly describe what changed.

## Linear issue

Closes: LWO-___

## Strategic source documents

- docs/PRODUCT_SPEC.md:
- docs/OPERATING_PLAN.md:
- docs/tickets/MASTER_TICKET_INVENTORY.md:
- Relevant ticket pack:

## Scope

What is included in this PR?

- 
- 

## Out of scope

What is intentionally not included?

- 
- 

## Implementation notes

Key design choices, architecture notes, or tradeoffs:

## Data model / migration impact

- [ ] No schema change
- [ ] Schema change included
- [ ] Migration included
- [ ] Migration tested/verified
- [ ] Activity log impact handled
- [ ] Search index impact handled

## Tests

- [ ] Unit tests added/updated
- [ ] Repository/database tests added/updated
- [ ] Component tests added/updated where relevant
- [ ] E2E/smoke test added/updated where relevant
- [ ] Manual QA completed where relevant

Commands run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Manual QA

Steps performed:

1. 
2. 
3. 

## Risk checklist

- [ ] No cloud dependency added
- [ ] No mobile/team/public-sharing scope added
- [ ] No direct DB access from React components
- [ ] No direct filesystem access from renderer
- [ ] Data-changing operations create activity log entries
- [ ] Search index updated where relevant
- [ ] Migrations are safe and tested/verified
- [ ] Local file paths are workspace-relative where relevant
- [ ] No proprietary branding/assets/UI copied from reference products

## Screenshots / recordings

Add if UI changed.

## Known limitations / follow-up tickets

- 
```
