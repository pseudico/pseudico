# Primary Operator Fit Review

Date: 2026-05-16
Purpose: corrected recursive review after PSE-206 through PSE-211/PSE-212 evidence.
Correction: this review does **not** use "nontechnical" as the core standard. The real standard is whether the app serves its **primary working operator**: the person using Pseudico to organise projects, contacts, tasks, notes, files, links, plans, and local recovery during real work.

## Why this document exists

The previous recursive review was too weak. It mostly restated the user's concern without proving it from the product's own mission or the visual evidence. It also leaned on the word "nontechnical", which is the wrong frame. The issue is not that the user cannot understand technical concepts. The issue is that the product is supposed to be a **work operating system**, not an admin console, and the visible app currently gives too much priority to implementation/admin/recovery surfaces.

A competent primary operator should not have to mentally filter out JSON imports, IMAP adapters, schema/search-index health, maintenance jobs, orphan quarantine, and raw filesystem paths just to do normal project work.

## Product standard used for this review

The product spec defines Local Work OS as:

> A desktop app that lets a person organise their active work, clients, projects, tasks, notes, files, links, and plans inside one local database.

It also gives the intended loop:

```text
Capture quickly
  -> organise by project/contact/inbox
  -> connect related things
  -> plan the day
  -> review timelines/dashboards
  -> find anything instantly
  -> keep files and notes beside the work they belong to
```

That is the correct evaluation frame. The primary question is:

> When the working operator opens the app, does the screen help them do that loop clearly, comfortably, and confidently?

The current answer is: **partly, but not yet well enough.**

## Evidence basis

Reviewed local evidence:

- `docs/PRODUCT_SPEC.md`
- `docs/OPERATOR_READINESS_REPORT.md`
- `docs/manual-qa/PSE-206-packaged-operator-journey.md`
- `docs/manual-qa/PSE-207-packaged-backup-restore.md`
- `docs/manual-qa/PSE-208-no-network-monitor.md`
- `docs/manual-qa/PSE-209-packaged-ui-performance.md`
- PSE-206 screenshots, especially:
  - `01-welcome.png`
  - `05-category-created-settings.png`
  - `06-project-content-created.png`
- PSE-209 screenshots, especially:
  - `02-10000-today.png`
  - `02-10000-dashboard.png`

## Core finding

Pseudico now has substantial working functionality, but the visual product is not yet organised around the primary operator's work loop.

The UI often says:

> Here are many capabilities the system has.

It needs to say:

> Here is your work, here is what matters now, here is the safe next action.

That is a different design problem from "is it nontechnical enough?" It is about product fit and information architecture.

## Product-loop assessment

| Product loop step | What exists now | What is wrong for the primary operator | Severity |
| --- | --- | --- | --- |
| Capture quickly | Quick Start exists; tasks/notes/lists/links can be created. | The surrounding UI is noisy; Quick Start is one large generic action rather than a visibly work-contextual capture system. On project pages, creation controls are pushed below substantial metadata/admin surfaces. | P1 |
| Organise by project/contact/inbox | Projects, contacts, inbox, tags/categories exist. | Project/contact screens do not foreground the living work container clearly enough. Project detail is dominated by banners, tabs, metadata, relationship controls, tab previews, and action chrome before the core work feed. | P1 |
| Connect related things | Relationship controls exist. | The UI does not make successful relationships visually obvious enough. PSE-206 exercised relationship controls but final summary still had a relationship caveat. If the operator cannot see what is connected, the graph model is not paying off. | P1/P2 |
| Plan the day | Today exists and performs. | Today reads like a planner module/technical feature rather than a calm daily operating surface. Inputs and results need stronger visual scale and more guidance around the actual daily decision: what must I do now/next/tomorrow? | P1 |
| Review timelines/dashboards | Dashboard/timeline/calendar exist and load. | Dashboard cards carry many inline controls and toasts can cover content. The dashboard should summarize, not feel like a dense alternate task editor. | P2 |
| Find anything instantly | Search service works; PSE evidence verifies API results. | Visual search result confidence is weak. Prior caveats show search can be proven through APIs while visible result behavior remains less convincing. This fails the operator standard because search is a core trust surface. | P1/P2 |
| Keep files/notes beside work | Notes/files/links appear in project feed. | Feed cards are dense, repeated, and visually small. The operator can store information, but scanning it is more work than it should be. | P1 |
| Recover local work | Backup restore works with caveats. | Recovery UI still uses raw path fields and sits among JSON/import/export/maintenance controls. A primary operator needs a safe recovery path, not an admin settings wall. | P1 |

## Screen-level analysis

### Welcome / workspace screen

Evidence: PSE-206 `01-welcome.png`.

What works:

- The app states local-only desktop workspace.
- Create workspace, create demo workspace, and open workspace exist.
- Recent workspaces are available.

Why it misses the primary operator standard:

- The screen is visually weighted toward a form plus recent workspace list, not toward the three human intents: **start**, **continue**, **recover**.
- Recent QA workspaces dominate. In real use, a long recent list can become noise unless it is curated, searchable, or can be cleaned up.
- The system-health panel is technically reassuring but not central to the user's first decision.
- Restore guidance is present as text but not a first-class recovery action.

Operator implication:

The app opens as a shell/database tool more than a work OS. It should invite the operator into their work, not into workspace administration.

### Project detail screen

Evidence: PSE-206 `06-project-content-created.png`.

What works:

- Project page exists.
- Mixed content exists: tasks, notes, lists, links.
- Related contacts/content controls exist.
- Activity and tab previews exist.
- Content feed creation controls exist.

Why it misses the primary operator standard:

- The first screen does not establish a strong work hierarchy. The operator sees banner, print/export/display controls, metadata cards, relationship forms, recent activity, tab controls, tab previews, project metrics, then eventually content creation/feed.
- The project title wraps awkwardly and uses a lot of vertical space.
- Important everyday work is visually equivalent to secondary configuration features.
- Related content looks like a form rather than a relationship graph or clear state.
- The content feed is too far down and too card-heavy for rapid scanning.

Operator implication:

A project page should answer immediately:

1. What is this project?
2. What needs attention?
3. What notes/files/tasks are here?
4. What should I do next?

The current page answers:

1. This system has many project features.
2. Here are many controls.

That is not the same thing.

### Settings screen

Evidence: PSE-206 `05-category-created-settings.png`.

This is the clearest mismatch.

What works:

- Appearance controls exist.
- Privacy/network controls exist.
- Backup, export, import, diagnostics, maintenance, categories exist.
- Local-only boundary is stated.

Why it misses the primary operator standard:

- The screen puts operator settings, developer/admin diagnostics, data recovery, import/export tooling, privacy toggles, keyboard shortcuts, categories, and local IMAP notes into one long scroll.
- Big buttons like `Export JSON`, `Validate JSON import`, `Import EML/Maildir to Inbox`, `Run maintenance`, `Quarantine orphans`, and `Restore export to new workspace` appear as peers to normal settings.
- The primary operator should not be asked to interpret JSON, EML/Maildir, IMAP adapter, schema version, search index, orphan attachments, or SQLite maintenance unless they deliberately open an Advanced/Recovery area.
- Raw path fields remain prominent.

Operator implication:

This is not merely "too technical for nontechnical users." It is a product-priority error. Admin/recovery/import machinery is visually competing with everyday work and safety-critical backup/restore.

### Today and Dashboard at scale

Evidence: PSE-209 `02-10000-today.png`, `02-10000-dashboard.png`.

What works:

- They load and remain responsive.
- Today and dashboard show useful planning summaries.
- Backup/export/search maintenance completion toasts give feedback.

Why they miss the primary operator standard:

- Toasts stack over the work area and obscure content.
- Dashboard cards include many inline rescheduling controls, making a review surface feel like a dense editing surface.
- Today uses language like "Keyboard planner" and displays feature mechanics. The primary operator needs the visual question: what am I doing today?
- Sidebar active state appears inconsistent in screenshots, which undermines spatial orientation.

Operator implication:

The app performs, but visual performance is not the same as work clarity.

## Corrected severity model

The issue should not be phrased as "nontechnical operator readiness" only. A technically competent user can still reject a tool if it makes the wrong things prominent.

Use this model instead:

| Severity | Meaning in primary-operator UX |
| --- | --- |
| P0 | Operator can lose data, cannot complete core work, or is likely to take unsafe action. |
| P1 | Core work loop is visually obstructed, confusing, too small, or dominated by non-work controls. Blocks confident handoff. |
| P2 | Workflow is possible but requires avoidable explanation, memory, or extra clicks. |
| P3 | Polish, copy, layout, or preference issue that does not block the work loop. |

## Corrected risk register

| ID | Severity | Finding | Why it blocks product fit |
| --- | --- | --- | --- |
| HUX-R1 | P1 | Settings is an admin/tooling wall. | Primary operator sees import/export/maintenance/diagnostics as first-class settings instead of rare recovery/advanced tools. |
| HUX-R2 | P1 | Project page does not prioritize the work loop. | Mixed content exists but is visually subordinated to project chrome, metadata, tabs, and controls. |
| HUX-R3 | P1 | Text boxes/results/cards are too small or dense for comfortable real use. | Owner explicitly identified this; it directly affects daily usability. |
| HUX-R4 | P1 | Backup/restore path still relies too much on raw filesystem/path thinking. | Local-only trust depends on recovery being safe and obvious. |
| HUX-R5 | P1/P2 | Search is not yet visually trustworthy enough. | Local search is core; API proof is insufficient if the operator cannot see results clearly. |
| HUX-R6 | P2 | Relationship/tag affordances are present but not obvious or confirmatory. | The app's object-graph promise depends on relationships feeling real and visible. |
| HUX-R7 | P2 | Toast/status feedback can obscure the work. | Feedback should confirm actions without covering the operator's task. |
| HUX-R8 | P2 | Navigation/orientation may be inconsistent. | Sidebar state must match the actual page to maintain operator confidence. |

## What should change in the next phase

### Design principle 1: Work first, admin second

Default screens should prioritize work objects and next actions. Admin, import/export, diagnostics, maintenance, and advanced recovery should be available but visually secondary.

### Design principle 2: Backup/restore is not "admin"

Backup/restore is safety-critical for local-only trust. It should be prominent, but not mixed with JSON/import/developer tooling. It deserves its own guided recovery flow.

### Design principle 3: Bigger, calmer, fewer controls

The owner has identified text boxes/results as too small. This is not minor polish. For a work OS, readability and scan speed are core functionality.

### Design principle 4: Visual confirmation over hidden proof

If something is related, saved, restored, searched, or backed up, the operator should see a clear, human-readable confirmation in context.

### Design principle 5: Advanced features need progressive disclosure

JSON, EML/Maildir, IMAP, maintenance, orphan quarantine, schema/search-index, and portable bundles should sit behind Advanced/Import/Developer-style disclosure, not compete with everyday work.

## Revised next tickets

### PSE-213: Primary operator workflow audit and visual baseline

Goal: create a screen-by-screen baseline of how the product supports or obstructs the core work loop.

Required output:

- `docs/PRIMARY_OPERATOR_WORKFLOW_AUDIT.md`
- Screenshots for Welcome, Project, Contact, Today, Search, Dashboard, Settings, Backup/Restore.
- Score each screen against: work hierarchy, readability, safe next action, visual confirmation, advanced-tool containment.

Acceptance:

- The audit explains what the primary operator is trying to do on each screen.
- It does not pass a screen just because an API/button exists.

### PSE-214: Settings IA split around operator intent

Goal: stop presenting Settings as a technical catch-all.

Required changes:

- Split into: Appearance, Backup & Restore, Privacy, Imports, Advanced Maintenance.
- Move JSON, EML/Maildir, IMAP, orphan quarantine, schema/index/diagnostics behind clear advanced sections.
- Make Backup & Restore a guided operator-safe area.
- Use human labels before technical labels.

Acceptance:

- A primary operator can find backup/restore without seeing JSON/import/admin tooling first.
- Advanced tools remain accessible but visually demoted.

### PSE-215: Readability and control sizing pass

Goal: make the default app comfortable to read and operate.

Required changes:

- Increase default input heights/widths and result/card readability.
- Revisit default font size/density; owner preference should bias larger.
- Improve line-height, spacing, and content previews.
- Test at common desktop sizes.

Acceptance:

- Owner signs off that text boxes and result displays are large enough.
- Screenshots show visibly larger entry fields and result cards.

### PSE-216: Project page work-first redesign

Goal: make projects feel like living work containers, not configuration dashboards.

Required changes:

- First viewport prioritizes title, status, next task, notes/files/tasks, and recent activity.
- Move print/export/display/tab management to secondary controls.
- Make relationships visually confirm state after linking.
- Bring content feed higher and reduce repeated card chrome.

Acceptance:

- A user can identify project state and next action without scrolling through admin/meta controls.

### PSE-217: Search visual trust pass

Goal: make search visibly reliable.

Required changes:

- Enter/click search reliably updates visible results.
- Larger result cards grouped by type.
- Match highlighting.
- Clear empty/loading/error states.

Acceptance:

- Search can be verified through screenshots, not just API evidence.

### PSE-218: Backup/restore guided recovery flow

Goal: make local recovery safe and operator-centered.

Required changes:

- Folder picker for restore target.
- Explain source workspace vs restored workspace.
- Preview backup contents and destination before restore.
- Success screen with Open restored workspace and Show backup folder.
- Move JSON export restore behind Advanced unless it is a supported user path.

Acceptance:

- Operator does not manually type recovery paths for normal restore.

### PSE-219: Feedback, toasts, and navigation orientation polish

Goal: keep the operator oriented.

Required changes:

- Sidebar active state always matches route/page.
- Toasts limited and non-obstructive.
- Background job completion visible in a persistent activity/status area.

Acceptance:

- Feedback confirms actions without covering core content.

## Recommended order

1. PSE-213 audit first if the team wants a stronger baseline before fixes.
2. PSE-214 Settings IA split, because Settings currently most clearly violates the work-first product model.
3. PSE-215 readability/control sizing, because the owner has directly identified this as a usability gap.
4. PSE-216 project page work-first redesign, because projects are the central product surface.
5. PSE-218 guided backup/restore, because local recovery is trust-critical.
6. PSE-217 search visual trust.
7. PSE-219 feedback/navigation polish.

## Bottom line

The app is no longer failing mainly because core features are absent. It is failing the next level because the visible product is not yet shaped around the primary operator's real work.

The correct next work is not generic polish. It is a focused product-fit pass:

- make work surfaces lead with work,
- make admin surfaces secondary,
- make text/results bigger and calmer,
- make recovery guided,
- make relationships/search visibly trustworthy.
