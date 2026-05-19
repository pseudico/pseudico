# PSE-245 Secondary route operator frame migration

## Summary

Secondary and maintenance routes now share the operator frame contract through direct primitives (Help, Workflows) and shared CSS normalization for existing production pages. Inbox, Project Tags, Contact Labels, Tags/Categories, Templates, Help, Settings, Trash, Workflows, and Dashboard all have visible purpose, bounded content regions, a safe primary action or explicit empty state, and 1440x1000 + 1280x800 evidence.

## Scoped route status

| Route | Status | Evidence |
| --- | --- | --- |
| `/inbox` | pass | `docs/manual-qa/screenshots/PSE-245-secondary-route-operator-frame-migration/inbox-1440x1000.png` |
| `/project-tags` | pass | `docs/manual-qa/screenshots/PSE-245-secondary-route-operator-frame-migration/project-tags-1440x1000.png` |
| `/contact-labels` | pass | `docs/manual-qa/screenshots/PSE-245-secondary-route-operator-frame-migration/contact-labels-1440x1000.png` |
| `/tags-categories` | pass | `docs/manual-qa/screenshots/PSE-245-secondary-route-operator-frame-migration/tags-categories-1440x1000.png` |
| `/templates` | pass | `docs/manual-qa/screenshots/PSE-245-secondary-route-operator-frame-migration/templates-1440x1000.png` |
| `/help` | pass | `docs/manual-qa/screenshots/PSE-245-secondary-route-operator-frame-migration/help-1440x1000.png` |
| `/settings` | pass | `docs/manual-qa/screenshots/PSE-245-secondary-route-operator-frame-migration/settings-1440x1000.png` |
| `/trash` | pass | `docs/manual-qa/screenshots/PSE-245-secondary-route-operator-frame-migration/trash-1440x1000.png` |
| `/workflows` | pass | `docs/manual-qa/screenshots/PSE-245-secondary-route-operator-frame-migration/workflows-1440x1000.png` |
| `/dashboard` | pass | `docs/manual-qa/screenshots/PSE-245-secondary-route-operator-frame-migration/dashboard-1440x1000.png` |

## Risks

- P0/P1/P2: none known.
- P3: Project Tags / Contact Labels alphabet index is compact by design; can be polished later if human review wants larger jump targets.
