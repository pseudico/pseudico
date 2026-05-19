# Operator space budget for Pseudico UI

This file defines the minimum visible space each major operator function needs before a design is allowed to show real data. It is based on the user-supplied Pagico screenshots, the existing Pseudico route/module surface, and public Pagico material that emphasizes dashboard timelines, smart search, quick-start actions, pinned items, tag/category browsing, project/contact containers, and project/contact timelines.

Sources checked: Pagico 10 what's-new, Pagico feature tour for projects, and Pagico 10 reviewer's guide.

## Non-negotiable legibility rules

1. A component may not show long readable text in a box that cannot fit at least one meaningful phrase.
2. If a timeline/calendar bar is too narrow for a task title, the title moves to the row label or inspector; the bar shows date/status only.
3. Ellipsis is allowed for secondary labels only after the full title is visible elsewhere on the same screen.
4. Text-entry controls must be sized for the expected input, not for a placeholder.
5. Any area that can contain real project/contact/note/task content must have an explicit minimum width and height or switch to a different pattern.
6. Small screens get horizontal scrolling or split views before text becomes syllable-wrapped.

## Functional space budgets

| Functionality | Operator information needed | Minimum space before showing inline text | If space is smaller | Current preview action |
| --- | --- | ---: | --- | --- |
| Global search / command | Query, destination, type/action feedback | 420px wide x 36px high | Collapse nav chrome, not input | Keep top command/input wide |
| Quick Add one-line task | Full task phrase, parsed date, save target | 520px wide x 44px high | Use command overlay or drawer | Keep action visible; avoid tiny fields |
| Quick Add multiline capture | 3-6 captured lines, parse result buttons | 320px wide x 140px high | Open large capture panel | Today planner uses multiline textarea |
| Sidebar navigation | Section, item name, count/status | 240-280px wide | Icon rail plus expanded drawer | Preserve labels; don't truncate primary nav by default |
| Category browser column | Category title, count, 3-5 item cards | 240px wide per column | Switch to list/table | Category lanes use fewer, wider columns |
| Project/contact table row | Icon, title, notes, category/tags, modified time | 44px row height, title column >=320px | Hide secondary columns first | Table keeps title/notes primary |
| Pinned project card | Project title, next action, risk/date, compact status | 260px wide x 68px high | Use single-row list card | No tiny square cards for project meaning |
| Today lane task | Checkbox, full task title, destination, due/snooze | 360px wide x 72px high | Show as list row, not card grid | Avoid three cramped equal lanes with long text |
| Inspector title | Editable full task/item title | 320px wide x 56px high, textarea preferred | Open detail panel | Title fields use textarea where needed |
| Inspector body/note | Real paragraph, tags, category | 320px wide x 160px high | Dedicated editor route/drawer | Body fields use textarea, not short input |
| Mixed content feed item | Type, title, 2-5 line body, metadata, actions | central pane >=560px wide; item min 86px high | Outline list + inspector | Feed remains central, inspector separate |
| Checklist/list | Group title, 5-10 rows, checkboxes | 520px wide; 28px per row | Dedicated list editor | Do not cram into timeline bar |
| File/link item | Filename/title, extension/domain, version/status | 480px wide; filename visible with extension | File/link list view | Avoid icon-only attachment cards |
| Location item | Place name, address/meeting context | 480px wide x 96px high | Text location card, map secondary | Map/visuals never replace address text |
| Timeline row label | Project/container + readable next action + metadata | 300-340px fixed gutter | Horizontal scroll, not narrower labels | Implemented 330px gutter |
| Timeline day column | Date cell and grid click target | 52-64px/day for day scale | Zoom out/week scale or scroll | Implemented 58px/day min |
| Timeline bar label | Date/status only unless bar >=180-220px | 86px date-only; 150px mid; 220px wide | Full title stays in row label/inspector | Implemented date/status bars, no title cramming |
| Calendar event | Event title + time/project | 180px wide x 32px high | Agenda row below calendar | Calendar preview uses agenda rows |
| Pipeline card | Item title + status/contact | 220px wide x 72px high | Dense list/pipeline lane scroll | Pipeline cards need their own lane budget |
| Search result | Object type, title, why matched, project/contact | 620px wide row/card | Inspector preview beside results | Search table keeps title + notes |
| Backup/export/settings | Action, destination, last run, risk state | 520px wide panel | Maintenance route | Keep boring, spacious, trustworthy |

## Timeline-specific design rule

The timeline's job is to show time position, duration, overlap, and workload. It is not the primary reading surface for full task titles unless there is enough horizontal span.

Required timeline structure:

```text
left readable row label, 300-340px
  -> full project/contact/container name
  -> full or two-line next action/title
  -> metadata/status/tags
right time grid
  -> day/week columns with minimum click width
  -> bars show date/status/category
  -> selected bar opens inspector for full content
```

The failed screenshot violated this by placing full task titles inside tiny day bars. That produced syllable wrapping, clipped text, and no reliable way to read the item.

## Input-specific design rule

Inputs are not decoration. Size them from the expected content:

- Destination/project field: 220-280px minimum.
- Date/time field: 140-180px minimum.
- Task title: 360px minimum or two-line textarea.
- Note/body: 320px x 160px minimum.
- Bulk capture: 320px x 140px minimum, preferably larger.
- Search/command: 420-720px depending shell width.

## What changed in the preview

- Rebuilt timeline rows with a fixed readable left gutter and horizontally scrollable day grid.
- Set day columns to a 58px minimum instead of letting the grid collapse.
- Changed timeline bars so they no longer try to contain full task titles.
- Kept full task titles in the row label where there is enough width to read them.
- Added bar size classes: short date-only, mid date/status, wide date/status with more breathing room.

## Remaining risks

- The preview still needs a selected-item inspector tied directly to clicked timeline bars.
- Long project names can still need row expansion or two-line title rules.
- Month/year views need separate density budgets; they cannot reuse day-view text rules.
- Colourways are irrelevant until this spacing model is stable.
