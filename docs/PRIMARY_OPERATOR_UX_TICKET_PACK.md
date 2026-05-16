# Primary Operator UX Ticket Pack


## Self-critique amendment: full program order and closing gate

The first version of this ticket pack was not sufficient as a full program because it gave a fastest partial path without clearly separating it from the complete path. The complete Primary Operator UX sequence is:

1. PSE-213 — Primary operator workflow audit and visual baseline.
2. PSE-214 — Settings IA split around operator intent.
3. PSE-215 — Readability and control sizing pass.
4. PSE-216 — Project detail work-first redesign.
5. PSE-218 — Backup/restore guided recovery flow.
6. PSE-217 — Search visual trust pass.
7. PSE-219 — Feedback, toasts, and navigation orientation polish.
8. PSE-220 recommended — Primary operator UX acceptance and regression review.

The abbreviated path `PSE-214 -> PSE-215 -> PSE-216 -> PSE-218` is only a fastest partial improvement path, not the full processing order.

Each ticket must be judged against the PRODUCT_SPEC work loop, not only against local component functionality. Screenshot/manual evidence is required because API/route success is insufficient for visual/product-fit claims.
Date: 2026-05-16
Source review: `docs/PRIMARY_OPERATOR_FIT_REVIEW.md`
Purpose: convert the corrected primary-operator review into implementation-ready tickets.

These tickets are not generic polish. They are a product-fit pass after core operator-readiness evidence. The goal is to make Pseudico serve its primary working operator: someone using it daily to capture, organise, connect, plan, review, search, and recover local work.

## Shared standard for all tickets

Before starting any ticket, read:

- `AGENTS.md`
- `docs/PRODUCT_SPEC.md`
- `docs/PRIMARY_OPERATOR_FIT_REVIEW.md`
- `docs/OPERATOR_READINESS_REPORT.md`
- relevant screenshots under `docs/manual-qa/screenshots/`

General rules:

- Do not add cloud, account, telemetry, sync, hosted service, or remote dependency behavior.
- Do not remove existing functionality solely to simplify the UI; move lower-frequency controls behind clearer IA/progressive disclosure.
- Keep data-changing operations on existing service/write-flow rules.
- React must not access SQLite or filesystem directly.
- Filesystem operations remain main/preload IPC.
- Every ticket must include visual/manual evidence, not only unit tests.
- Every ticket must explicitly answer: how does this improve the primary operator's daily work loop?

Shared QA surfaces:

- Welcome / workspace open
- Project detail
- Contact detail if touched
- Today
- Dashboard
- Search
- Settings
- Backup/restore

Shared validation:

- `pnpm lint`
- `pnpm typecheck`
- targeted tests for changed renderer/components/services
- package smoke or packaged visual check when shell/settings/project flows change materially

---

# PSE-213: Primary operator workflow audit and visual baseline

## User problem

The product has many working modules, but there is no disciplined visual baseline showing whether the screens support the actual primary work loop. Prior readiness evidence often proves that buttons/routes/APIs work; it does not consistently judge whether the visible interface makes work clear.

## Goal

Create a repeatable visual audit framework that evaluates screens against the primary operator loop:

1. capture quickly
2. organise by project/contact/inbox
3. connect related things
4. plan today
5. review dashboard/timeline/calendar
6. search and recover anything
7. keep files/notes beside work
8. recover local data safely

## Scope

Create a document and screenshot checklist, not a UI redesign yet.

Add:

- `docs/PRIMARY_OPERATOR_WORKFLOW_AUDIT.md`
- optionally `docs/manual-qa/visual-baseline/` screenshots if new screenshots are captured

The audit must inspect at least:

- Welcome / workspace screen
- Project detail
- Contact detail
- Today
- Dashboard
- Search
- Settings overview
- Backup/restore area

For each screen, score 1-5:

- primary operator goal clarity
- visual hierarchy
- readability / sizing
- safe next action
- work-first vs admin-first balance
- visible confirmation after action
- advanced-tool containment

## Implementation expectations

No product code changes unless needed to add stable screenshot hooks/test IDs. If test IDs are added, keep them semantic and unobtrusive.

## Out of scope

- Do not redesign screens in this ticket.
- Do not create broad new UX systems.
- Do not update final readiness verdict.

## Acceptance criteria

- Audit explains what the operator is trying to do on each screen.
- Audit identifies concrete blockers and evidence screenshots.
- Audit does not pass a screen solely because a route or API exists.
- Produces a prioritized follow-up list mapped to PSE-214 through PSE-219.

## Validation

- `pnpm lint` and `pnpm typecheck` if files/code changed.
- If only docs changed, run at least lint if repo markdown/docs are linted by ESLint; otherwise record docs-only.

---

# PSE-214: Settings IA split around operator intent

## User problem

Settings currently behaves like a long technical/admin wall. It mixes appearance, privacy, backup, exports, imports, diagnostics, maintenance, categories, keyboard shortcuts, JSON import, EML/Maildir, IMAP, orphan quarantine, and schema/search-index concepts in one scroll.

The primary operator should not see JSON/import/maintenance/admin features as peers to everyday settings. This makes the tool feel like a developer console rather than a work OS.

## Goal

Reorganize Settings around operator intent and progressive disclosure.

The operator should immediately understand:

- how to change appearance/readability
- how to back up and restore work
- what privacy/local-only settings mean
- where advanced import/export/maintenance tools live, without those tools dominating the page

## Proposed IA

Settings should become sectioned navigation or clear panels:

1. **Appearance & readability**
   - theme
   - density
   - font size
   - preview of current sizing

2. **Backup & restore**
   - create backup
   - list backups
   - restore to new workspace
   - automatic backup settings
   - clear restore safety explanation

3. **Privacy & local-only**
   - telemetry/cloud sync status
   - optional network features
   - explanation of local-only boundary

4. **Imports & exports**
   - operator-facing imports first, if any
   - exports grouped by human purpose
   - JSON/export restore clearly labelled as advanced/portable data

5. **Advanced maintenance**
   - run audit
   - rebuild search index
   - run maintenance
   - quarantine orphans
   - schema/index/database language hidden here

6. **Categories / metadata**
   - if categories remain in Settings, present them as organisation settings, not technical metadata

## Implementation expectations

Likely files:

- `apps/desktop/src/renderer/pages/SettingsPage.tsx`
- settings-related components if extracted
- renderer tests for Settings if existing
- help/runbook/docs if labels change

Requirements:

- Preserve existing functionality.
- Move rare/dangerous/technical controls behind Advanced or dedicated sections.
- Add plain-language descriptions:
  - "Use this to..."
  - "This will not overwrite your current workspace..."
  - "Advanced: use only when troubleshooting or importing from another app."
- Make Backup & Restore visually distinct and easier to find.
- Avoid big primary buttons for JSON/import/admin tools on the default Settings landing view.

## Out of scope

- Do not implement new backup architecture.
- Do not implement new import formats.
- Do not remove advanced tools.
- Do not change database/service behavior unless UI labels expose a bug.

## Acceptance criteria

- Default Settings view no longer presents JSON import/export, IMAP, EML/Maildir, orphan quarantine, or database/search-index diagnostics as first-class everyday controls.
- Backup & Restore is easy to identify from the Settings page.
- Advanced Maintenance is clearly separated and labelled.
- Privacy/local-only status is understandable without developer vocabulary.
- Existing Settings actions still work.
- Screenshot evidence shows before/after or final state.

## Tests / QA

- Add/update renderer tests for Settings section navigation and key buttons still present in the correct sections.
- Manual or packaged screenshot evidence:
  - Settings landing
  - Backup & Restore section
  - Imports & Exports section
  - Advanced Maintenance section
- Validate backup/create button remains reachable.
- Validate import/export controls remain reachable but demoted.

---

# PSE-215: Readability and control sizing pass

## User problem

The app is visually too dense in important places. Text boxes, result displays, item cards, and form controls are smaller than desired for real daily use. This is not cosmetic; Pseudico is a work OS, so reading, scanning, and entering information are core functions.

## Goal

Make default UI sizing more comfortable for a primary operator.

## Scope

Improve default readability across the shell and core work surfaces.

Target surfaces:

- global top search input
- Quick Start modal/forms
- project content creation inputs
- note/task/list/link cards
- search result cards
- Settings inputs/buttons
- backup/restore path fields
- Today planner inputs
- dashboard task cards

Implementation options:

- Increase default font-size token or default appearance setting.
- Increase input min-height and padding.
- Increase result/card line-height and spacing.
- Increase hit targets for primary buttons.
- Improve long-title wrapping.
- Ensure density preferences still work.

Likely files:

- renderer CSS/theme files
- `apps/desktop/src/renderer/theme/ThemeProvider.tsx`
- shared UI/card/input styles
- page-specific CSS/classes
- Appearance settings defaults if needed

## Requirements

- Bias defaults toward comfortable real use, not maximum density.
- Preserve Compact mode if already implemented.
- Add or update visual examples/screenshots for Medium/Large if appearance settings exist.
- Do not make the app unusable on smaller desktop windows.

## Out of scope

- Do not redesign page IA in this ticket unless sizing requires minor layout adjustments.
- Do not add a full design system overhaul.
- Do not change domain functionality.

## Acceptance criteria

- Owner-stated issue is addressed: text boxes and result displays are visibly larger/more comfortable.
- Core input controls meet a reasonable desktop hit target.
- Search results and item cards are easier to scan.
- Screenshots demonstrate improvement on at least:
  - Project detail
  - Search results
  - Settings
  - Today
- Existing appearance preferences still apply.

## Tests / QA

- Update appearance/theme tests if defaults change.
- Manual screenshot pack:
  - before/after if available
  - default density/font
  - large font setting if supported
- Run `pnpm lint`, `pnpm typecheck`, targeted renderer tests.

---

# PSE-216: Project page work-first redesign

## User problem

Project pages are supposed to be living work containers. Current project detail evidence shows a lot of functionality, but the first screen is overloaded with project chrome, banner, print/export/display controls, relationship forms, tab controls, tab previews, metadata, and repeated card UI.

The primary operator needs the project page to answer:

1. What is this project?
2. What needs my attention?
3. What notes/files/tasks/links are here?
4. What should I do next?

## Goal

Make the project detail page work-first.

## Scope

Reorganize project detail visual hierarchy.

Recommended structure:

1. Project header
   - title
   - status/category/tags in compact form
   - primary action: add work / quick capture to this project
   - secondary menu for print/export/display/banner/customize

2. Work summary
   - next task
   - overdue/upcoming count
   - recent activity summary
   - linked contact summary

3. Main content feed
   - notes/tasks/lists/files/links visible higher on page
   - clearer type grouping or filters
   - larger readable cards

4. Relationships
   - show existing linked contacts/content as visible chips/cards
   - relationship add form secondary to visible state

5. Advanced/customization
   - tabs, tab previews, banner, print/export/display settings behind collapsed/secondary area unless essential

Likely files:

- `apps/desktop/src/renderer/pages/ProjectDetailPage.tsx`
- project detail components/tests
- possibly shared item card components

## Requirements

- Existing project features remain available.
- Lower-frequency controls are moved behind More/Customize/Display sections.
- The first viewport prioritizes active work, not configuration.
- Relationship success must be visually obvious.
- Content creation controls should be context-specific and easy to find.

## Out of scope

- Do not redesign contacts unless shared components require minor consistency changes.
- Do not change project data model.
- Do not implement rich text.

## Acceptance criteria

- On opening a project, a primary operator can identify next work without scrolling through advanced controls.
- Print/export/display/banner/tab management no longer dominate the first viewport.
- Existing content feed supports notes/tasks/lists/files/links clearly.
- Linked contacts/content are visibly confirmed after creation.
- PSE-206 journey still passes or is updated with equivalent proof.

## Tests / QA

- Renderer tests for project detail rendering and actions.
- Manual screenshot evidence:
  - empty/new project
  - project with note/task/list/file/link
  - project with linked contact
  - project with advanced/customize controls opened
- Run relevant PSE-206-style smoke or targeted packaged journey if major layout changed.

---

# PSE-217: Search visual trust pass

## User problem

Search is a core product promise: find anything instantly. Existing evidence proves search through service/API checks, but visual search confidence remains weaker. PSE-206/PSE-207 caveats show that UI screenshots did not always clearly prove visible search results.

A primary operator must trust visible search, not just the internal search API.

## Goal

Make search visibly reliable, readable, and confidence-building.

## Scope

Improve Search page and global search behavior.

Requirements:

- Pressing Enter or clicking search should reliably show visible results.
- Query state should be obvious.
- Results should be larger and grouped by type or context.
- Matched text should be highlighted where feasible.
- Results should show enough context:
  - title
  - type
  - project/contact/container
  - snippet
  - date/status where relevant
- Empty/loading/error states should be plain-language and useful.

Likely files:

- Search page/component files
- top-bar/global search components
- search renderer tests
- maybe search result shaping if snippets need improvement

## Out of scope

- Do not rebuild the search engine.
- Do not add remote indexing.
- Do not implement advanced relevance tuning unless required for visible result quality.

## Acceptance criteria

- A manual screenshot can prove that searching for a newly created note/task/file/link visibly finds it.
- Search results are readable and grouped/contextual enough for a human to choose the right item.
- Search route/query behavior is reliable with keyboard and click flows.
- Existing search tests still pass.

## Tests / QA

- Renderer tests for query submission and result rendering.
- Manual packaged or dev screenshot evidence:
  - result for note body token
  - result for project title
  - result for contact
  - empty result
- Consider updating PSE-206 visual journey to use real visible search proof.

---

# PSE-218: Backup/restore guided recovery flow

## User problem

Backup/restore now works, but the operator experience still exposes too much raw path/admin thinking. Local-only trust depends on recovery being clear and safe. A primary operator should not need to manually copy/paste recovery paths or understand implementation formats to restore work.

## Goal

Create a guided backup/restore recovery flow for normal operators.

## Scope

Improve Backup & Restore UI.

Required behavior:

- Backup list is readable and clearly shows date/time, size/status if available, and restore action.
- Restore target uses a folder picker where possible.
- UI explains:
  - current workspace
  - backup source
  - restore destination
  - restore creates a new workspace and does not overwrite current work
- Restore preview before execution:
  - backup date
  - included database/attachments if known
  - destination folder
- Success state:
  - Open restored workspace
  - Show restored folder
  - Show backup folder
- Unsafe restore target errors remain clear.
- JSON export restore is moved behind Advanced or labelled as advanced portable data restore unless it is fully supported as an operator path.

Likely files:

- `SettingsPage.tsx` or extracted BackupRestore component from PSE-214
- preload/main IPC if folder picker integration needs improvement
- backup/restore renderer tests
- runbook updates

## Out of scope

- Do not change backup storage format unless necessary.
- Do not add cloud backup.
- Do not make restore overwrite active workspace.

## Acceptance criteria

- Operator can restore a backup without manually typing a path in the normal path.
- UI clearly communicates restore safety and destination.
- Success gives an obvious next action.
- PSE-207-style backup restore journey passes with stronger visual evidence.

## Tests / QA

- Renderer test for backup restore flow states.
- IPC test for folder picker if added/changed.
- Manual packaged restore screenshot evidence:
  - backup list
  - restore preview
  - unsafe target error
  - restore success
  - restored workspace opened

---

# PSE-219: Feedback, toasts, and navigation orientation polish

## User problem

Toasts and route/sidebar states can reduce operator confidence. PSE-209 screenshots show stacked toasts over work areas. Some screenshots appear to show sidebar active state mismatches. Feedback should confirm actions without obscuring the work or disorienting the operator.

## Goal

Make feedback and navigation support orientation rather than compete with content.

## Scope

Improve:

- sidebar active state accuracy
- toast stacking/placement/lifetime
- background job status visibility
- completion/error persistence for backup/export/search rebuild/maintenance

Requirements:

- Sidebar selected item must match current route/page.
- Toasts should be capped, grouped, or moved so they do not cover primary work.
- Long-running or important jobs should also appear in a persistent status/activity area, not only transient toast.
- Completion messages should be human-readable and link to the relevant result where possible.

Likely files:

- shell/navigation components
- toast/notification provider
- Settings job result components
- dashboard/today pages if toasts overlap content

## Out of scope

- Do not redesign every notification type.
- Do not implement OS notifications unless already scoped.
- Do not change background job services unless needed for better status shape.

## Acceptance criteria

- Route/sidebar active state is reliable across Today, Dashboard, Project Tags, Search, Settings, Projects.
- Multiple toasts do not obscure main content in common workflows.
- Backup/export/search rebuild completion remains findable after toast dismissal.
- Screenshots show improved behavior.

## Tests / QA

- Renderer tests for active nav state mapping.
- Toast provider tests if available.
- Manual screenshot evidence:
  - Today after several completions
  - Dashboard after several completions
  - Settings after backup/export/search rebuild

---

# Recommended execution order

1. **PSE-213** if you want an explicit baseline before implementation.
2. **PSE-214** first if you want immediate product improvement: Settings IA split.
3. **PSE-215** next: readability and sizing.
4. **PSE-216** next: project page work-first redesign.
5. **PSE-218** next: guided backup/restore.
6. **PSE-217** next: search visual trust.
7. **PSE-219** next: feedback/navigation polish.

Fastest meaningful path:

```text
PSE-214 -> PSE-215 -> PSE-216 -> PSE-218
```

This directly addresses the owner's strongest concerns: admin/tooling dominance, small inputs/results, and work surfaces not prioritizing actual work.
