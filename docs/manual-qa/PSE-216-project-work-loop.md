# PSE-216 Project Detail Work-Loop Manual QA Evidence

Linked issue: PSE-216 — PSE-HUX-004: Redesign project detail around the primary work loop
Date: 2026-05-17

## Evidence method

Captured final project-detail states using the renderer stylesheet and the same
ProjectDetailPage class structure introduced by the implementation. The evidence
uses representative local project content to review the first-viewport hierarchy
without changing database, service, IPC, or packaged workspace behavior.

## Screenshots

- Empty/new project: `docs/manual-qa/screenshots/PSE-216-2026-05-17T08-10-00/01-empty-new-project.png`
- Project with note/task/list/file/link: `docs/manual-qa/screenshots/PSE-216-2026-05-17T08-10-00/02-project-with-mixed-content.png`
- Project with linked contact: `docs/manual-qa/screenshots/PSE-216-2026-05-17T08-10-00/03-project-linked-contact.png`
- Advanced/customize controls opened: `docs/manual-qa/screenshots/PSE-216-2026-05-17T08-10-00/04-advanced-customize-open.png`

## Operator UX review

| State | Operator is trying to | Visually dominant | Secondary / advanced | Safe next action obvious? | Result |
|---|---|---|---|---|---|
| Empty/new project | Understand the project and add the first real next action. | Project title, status strip, Add work, next-work summary, empty content feed. | Banner/export/display/tabs remain hidden in Advanced project options. | Yes: Add work and content feed are above advanced controls. | Pass. |
| Mixed content project | Review active project work and scan notes/tasks/lists/files/links. | Next task, task load, content count, linked context, then content feed. | Print/export/display/banner/tabs/graph/activity are available after the feed. | Yes: Quick Start, inline task entry, note/link/file actions are visible. | Pass. |
| Linked contact | Verify relationship state and use the contact as project context. | Linked context section with the related contact before the content feed. | Relationship add controls are present but not the first-page focus. | Yes: linked contact confirmation is visible without opening an inspector. | Pass. |
| Advanced open | Find lower-frequency project controls deliberately. | Advanced disclosure label and grouped advanced panels. | Banner, export, display, tabs, graph, activity, and health detail. | Yes: advanced tools are reachable but no longer dominate first viewport. | Pass. |

## Acceptance review

- Opening a project now surfaces project state, next work, content volume, recent activity, and linked contact count before lower-frequency controls.
- Print/export/display/banner/tab management is contained in `Advanced project options`.
- The content feed remains the primary work surface and keeps task, note, link, list, location, and file creation controls reachable.
- Linked contacts remain visible in a dedicated `Linked context` section.
- No domain model, persistence, search, filesystem, or Electron security behavior changed.

## Risks / follow-ups

- P2: screenshot evidence is a renderer visual harness with final CSS/class structure rather than a packaged seeded workspace. A packaged project journey subset remains a useful PSE-220 regression check.
- P2: relationship persistence caveat from PSE-206 is not changed by this UI-only ticket; this ticket makes visible relationship state clearer when related contact data is present.
- P3: future contact-detail parity remains outside PSE-216 unless picked up by PSE-220 follow-up.
