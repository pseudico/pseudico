# Pagico-informed page space budgets and Pseudico page designs

This is not a colour or skin document. It records the practical design lesson from the failed timeline screenshot: every Pseudico surface must allocate enough physical space for the information the operator is expected to read or enter. When the available space is smaller than the information expectation, the page must change pattern instead of clipping, syllable-wrapping, or pretending the text is readable.

Reference material checked:

- Pagico home: dashboards, project status, Rapid Day Planner, tag browser, offline/local computer positioning.
- Pagico 10 what's-new: smart search, three viewing modes, tabs, Quick Start Actions, pinned items, minimalist timeline, project/contact containers, maps/files/lists/links, quick snooze, smart lists, unified timeline/calendar.
- Pagico project tour: projects store tasks, notes, lists, files, tags, colours, favourites, and links to contacts/projects; tag browser supports hundreds of projects.
- Pagico tags/categories post: category/tag browsing narrows from categories/tags into results that include projects, contacts, tasks, notes, and files.
- Pagico kanban post: Projects section can show recent projects in both list and category board form; category columns are hideable/reorderable; boards exist for collections/team scopes.
- Pagico Today posts: Today planning supports Today/Tomorrow/backlog-style rescheduling, task group collapse, day-view calendar toggle, narrow-window adaptation, keyboard access, and rapid destination assignment.

Do not copy Pagico branding, icons, assets, wording, or exact visual style. Use it as a minimum functional density/reference for a local work OS.

## 1. Lessons from the timeline failure

### What actually failed

The failed timeline tried to place full task titles inside narrow date bars. A normal task title needs a readable phrase-width container; a single-day or two-day bar is a position/duration object, not a reading object. The UI therefore created syllable wrapping, vertical clipping, and partial words.

### General rule learned

```text
Information expectation determines container size.
If the container cannot meet the expectation, change the pattern.
Do not shrink text into nonsense.
Do not ellipsize primary meaning unless the same full meaning is visible nearby.
```

### New primitive rules

| Primitive | Minimum readable budget | If smaller than budget |
| --- | ---: | --- |
| Full task title | 300-420px wide, 2 lines, 38-48px text area | Put title in row/list/inspector; small object shows date/status only |
| Short task/action row | 360px wide, 44-56px high | Open compact list row, not a card |
| Rich task row with due/project/tags | 420px wide, 64-80px high | Hide secondary metadata, never title |
| Note preview | 480px wide, 3-5 lines / 72-120px | Collapse to title + first sentence + open affordance |
| File/link item | 420px wide; extension/domain visible | Use list row with metadata columns |
| Location | 480px wide x 96px high | Show address text first, map preview second |
| Timeline day column | 52-64px per day | Horizontal scroll, zoom to week/month, or switch to list |
| Timeline row label | 300-340px fixed gutter | Expand/collapse side label; do not shrink below 260px |
| Calendar event | 180px wide x 28-36px | Event dot + agenda below/side |
| Search command input | 420px minimum, ideally 560-760px | Collapse chrome, not command input |
| Text entry body | 320px x 140px minimum | Open editor/drawer |
| Inspector | 300-360px wide | Drawer/modal detail, not squeezed side pane |

## 2. Page-level budgets

Assume a desktop-first canvas of 1440x900 to 1440x1000, with a 1280x800 fallback. These are minimums for meaningful operation, not decoration.

| Pseudico page/surface | Pagico analogue | Primary operator job | Minimum useful layout budget | Design pattern for Pseudico |
| --- | --- | --- | --- | --- |
| App shell | Pagico sidebar + top toolbar + tabs | Navigate, search, quick-add, switch recent work | Sidebar 240-280px expanded or icon rail 48px + drawer; top command 520px; tabs 120-180px each | Persistent left navigation; toolbar search/command never below 420px; app tabs may truncate only after full active title visible |
| Workspace home / Dashboard | Dashboard with pinned items, synced/recent items, tasks status, timeline | See what matters now and jump into work | Pinned cards 260x72; activity rows 44; task summary 280x140; timeline strip 620x180 | Top pinned/recent work row; centre work pulse/activity; right task/contact/status panels; no giant metric cards unless actionable |
| Today planning | Today/Rapid Day Planner | Capture, reorder, reschedule Today/Tomorrow/Backlog | Today column 420px; Tomorrow/Backlog 320px each; rapid input 520x120; task row 64-80px | Keyboard-first task list; plus beside groups; drag between groups; day calendar toggle; collapse groups under pressure |
| Inbox | Collect/Inbox and quick add | Dump then triage into project/contact/context | Capture box 560x120; inbox list 520px; triage inspector 320px | Left inbox queue, middle selected item preview, right triage form; batch select allowed; no tiny destination boxes |
| Projects library | Projects section, tag browser, category board/list | Browse hundreds of projects, filter by tags/categories | Category columns 240-300px; list title col 320px; table row 40-48px | Tag/category browser above or left; results list/table below; category board optional and horizontally scrollable |
| Project detail | Project/container page with content tabs | Work inside a living container of tasks/notes/files/links/maps/lists | Header 120-170px; content pane >=620px; outline 240-300px; inspector 320-360px | Container header with status/next action; tabs; mixed feed central; inspector only if enough width; quick-start row always visible |
| Contacts library/detail | Contacts as first-class containers | Find client/person and see related tasks/files/notes/projects | Contact list 300px; detail/content 620px; relationship panel 280-340px | Treat contact like project room, not address book; communication notes and linked work central |
| Search / Collections | Smart search, smart lists, tags/categories results | Find cross-object work and save reusable views | Command 640px; filters 260-320px; result title 360px; preview 320px | Command-first; filters secondary; results include why matched; preview/inspector shows full title/body |
| Timeline / Calendar | Minimalist timeline, unified timeline/calendar | Understand duration, overlap, workload, due dates | Row label 300-340px; day 52-64px; calendar event 180px or agenda | Timeline bars show date/status unless wide; list/calendar modes share selected object inspector |
| Pipeline / Kanban | Category board / list pipelines | Move items through stages | Column 260-320px; card 220x72; lane max 5-8 visible cards | Horizontal stage board; cards show title + one metadata line; long content opens inspector |
| Dashboard widgets | Custom dashboards | Present chosen operational information | Widget min 280x160; feed widget 520x220; timeline 620x180 | User-selected widgets; each widget has clear job; avoid equal-weight card soup |
| Templates | Container templates | Start repeatable projects/contacts | Template card 260x96; detail preview 480px | Template gallery + preview + create action; maintenance not daily nav priority |
| Backup/export/import | Maintenance | Trust local data operations | Form/panel 560px; status log 620px; action buttons separated | Boring, clear, spacious; visible destination, last run, risk/warning, restore path |
| Settings/appearance | Maintenance | Configure without damaging work | Two-column settings: nav 260px, form 620px | Conventional settings page; no dense work UI here |
| Trash/activity log | Maintenance/recovery/audit | Recover or audit changes | Table row 44px; title col 360px; preview 320px | Table + preview; destructive actions separated and confirmed |
| Workflow Lab | Scaffold/lab | Experiment with automation later | 620px documentation/workflow pane; 320px status panel | Tucked away; labelled experimental; no claim as core operator loop |

## 3. Designs to apply page by page

### A. Workspace home / Dashboard design

**Analogue observed:** Pagico uses a dashboard/landing surface for pinned items, recent/synced items, task counts, activity, teammates, custom dashboard views, and project status summaries.

**Pseudico design:**

```text
left nav 260px
main top: pinned/recent project/contact strip, 260x72 each, horizontal scroll
main middle left: active work/activity feed, 620px min
main middle right: Today summary + project health, 300px min
main bottom: compact timeline strip or saved dashboard widgets
```

Budget rules:

- Pinned item card must fit project/contact name + one next action line + status/date.
- If a card cannot fit 8-12 words of next action, it becomes a list row.
- Dashboard widgets must be actionable or removable; no meaningless metric boxes.
- The dashboard is not the search page and not the full timeline page; it gives launch points.

### B. Today planning design

**Analogue observed:** Pagico Today supports drag/drop rescheduling between Today/Tomorrow/someday/backlog-like groups, group collapse, plus-buttons at headings, a day-view calendar toggle, small-window adaptation, and keyboard invocation. Rapid Day Planner emphasizes fast typing, destination assignment, and low latency.

**Pseudico design:**

```text
header: Today count, date, quick keyboard hint
capture band: 560-720px multiline rapid input with parse preview
body option 1 wide: Today 440px | Tomorrow 340px | Backlog 340px | Inspector 320px
body option 2 narrow: single active group list + group switcher + inspector drawer
```

Budget rules:

- Today task row: 420px wide, 72px high.
- Snooze/reschedule controls are row actions or keyboard commands, not shrinking buttons inside cramped cards.
- A full task title must be visible in the list row or expanded selected row.
- Destination/project field needs 220-280px minimum; otherwise show destination underneath the title.
- Long titles get two lines before truncation; metadata drops first.

### C. Inbox triage design

**Analogue observed:** Pagico has Inbox as a collection point and quick creation from toolbar/Today. Pseudico has local-only Inbox, email import, files, links, notes, tasks.

**Pseudico design:**

```text
capture/import area: 560x120 minimum
inbox queue: 520px list with item type and first meaningful line
triage panel: 340px fields for save-to, type, due, tags, category
preview/editor: 520px when selected item is a note/file/link/email
```

Budget rules:

- Triage cannot use small destination inputs. Save To must fit common project/contact names.
- Batch triage uses checkboxes and keyboard commands; selected item gets full detail.
- File/link/email previews need enough width to show filename/domain/sender.

### D. Projects library design

**Analogue observed:** Pagico has a Projects section with category/tag browsing, list view, category board, and recently accessed projects. Its tag browser is explicitly for large project libraries.

**Pseudico design:**

```text
left nav 260px
browser top: 3-4 hierarchical category/tag columns, 240-300px each
results bottom: table/list with title >=320px, notes >=360px, modified/status/tags columns
optional board mode: horizontal category columns 280px each
```

Budget rules:

- Category columns horizontally scroll before narrowing below 240px.
- Project title in table/list never below 320px.
- Tags/categories wrap only in dedicated metadata area; not inside the title.
- Board cards are for browsing status, not reading long project descriptions.

### E. Project detail / mixed content container design

**Analogue observed:** Pagico project pages store tasks, notes, lists, files, maps, links together; tabs/views expose dashboard/content/timeline/calendar/activity/settings. It also supports links to contacts/projects and embedded maps.

**Pseudico design:**

```text
header 120-170px: project name, status/health, category, linked contacts, next action
quick-start row: + task + note + checklist + file + link + location, each explicit
main if >=1280px: outline 260px | mixed feed 620-760px | inspector 340px
main if narrow: outline collapses, inspector drawer, feed gets priority
```

Budget rules:

- Mixed feed item minimum 620px wide, 86px high.
- Note previews get 3-5 lines; long note collapses with first paragraph and open affordance.
- Checklist/list rows need their own editor; do not flatten into tiny chips.
- File names keep extension visible; domains visible for links.
- Location text/address comes before map preview.
- Inspector title uses textarea for long titles; body minimum 320x160.

### F. Contact detail design

**Analogue observed:** Pagico treats contacts as containers, not just address cards; contacts can host client-specific tasks, notes, and documents and link into projects.

**Pseudico design:**

```text
header: contact/person/company, role, status, category, next follow-up
left/detail panel: contact facts 280-320px
centre: contact mixed feed 620px+
right: related projects/tasks/files/relationship context 320px
```

Budget rules:

- Contact name/company must not be initials-only unless in avatar rail.
- Related projects need full names and next actions, not chips only.
- Communication notes need readable paragraphs.
- If no contact data is used, the relationship panel collapses, not the main feed.

### G. Search / saved views / collections design

**Analogue observed:** Pagico has smart search, smart lists, tags/categories views, and results that can include projects, contacts, tasks, notes, and files.

**Pseudico design:**

```text
command area: 640-760px search input + save-view button
left filters: 280px categories/tags/type/date/status
centre results: title >=360px, why-match >=320px, object metadata
right preview: 320-360px selected object inspector
```

Budget rules:

- Search is a command surface, not a tiny form.
- Result rows must explain why they matched.
- Saved views are first-class objects with readable names and filters.
- Query chips can wrap only below the command input; not inside it.

### H. Timeline / Calendar design

**Analogue observed:** Pagico promotes timeline as workload clarity, with unified timeline/calendar/list views and minimalist bars. The key lesson is that timeline bars visualize dates/duration; long reading belongs to row labels, list mode, agenda, or inspector.

**Pseudico design:**

```text
mode toolbar: Timeline | List | Calendar | 6-week | Year
left row label gutter: 300-340px
right grid: 52-64px/day in day view; horizontal scroll if needed
right/side agenda: selected day or selected item details, 320px
```

Budget rules:

- Day columns do not shrink below 52px.
- Bars shorter than 150px show date/status only.
- Full titles live in row labels or inspector.
- Month/year views use dots/heat/summary labels, not full titles.
- Calendar cells show event count/dots if title cannot fit; agenda provides readable event text.

### I. Pipeline / Kanban design

**Analogue observed:** Pagico project/category board shows recent projects under categories, with hide/reorder customization, and boards can exist in collection/team scopes.

**Pseudico design:**

```text
horizontal board: columns 280-320px
column header: category/stage, count, hide/reorder controls
cards: 240x72 minimum, title + one metadata line + status/category stripe
```

Budget rules:

- Columns scroll horizontally before shrinking below 260px.
- Cards do not show note bodies.
- Drag target and category/status are obvious.
- Board mode is not the only project list; table/list remains available for dense browsing.

### J. Maintenance pages design

**Analogue observed:** Pagico has settings, sync/share, templates, files/versioning, and import/export-related surfaces; these are utility surfaces, not the daily operator centre.

**Pseudico design:**

```text
settings: left section nav 260px | form 620px | status/help 300px
backup/export/import: action panel 560px | log/status 620px | risk/help 300px
trash/activity: table 760px | preview 340px
workflow lab: explanation/editor 620px | status/output 340px
```

Budget rules:

- Maintenance pages should be boring and legible.
- Dangerous actions get separation and confirmation.
- Export/restore paths and timestamps need full readable rows.
- Workflow Lab remains clearly experimental and not visually promoted above daily work.

## 4. Implementation implication for Pseudico

Future implementation should not begin with colours or cards. It should begin with these constraints:

1. Define each route's primary operator information.
2. Assign a minimum width/height to that information.
3. Decide the fallback pattern when space is insufficient.
4. Only then choose visual styling.
5. Test with real long titles, notes, files, links, contacts, and 1280x800.

A component is not acceptable if it only looks good with short demo labels.

## 5. Immediate redesign priority order

1. Today planning: capture and reschedule must become genuinely operable.
2. Project detail mixed feed: this is Pseudico's distinctive container model.
3. Search/collections: must show cross-object results without database slop.
4. Projects library/category browser: must handle hundreds of projects.
5. Timeline/calendar: keep the corrected row-label/bar separation and expand list/calendar modes.
6. Contacts detail: make contacts first-class work containers.
7. Maintenance pages: make them trustworthy and conventional.
