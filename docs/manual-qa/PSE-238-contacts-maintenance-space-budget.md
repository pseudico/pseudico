# PSE-238 contacts and maintenance space-budget QA

Date: 2026-05-19
Route: `#/contact-maintenance-space-budget-fixture` from the built production renderer bundle.

## Primary operator intent

- Open a contact as a work room: identify the person/company, next follow-up, related projects, and mixed notes/tasks/files/links without chip-only context.
- Open maintenance deliberately: read backup/export/import paths, restore destinations, timestamps, warnings, and recovery actions without tiny forms.
- Confirm Workflow Lab remains visually labelled as a scaffold and does not compete with daily work.

## Evidence

- `docs/manual-qa/screenshots/PSE-238-contacts-maintenance/01-contact-maintenance-fixture-1440x1000.png`
- `docs/manual-qa/screenshots/PSE-238-contacts-maintenance/02-contact-maintenance-fixture-1280x800.png`
- `docs/manual-qa/screenshots/PSE-238-contacts-maintenance/03-contact-maintenance-fixture-full-1440x4200.png`

## Checks

- Contact header keeps the long name readable and moves actions below the title before squeezing the title.
- Contact profile/related work collapses above the feed at shell-constrained widths; the mixed feed keeps the 620px primary budget.
- File names, link domains, follow-up context, project names, and contact facts wrap as phrases rather than syllable fragments.
- Settings/backup/restore uses conventional two-column settings at wide widths and a single-column fallback at 1280px.
- Restore destination/source paths and warning/status rows wrap in large panels.
- Trash keeps recovery rows readable and separates clear/purge from restore actions.
- Workflow Lab is labelled scaffold/future and visually secondary.

## Verdict

Pass for PSE-238 space-budget evidence. No P0/P1 blockers found. P2 caveat: screenshots use a deterministic production renderer fixture rather than mutating a live workspace; live route components share the same production CSS/data attributes and targeted renderer tests cover the fixture/readability rules.

