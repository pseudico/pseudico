# PSE-254 — Project tag header display evidence

- Route/workflow: packaged app `#/projects/container_mpg4xp68_0703fc0zpbr`, project header metadata.
- Operator intent: know the project tags or clearly see there are no tags; never see production placeholder copy.
- Before: project metadata displayed `TAGS Placeholder`.
- Change: project detail loads project tag browser data and renders `@slug` badges in the production work-first project header and advanced metadata area, or `No project tags assigned` when empty.
- Realistic tags: `@house`, `@renovation`, `@qa-walkthrough`, `@strata`, `@balcony`, `@approval`, `@budget-risk`.
- Evidence: `docs/manual-qa/screenshots/PSE-254-project-tag-header-display/project-tags-no-placeholder.png`; `docs/manual-qa/screenshots/PSE-254-project-tag-header-display/project-tags-real-tags.png`.
- Tests: `apps/desktop/tests/renderer/projectsPage.test.tsx` asserts rendered tag text and absence of `Placeholder`.
- Status: pass for placeholder removal and real tag display on project detail load.
