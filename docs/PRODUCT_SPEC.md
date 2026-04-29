# Local Work OS — Full Build Specification v0.1

Working title: **Local Work OS**  
Reference category: **Pagico-style local productivity database**  
Scope: **desktop-only, local-only, single-user-first**  
Excluded: **cloud sync, mobile apps, team workspaces, public sharing, billing, hosted accounts, hosted storage**

The goal is not to copy Pagico’s branding, visual design, wording, icons, screenshots, or proprietary implementation. The goal is to achieve functional parity with the usability pattern that makes Pagico powerful: projects and contacts as living containers, mixed work objects in one place, tags/categories for cross-cutting organisation, smart collections, dashboards, Today planning, timeline/calendar views, and local-first file-backed work management.

Pagico’s public material describes the core appeal as having tasks, notes, docs, projects, and clients together, with notes/emails, documents/photos, checklists/tasks, sub-projects, related contacts, dashboards, project status visualisation, tag browsing, browser capture, and on-device storage by default. That is the functional universe we are translating into an original local-only build.

---

## 1. Product definition

### 1.1 Product promise

**Local Work OS** is a desktop app that lets a person organise their active work, clients, projects, tasks, notes, files, links, and plans inside one local database.

The app should feel less like a normal task manager and more like a **personal work operating system**:

```text
Capture quickly
  → organise by project/contact/inbox
  → connect related things
  → plan the day
  → review timelines/dashboards
  → find anything instantly
  → keep files and notes beside the work they belong to
```

### 1.2 The core design insight

Most productivity apps separate things:

```text
Task app
Note app
File folder
CRM
Calendar
Dashboard
Project tracker
```

This product should combine them through a common object model:

```text
Workspace
  ├── Containers
  │     ├── Inbox
  │     ├── Projects
  │     └── Contacts / Clients
  │
  ├── Items
  │     ├── Tasks
  │     ├── Lists
  │     ├── Notes
  │     ├── Files
  │     ├── Links
  │     ├── Headings
  │     ├── Locations
  │     └── Comments
  │
  ├── Metadata
  │     ├── Tags
  │     ├── Categories
  │     ├── Colours
  │     ├── Favourites
  │     └── Relationships
  │
  └── Views
        ├── Today
        ├── Inbox
        ├── Project pages
        ├── Contact pages
        ├── Collections
        ├── Smart Lists
        ├── Dashboard
        ├── Timeline
        ├── Calendar
        └── Global Search
```

The most important rule:

> **Build the local object graph first. Views are projections of the object graph.**

Do not build “a task app,” “a notes app,” and “a file app” separately. Build one local work database, then expose it through multiple views.

---

## 2. Product goals and non-goals

### 2.1 Goals

| Goal | Description |
|---|---|
| Local-first | The app works fully from a local database and local file store. |
| Project-centred | Projects can hold tasks, notes, lists, files, links, headings, locations, and related contacts. |
| Contact-centred | Contacts/clients are first-class containers, not just address-book records. |
| Fast capture | The user can create a task, note, file, or link quickly and save it to Inbox, project, or contact. |
| Mixed content | A project/contact page can show different object types together. |
| Smart organisation | Tags, categories, search, saved views, and collections cut across projects and contacts. |
| Daily planning | Today view becomes the practical working surface. |
| Visual planning | Timeline and calendar views help users see workload and deadlines. |
| Local files | Files can be attached, stored, opened, versioned later, and searched by metadata. |
| Agent-buildable | Features should be modular, testable, and suitable for future Linear/GitHub/Codex tickets. |

### 2.2 Non-goals

| Non-goal | Reason |
|---|---|
| Cloud sync | Explicitly out of scope. |
| Mobile app | Explicitly out of scope. |
| Team collaboration | Out of scope for this build. |
| Public sharing | Requires cloud/web infrastructure. |
| Hosted accounts | Not needed for local-only app. |
| Email-to-cloud capture | Cloud dependent. |
| Exact Pagico UI clone | Legal/product risk; build original UI. |
| Full rich-text editor in MVP | Too much complexity early. Markdown first. |
| Full automation engine in MVP | Powerful but dangerous for scope. |

---

## 3. Functional parity map

This maps the reference capability to the local-only equivalent we will build.

| Reference capability | Local Work OS equivalent | Priority |
|---|---|---:|
| Centralise tasks, notes, docs, projects, clients | Local workspace containing containers and items | P0 |
| Projects hold tasks, notes, lists, files | Project containers with mixed content feed | P0 |
| Contacts hold tasks, notes, lists, files | Contact/client containers with profile fields and mixed content | P1 |
| Inbox default capture | System Inbox container | P0 |
| Quick new task panel | Command bar / quick capture modal | P0 |
| Natural language dates | Local date parser for new task captions | P1 |
| Lists/checklists | List item model with indentation and ordering | P0 |
| Tags via `@tag` | Inline tag parser and tag autocomplete | P0/P1 |
| Categories with colours | Category model assigned to containers/items | P0 |
| Collections by tag/keyword | Saved collection views powered by query engine | P1 |
| Smart Lists | Saved filter engine over items/containers | P1 |
| Dashboard | Local dashboard composed of saved views/widgets | P1 |
| Today / Rapid Day Planner | Local Today, Tomorrow, Backlog planning view | P1 |
| Timeline | Date-based project/task visualisation | P1/P2 |
| Calendar | Month/week/day views from local dated items | P1/P2 |
| Content tabs | Tabs inside project/contact containers | P1 |
| Project status visualisation | Project health summary cards | P1 |
| File versioning | Local attachment snapshots | P2 |
| List-to-pipeline | Pipeline view for lists | P2 |
| Workflows | Local rule/manual automation engine | P2/P3 |
| Web widgets | Link cards first; embedded web widgets later or excluded | P3 |
| Browser extension | Local-only browser capture bridge later | P3 |
| Cloud/team/mobile | Excluded | Exclude |

---

## 4. Core architecture specification

### 4.1 Recommended technical stack

| Layer | Technology | Rationale |
|---|---|---|
| Desktop shell | Electron | Strong local filesystem support and cross-platform packaging. |
| Renderer | React + TypeScript + Vite | Agent-friendly UI stack. |
| Styling | Tailwind or CSS modules | Fast, consistent component styling. |
| Component primitives | Radix-style accessible primitives | Useful for menus, dialogs, popovers, tabs. |
| Local database | SQLite | Reliable local storage. |
| ORM/query builder | Drizzle ORM | Typed schema and migrations. |
| Search | SQLite FTS5 | Local full-text search without external service. |
| State | TanStack Query + Zustand | Separate persisted data from UI state. |
| Tests | Vitest, React Testing Library, Playwright | Unit, component, and end-to-end testing. |
| Packaging | electron-builder | Desktop installers for macOS/Windows/Linux. |
| Notes format | Markdown first | Simple, searchable, portable. |
| Files | Local attachment folder | Keeps documents inside the workspace. |

### 4.2 App process model

```text
Electron main process
  ├── Opens workspace
  ├── Manages SQLite connection
  ├── Manages local file operations
  ├── Schedules reminders
  ├── Handles OS notifications
  └── Exposes safe IPC methods

Preload layer
  └── Provides typed, limited API bridge

Renderer process
  ├── React UI
  ├── Views and components
  ├── Calls typed IPC API
  └── Never directly touches Node filesystem/database APIs
```

### 4.3 Security constraints

| Requirement | Specification |
|---|---|
| Renderer isolation | Node integration disabled in renderer. |
| File access | Renderer requests file actions through preload IPC only. |
| Web links | Open externally by default. |
| Embedded web content | Not MVP; if later built, sandbox/allowlist required. |
| Local database writes | All writes go through command/service layer. |
| Attachments | Stored under workspace-controlled folder. |
| Dangerous file paths | Normalise and validate all filesystem paths. |
| Backups | Never overwrite workspace without confirmation. |

---

## 5. Workspace specification

### 5.1 Workspace concept

A workspace is a local folder containing the entire database and local file store.

```text
MyWorkspace/
  workspace.json
  data/
    local-work-os.sqlite
  attachments/
    2026/
      04/
        <attachment-id>/
          original.ext
          versions/
            v1.ext
            v2.ext
  backups/
    2026-04-28T09-00-00/
      local-work-os.sqlite
      attachment-manifest.json
  exports/
```

### 5.2 Workspace behaviours

| Behaviour | Specification | Priority |
|---|---|---:|
| Create workspace | User chooses folder, app creates database and metadata files. | P0 |
| Open workspace | User selects existing workspace folder. | P0 |
| Recent workspaces | App remembers recently opened local paths. | P1 |
| Validate workspace | App checks required files/folders before opening. | P0 |
| Repair workspace | Detect missing folders and recreate safe structures. | P2 |
| Backup workspace | Copy SQLite + attachment manifest to backup folder. | P0 |
| Export workspace | JSON export of user data, optional attachment manifest. | P1 |
| Import workspace | Restore from export into new workspace. | P2 |

### 5.3 Workspace metadata

```json
{
  "id": "workspace_ulid",
  "name": "Personal Work",
  "schemaVersion": 1,
  "createdAt": "2026-04-28T00:00:00.000Z",
  "lastOpenedAt": "2026-04-28T00:00:00.000Z"
}
```

---

## 6. Domain model specification

### 6.1 Main concepts

| Concept | Meaning |
|---|---|
| Workspace | Local database and attachment store. |
| Container | A place that holds mixed content: Inbox, Project, Contact. |
| Container tab | A section within a project/contact. |
| Item | A piece of content inside a container. |
| Task | A work item with status and scheduling fields. |
| List | A grouped checklist or structured list. |
| List item | A row inside a list. |
| Note | Markdown body with searchable text. |
| Attachment | Local file metadata connected to an item. |
| Link | URL/bookmark item. |
| Tag | Flexible `@keyword` metadata. |
| Category | Stable colour-coded classification. |
| Relationship | Link between any two containers/items. |
| Saved view | A stored query/filter. |
| Dashboard | A view composed of widgets and saved views. |
| Daily plan | Today/Tomorrow/Backlog planning state. |
| Activity event | Record of every important write. |

### 6.2 Relationship rules

```text
A workspace has many containers.
A container has many tabs.
A container has many items.
An item belongs to one primary container.
An item may belong to one tab.
An item may link to many other items or containers.
An item may have many tags.
An item may have zero or one category.
A container may have many tags.
A container may have zero or one category.
A saved view queries containers/items/tags/categories/dates.
A dashboard displays saved views and summary widgets.
A daily plan references tasks.
Attachments belong to file items, tasks, notes, or list items.
```

### 6.3 Key architectural decision

Tasks and lists should be closely related.

```text
Task = an item with task fields.
List = an item with child list_items.
List item = checklist row, optionally task-like.
```

This keeps the MVP simple while allowing future conversion between task and list structures.

---

## 7. Database schema specification

This is not the final SQL migration, but it is detailed enough to guide implementation.

### 7.1 `workspaces`

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| name | text | Workspace display name |
| schema_version | integer | Current migration version |
| created_at | datetime | Required |
| updated_at | datetime | Required |

### 7.2 `containers`

Used for Inbox, projects, contacts, and future dashboard-like containers.

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| workspace_id | text | FK |
| type | text | `inbox`, `project`, `contact` |
| name | text | Required |
| slug | text | Local unique slug |
| description | text | Optional |
| status | text | `active`, `waiting`, `completed`, `archived` |
| category_id | text | Nullable FK |
| color | text | Optional UI colour token |
| is_favorite | boolean | Sidebar/pin behaviour |
| is_system | boolean | True for Inbox |
| sort_order | integer | Manual ordering |
| created_at | datetime | Required |
| updated_at | datetime | Required |
| archived_at | datetime | Nullable |
| deleted_at | datetime | Nullable soft delete |

### 7.3 `container_tabs`

Content tabs should exist in the schema early, even if the first UI only shows a default tab.

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| container_id | text | FK |
| name | text | Default: `Main` |
| description | text | Optional |
| sort_order | integer | Manual tab order |
| is_default | boolean | Exactly one default per container |
| created_at | datetime | Required |
| updated_at | datetime | Required |
| archived_at | datetime | Nullable |
| deleted_at | datetime | Nullable |

### 7.4 `items`

Universal table for all content objects.

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| workspace_id | text | FK |
| container_id | text | FK |
| container_tab_id | text | Nullable FK |
| type | text | `task`, `list`, `note`, `file`, `link`, `heading`, `location`, `comment` |
| title | text | Required for most types |
| body | text | Markdown/plain text |
| category_id | text | Nullable FK |
| status | text | General item status |
| sort_order | integer | Manual content order |
| pinned | boolean | Pin within container |
| created_at | datetime | Required |
| updated_at | datetime | Required |
| completed_at | datetime | Nullable |
| archived_at | datetime | Nullable |
| deleted_at | datetime | Nullable |

### 7.5 `tasks`

| Field | Type | Notes |
|---|---|---|
| item_id | text | PK/FK to items |
| task_status | text | `open`, `done`, `waiting`, `cancelled` |
| priority | integer | Optional 0–5 |
| start_at | datetime | Nullable |
| due_at | datetime | Nullable |
| all_day | boolean | Default true if date-only |
| timezone | text | Defaults to local |
| reminder_policy_id | text | Nullable |
| recurrence_rule_id | text | Nullable |
| completed_at | datetime | Nullable |

### 7.6 `lists`

| Field | Type | Notes |
|---|---|---|
| item_id | text | PK/FK to items |
| display_mode | text | `checklist`, `pipeline` later |
| show_completed | boolean | UI preference |
| progress_mode | text | `count`, `manual`, `none` |

### 7.7 `list_items`

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| list_item_parent_id | text | Nullable for hierarchy |
| list_id | text | FK to list item_id |
| title | text | Required |
| body | text | Optional |
| status | text | `open`, `done`, `waiting`, `cancelled` |
| depth | integer | 0+ |
| sort_order | integer | Manual order |
| start_at | datetime | Nullable |
| due_at | datetime | Nullable |
| completed_at | datetime | Nullable |
| created_at | datetime | Required |
| updated_at | datetime | Required |
| archived_at | datetime | Nullable |
| deleted_at | datetime | Nullable |

### 7.8 `notes`

May be optional if `items.body` is enough. Recommended if future rich text is expected.

| Field | Type | Notes |
|---|---|---|
| item_id | text | PK/FK |
| format | text | `markdown` initially |
| content | text | Note body |
| preview | text | Generated excerpt |

### 7.9 `links`

| Field | Type | Notes |
|---|---|---|
| item_id | text | PK/FK |
| url | text | Required |
| normalized_url | text | For deduplication |
| title | text | Fetched or manual |
| description | text | Optional |
| domain | text | Generated |
| favicon_path | text | Optional local cache |
| preview_image_path | text | Optional local cache |

### 7.10 `attachments`

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| workspace_id | text | FK |
| item_id | text | FK |
| original_name | text | Original filename |
| stored_name | text | Stored filename |
| mime_type | text | Optional |
| size_bytes | integer | Required |
| checksum | text | SHA-256 |
| storage_path | text | Relative path inside workspace |
| description | text | Optional searchable metadata |
| created_at | datetime | Required |
| updated_at | datetime | Required |
| deleted_at | datetime | Nullable |

### 7.11 `attachment_versions`

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| attachment_id | text | FK |
| version_number | integer | 1, 2, 3... |
| stored_name | text | Version filename |
| checksum | text | SHA-256 |
| size_bytes | integer | Required |
| note | text | Optional version note |
| created_at | datetime | Required |

### 7.12 `tags`

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| workspace_id | text | FK |
| name | text | `phone-call` |
| slug | text | Unique lowercase slug |
| created_at | datetime | Required |
| updated_at | datetime | Required |

### 7.13 `taggings`

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| tag_id | text | FK |
| target_type | text | `container`, `item`, `list_item` |
| target_id | text | ID of target |
| source | text | `inline`, `manual`, `imported` |
| created_at | datetime | Required |

### 7.14 `categories`

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| workspace_id | text | FK |
| name | text | Required |
| slug | text | Unique |
| color | text | UI token |
| description | text | Optional |
| created_at | datetime | Required |
| updated_at | datetime | Required |

### 7.15 `relationships`

For cross-linking everything.

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| source_type | text | `container`, `item`, `list_item` |
| source_id | text | Required |
| target_type | text | `container`, `item`, `list_item`, `url`, `file` |
| target_id | text | Required unless external |
| relation_type | text | `related`, `depends_on`, `blocked_by`, `references`, `belongs_to`, `follow_up_for` |
| label | text | Optional |
| created_at | datetime | Required |
| deleted_at | datetime | Nullable |

### 7.16 `saved_views`

Collections, smart lists, and dashboard widgets should share one query system.

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| workspace_id | text | FK |
| type | text | `collection`, `smart_list`, `dashboard_widget`, `search` |
| name | text | Required |
| description | text | Optional |
| query_json | text | Versioned JSON query |
| display_json | text | Grouping/sorting/layout |
| is_favorite | boolean | Sidebar visibility |
| created_at | datetime | Required |
| updated_at | datetime | Required |
| deleted_at | datetime | Nullable |

### 7.17 `dashboards` and `dashboard_widgets`

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| workspace_id | text | FK |
| name | text | Required |
| is_default | boolean | Opens at launch optionally |
| layout_json | text | Grid or column layout |
| created_at | datetime | Required |
| updated_at | datetime | Required |

Widgets:

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| dashboard_id | text | FK |
| type | text | `saved_view`, `today`, `upcoming`, `overdue`, `favorites`, `recent_activity`, `project_health` |
| title | text | Optional |
| saved_view_id | text | Nullable |
| config_json | text | Widget options |
| position_json | text | Layout |
| created_at | datetime | Required |
| updated_at | datetime | Required |

### 7.18 `daily_plans` and `daily_plan_items`

Today view should not be only a query for due dates. It also stores deliberate daily planning state.

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| workspace_id | text | FK |
| plan_date | date | Local date |
| created_at | datetime | Required |
| updated_at | datetime | Required |

Plan items:

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| daily_plan_id | text | FK |
| item_type | text | Usually `task` or `list_item` |
| item_id | text | Target ID |
| lane | text | `today`, `tomorrow`, `backlog` |
| sort_order | integer | Manual day order |
| added_manually | boolean | Distinguish due-date query vs deliberate plan |
| created_at | datetime | Required |
| updated_at | datetime | Required |

### 7.19 `activity_log`

Every write should record activity.

| Field | Type | Notes |
|---|---|---|
| id | text | ULID/UUID |
| workspace_id | text | FK |
| actor_type | text | `local_user`, `system`, `importer` |
| action | text | `created`, `updated`, `deleted`, `archived`, `completed`, `moved`, `tagged`, etc. |
| target_type | text | Required |
| target_id | text | Required |
| before_json | text | Optional |
| after_json | text | Optional |
| created_at | datetime | Required |

This enables audit history, debugging, backup confidence, undo groundwork, and future extension.

---

## 8. App shell specification

### 8.1 Main layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Top bar: Back | Forward | Quick Add | Search | Command Menu │
├───────────────┬─────────────────────────────────────────────┤
│ Sidebar       │ Main content view                           │
│               │                                             │
│ Today         │ Project / Contact / Inbox / Dashboard       │
│ Inbox         │ Collection / Search / Calendar / Timeline   │
│ Projects      │                                             │
│ Contacts      │                                             │
│ Collections   │                                             │
│ Tags/Cats     │                                             │
│ Dashboard     │                                             │
│ Settings      │                                             │
├───────────────┴─────────────────────────────────────────────┤
│ Optional bottom status: workspace, backup state, reminders  │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Sidebar requirements

| Section | Behaviour | Priority |
|---|---|---:|
| Today | Opens daily planner. | P0 |
| Inbox | Opens system inbox. | P0 |
| Projects | Expandable list of active/favourite projects. | P0 |
| Contacts | Expandable list of favourite/recent contacts. | P1 |
| Collections | Saved collections/smart lists. | P1 |
| Dashboard | Default dashboard. | P1 |
| Tags & Categories | Metadata browser. | P1 |
| Search | Global search screen. | P0 |
| Settings | Preferences, backups, imports, categories. | P1 |

### 8.3 Top bar requirements

| Control | Behaviour | Priority |
|---|---|---:|
| Back/forward | Local navigation history. | P1 |
| Quick Add | Create task/note/list/file/link. | P0 |
| Search | Global search input. | P0 |
| Command menu | Keyboard-driven actions. | P2 |
| Current context | Shows active container/view. | P1 |

### 8.4 Inspector panel

Optional right-side panel for selected object.

| Inspector section | Applies to |
|---|---|
| Details | All objects |
| Dates/reminders | Tasks/list items |
| Tags/categories | All objects |
| Relationships | Items/containers |
| Attachments | Tasks/notes/files |
| Activity | All objects |
| Comments | P2 objects |

---

## 9. Container specification

### 9.1 Universal container behaviour

Containers are the home for work.

| Behaviour | Project | Contact | Inbox |
|---|---:|---:|---:|
| Holds tasks | Yes | Yes | Yes |
| Holds lists | Yes | Yes | Yes |
| Holds notes | Yes | Yes | Yes |
| Holds files | Yes | Yes | Yes |
| Holds links | Yes | Yes | Yes |
| Has tags | Yes | Yes | Maybe |
| Has category | Yes | Yes | Maybe |
| Has colour | Yes | Yes | No/optional |
| Has favourite flag | Yes | Yes | System |
| Has status | Yes | Yes | System |
| Has tabs | P1 | P1 | No |
| Has summary | Yes | Yes | Triage summary |
| Has related objects | Yes | Yes | No/optional |

### 9.2 Project specification

Projects are for outcomes, deliverables, areas of responsibility, or ongoing work.

#### Project fields

| Field | Required | Notes |
|---|---:|---|
| Name | Yes | Clear title |
| Description | No | Markdown/plain text |
| Status | Yes | Active/waiting/completed/archived |
| Category | No | Colour-coded classification |
| Tags | No | Flexible metadata |
| Colour | No | Visual identity |
| Favourite | No | Sidebar shortcut |
| Related contacts | No | Client/stakeholder links |
| Related projects | No | Dependencies/subprojects |

#### Project screen sections

```text
Project Header
  ├── Name
  ├── Status
  ├── Category/colour
  ├── Tags
  ├── Favourite
  └── Quick actions

Project Summary
  ├── Open tasks
  ├── Overdue tasks
  ├── Upcoming tasks
  ├── Recent notes
  ├── Recent files
  ├── Related contacts
  └── Activity

Content Tabs
  ├── Main
  ├── Optional custom tabs
  └── Tab summary cards

Content Feed
  ├── Tasks
  ├── Lists
  ├── Notes
  ├── Files
  ├── Links
  ├── Headings
  └── Locations
```

#### Project acceptance criteria

| Requirement | Acceptance |
|---|---|
| Create project | Project appears in sidebar/list and persists after restart. |
| Add mixed content | User can add task, note, list, file, and link to project. |
| Manual order | User can reorder items within project. |
| Status | Completing/archiving project changes visibility in active lists. |
| Health summary | Project shows open/overdue/upcoming counts. |
| Links | User can link project to contact or another project. |

### 9.3 Contact/client specification

Contacts should be more than address records. Contacts are containers that can hold tasks, notes, lists, files, and links, with flexible labelled contact fields and relationship history.

#### Contact fields

| Field | Required | Notes |
|---|---:|---|
| Display name | Yes | Person or organisation |
| Type | No | `person`, `company`, `vendor`, `client` |
| Company | No | For people |
| Role/title | No | Optional |
| Notes | No | General profile note |
| Category | No | Stable classification |
| Tags | No | Flexible metadata |
| Colour | No | Visual identity |
| Favourite | No | Sidebar shortcut |
| Flexible fields | P1 | Email, phone, website, address, custom |

#### Flexible contact field examples

```text
Email: sam@example.com
Phone: +61...
Website: https://...
Office: Sydney
LinkedIn: ...
Billing Contact: Jane
```

No hard-coded limit. Each field has:

```text
label
value
type
sort_order
```

#### Contact screen sections

```text
Contact Header
  ├── Name
  ├── Company/role
  ├── Category/tags
  ├── Favourite
  └── Quick actions

Profile Fields
  ├── Email
  ├── Phone
  ├── Website
  ├── Address
  └── Custom fields

Relationship Summary
  ├── Related projects
  ├── Open follow-ups
  ├── Recent notes
  ├── Recent files
  └── Interaction history

Content Feed
  ├── Follow-up tasks
  ├── Meeting notes
  ├── Files
  ├── Links
  └── Lists
```

#### Contact acceptance criteria

| Requirement | Acceptance |
|---|---|
| Create contact | Contact persists and appears in contact list. |
| Add fields | User can add arbitrary labelled fields. |
| Add follow-up | User can add a task tied to contact. |
| Link project | User can relate contact to project. |
| View history | Contact shows notes, completed tasks, files, recent activity. |

### 9.4 Inbox specification

The Inbox is the default capture destination.

#### Inbox behaviours

| Behaviour | Priority |
|---|---:|
| Quick capture defaults to Inbox | P0 |
| Inbox shows unsorted tasks, notes, links, files | P0 |
| User can move item to project/contact | P0 |
| User can bulk triage selected items | P1 |
| User can filter by item type | P1 |
| User can empty/archive completed inbox items | P1 |

#### Inbox acceptance criteria

| Requirement | Acceptance |
|---|---|
| Capture task | Task appears in Inbox. |
| Move task | Task can be moved to project/contact. |
| Preserve metadata | Tags, dates, attachments survive move. |
| Activity log | Move creates activity event. |

---

## 10. Content tab specification

### 10.1 Why tabs matter

Content tabs let large projects/contacts stay usable. They can separate general items from documents, responsibilities, seasons, meetings, or template-driven structures.

### 10.2 Tab behaviours

| Behaviour | Priority |
|---|---:|
| Every project/contact has default `Main` tab | P0 |
| Items may belong to tab | P0 schema, P1 UI |
| Create/rename/delete tab | P1 |
| Reorder tabs | P1 |
| Move item between tabs | P1 |
| Summary card per tab | P2 |
| Create tab from template | P2 |

### 10.3 Tab screen layout

```text
Project Header
Summary | Main | Documents | Meetings | Follow-ups | +
```

### 10.4 Tab acceptance criteria

| Requirement | Acceptance |
|---|---|
| Default tab | New project/contact has one default tab. |
| Create tab | User can add named tab. |
| Move item | Item can be moved between tabs. |
| Summary | Container summary shows counts/previews by tab. |
| Delete tab | Deleting a tab requires moving/deleting contained items. |

---

## 11. Item system specification

### 11.1 Universal item card

Every content object should render as a card or row using shared item affordances.

```text
Item Card
  ├── Type icon
  ├── Title
  ├── Preview/body excerpt
  ├── Status/dates
  ├── Tags/category
  ├── Attachments indicator
  ├── Relationship indicator
  ├── Quick actions
  └── Drag handle
```

### 11.2 Universal item actions

| Action | Applies to |
|---|---|
| Edit title/body | Most items |
| Move to container/tab | All items |
| Archive/delete | All items |
| Add/remove tag | All items |
| Set category | All items |
| Link to project/contact/item | All items |
| Duplicate | Notes/lists/tasks/templates |
| Convert | Task/list/link where supported |
| Open inspector | All items |
| Show activity | All items |

### 11.3 Manual order

Manual ordering is crucial because mixed content needs narrative organisation.

| Requirement | Specification |
|---|---|
| Sort order field | Every item has `sort_order`. |
| Drag reorder | P1 for project/contact feeds. |
| Insert position | New item appears near current context where possible. |
| Auto sections | Optional filters by type/date/status. |
| Manual vs smart view | Manual ordering applies inside containers, not global smart views. |

---

## 12. Task specification

### 12.1 Task behaviours

```text
Quick Add Task
  ├── Title input
  ├── Natural date parser
  ├── Save to: Inbox / Project / Contact
  ├── Due/start date fields
  ├── Tags/category
  ├── Reminder
  └── Optional attachments
```

### 12.2 Task fields

| Field | Priority |
|---|---:|
| Title | P0 |
| Status | P0 |
| Container | P0 |
| Due date/time | P0 |
| Start date/time | P1 |
| Description/body | P1 |
| Tags | P0 |
| Category | P0 |
| Priority | P1 |
| Reminder | P1 |
| Recurrence | P2 |
| Attachments | P2 |
| Relationships | P1 |
| Completion date | P0 |
| Archive state | P0 |

### 12.3 Task status model

```text
open
waiting
done
cancelled
```

Optional later:

```text
someday
blocked
deferred
```

### 12.4 Date parsing

MVP parser should support:

| Input | Meaning |
|---|---|
| `today` | Due today |
| `tomorrow` | Due tomorrow |
| `next monday` | Due next Monday |
| `+3d` / `+3 days` | Due three days from today |
| `5pm` | Time today unless date also present |
| `tomorrow 5pm` | Due tomorrow at 5pm |
| `Monday 9am-5pm` | Start/due range |
| `@phone-call` | Tag extraction |

### 12.5 Task interactions

| Interaction | Priority |
|---|---:|
| Create task from quick add | P0 |
| Create task inside project/contact | P0 |
| Mark done/undone | P0 |
| Edit title/body | P0 |
| Set due date | P0 |
| Set start date | P1 |
| Snooze to tomorrow/next week/custom date | P1/P2 |
| Drag into Today/Tomorrow | P1 |
| Attach file | P2 |
| Convert task to list | P2 |
| Link to project/contact | P1 |
| Add reminder | P1 |

### 12.6 Task acceptance criteria

| Requirement | Acceptance |
|---|---|
| Quick capture | User can create task in under one modal. |
| Persistence | Task survives app restart. |
| Dates | Due tasks appear in Today/upcoming/search. |
| Completion | Done tasks leave active lists unless “show completed” enabled. |
| Container move | Task can move from Inbox to project/contact. |
| Tags/categories | Task appears in tag/category views. |
| Activity | Create/update/complete/move generate events. |

---

## 13. List and checklist specification

### 13.1 List purpose

Lists represent checklists, packing lists, meeting agendas, workflows, launch plans, shopping lists, subtask groups, and later pipelines.

### 13.2 List behaviours

| Behaviour | Priority |
|---|---:|
| Create list in container | P0 |
| Add list item | P0 |
| Check/uncheck item | P0 |
| Reorder items | P0 |
| Bulk paste multiline list | P1 |
| Indent/outdent item | P1 |
| Dates on list items | P1 |
| Move item across lists | P2 |
| Convert task to list | P2 |
| Break list item into task | P2 |
| Pipeline display mode | P2 |

### 13.3 List item rules

```text
A list item may be simple:
  - "Pack charger"

A list item may be task-like:
  - "Submit application", due Friday, reminder 1 day before

A list item may be hierarchical:
  - Travel
      - Book hotel
      - Book flights
```

### 13.4 List acceptance criteria

| Requirement | Acceptance |
|---|---|
| Create list | List appears in project/contact feed. |
| Add rows | User can add multiple rows quickly. |
| Complete rows | Progress updates as rows are checked. |
| Bulk paste | Multiline paste creates multiple list items. |
| Reorder | Manual order persists. |
| Indent | Child rows display under parent. |

---

## 14. Notes specification

### 14.1 Notes behaviour

Notes are Markdown content objects stored inside Inbox, projects, or contacts.

| Feature | Priority |
|---|---:|
| Create note | P0 |
| Edit Markdown body | P0 |
| Preview note excerpt | P0 |
| Search title/body | P0 |
| Inline tags | P1 |
| Link note to task/project/contact | P1 |
| Attach files to note | P2 |
| Rich text editor | P3 |

### 14.2 Note screen

```text
Note Card
  ├── Title
  ├── Markdown preview
  ├── Last updated
  ├── Tags/category
  └── Linked items indicator

Note Editor
  ├── Title
  ├── Markdown body
  ├── Tag autocomplete
  ├── Attachments
  └── Related items
```

### 14.3 Note acceptance criteria

| Requirement | Acceptance |
|---|---|
| Create/edit | User can create and edit Markdown note. |
| Search | Note title/body found by global search. |
| Tags | `@tag` in note creates tag relation. |
| Link | Note can be linked to task/contact/project. |

---

## 15. File and attachment specification

### 15.1 File purpose

Files are first-class work objects. They should live beside the projects, contacts, notes, and tasks they belong to.

### 15.2 File behaviours

| Behaviour | Priority |
|---|---:|
| Attach file to container | P0 |
| Attach file to task/note/list item | P2 |
| Copy file into workspace | P0 |
| Store metadata | P0 |
| Open file externally | P0 |
| Reveal file in file manager | P1 |
| Rename display title | P1 |
| Add description/tags/category | P1 |
| Search filename/description | P1 |
| Checksum duplicate detection | P1 |
| Version snapshot | P2 |
| Replace current file | P2 |

### 15.3 File object vs attachment

```text
File item
  A file shown as its own object in a project/contact feed.

Attachment
  A file attached to another item, such as a task or note.
```

Both should use the same `attachments` table, but file items should have a visible item card.

### 15.4 File acceptance criteria

| Requirement | Acceptance |
|---|---|
| Import file | File is copied into workspace attachment folder. |
| Open file | User can open file with OS default app. |
| Metadata | Filename, size, type, checksum stored. |
| Search | File appears in search by name/description/tags. |
| Safety | Missing local file displays repair/missing state. |

---

## 16. Link/bookmark specification

### 16.1 Link behaviours

| Behaviour | Priority |
|---|---:|
| Add URL as link item | P0 |
| Store title/description/domain | P0 |
| Open URL externally | P0 |
| Fetch metadata | P1 |
| Show card preview | P1 |
| Convert link to task | P2 |
| Capture from browser extension | P3 |
| Render embedded widget | P3 |

### 16.2 Link acceptance criteria

| Requirement | Acceptance |
|---|---|
| Create link | URL item appears in container. |
| Open link | Opens in default browser. |
| Search | Link title/domain/description searchable. |
| Metadata | User can manually edit title and description. |

---

## 17. Heading and location specification

### 17.1 Headings

Headings help organise mixed content manually.

| Feature | Priority |
|---|---:|
| Add heading item | P1 |
| Heading levels 1–3 | P1 |
| Reorder around heading | P1 |
| Collapse section under heading | P2 |

### 17.2 Locations/maps

For local-only, store location metadata and open externally rather than making maps a core dependency.

| Feature | Priority |
|---|---:|
| Add location text/address | P2 |
| Store latitude/longitude manually | P3 |
| Open in external maps/browser | P2 |
| Embedded map | P3 or exclude |
| Offline map cache | Exclude |

---

## 18. Tags and categories specification

### 18.1 Tags

Tags are flexible, unlimited, and inline.

#### Tag behaviours

| Behaviour | Priority |
|---|---:|
| Detect `@tag` in title/body | P0 |
| Create tag automatically | P0 |
| Tag autocomplete | P1 |
| Remove tag when text removed | P1 |
| Manual tag editor | P1 |
| Rename tag | P1 |
| Merge tags | P2 |
| Multi-word tags with hyphens | P0 |
| Tag browser | P1 |

#### Tag syntax

```text
@phone-call
@office
@legal
@follow-up
@client-a
```

#### Tag acceptance criteria

| Requirement | Acceptance |
|---|---|
| Inline parse | Typing `@phone-call` creates tag relation. |
| Search | Searching `@phone-call` returns tagged objects. |
| Collection | User can save tag search as collection. |
| Autocomplete | Existing tags suggested after `@`. |

### 18.2 Categories

Categories are stable, colour-coded classifications.

#### Category behaviours

| Behaviour | Priority |
|---|---:|
| Create category | P0 |
| Assign category to project/contact/item | P0 |
| Colour-coded display | P0 |
| Category browser | P1 |
| Filter by category | P1 |
| Rename category | P1 |
| Delete category | P1 |

#### Category examples

```text
Business
Personal
Admin
Writing
Software Development
Client Work
Health
Finance
```

#### Category acceptance criteria

| Requirement | Acceptance |
|---|---|
| Create | Category available in settings. |
| Assign | Item/container shows category badge. |
| Filter | Category browser shows matching objects. |
| Dashboard | Saved views can filter by category. |

### 18.3 Tags & Categories browser

#### Browser behaviours

| Behaviour | Priority |
|---|---:|
| List all categories | P1 |
| List all tags | P1 |
| Click category to filter | P1 |
| Add tag filters incrementally | P1 |
| Show results across object types | P1 |
| Save filter as smart view | P2 |

---

## 19. Search, Collections, and Smart Views specification

### 19.1 Global search

Search should be one of the primary navigation modes.

#### Search scope

| Object | Search fields |
|---|---|
| Projects | Name, description, tags, category |
| Contacts | Name, company, fields, notes, tags, category |
| Tasks | Title, body, tags, category |
| Lists | Title, list item titles, tags, category |
| Notes | Title, body, tags, category |
| Files | Filename, description, tags, category |
| Links | URL, title, description, domain |
| Comments | Body, related item |

#### Search behaviours

| Behaviour | Priority |
|---|---:|
| Full-text search | P0 |
| Type filters | P1 |
| Tag search | P0 |
| Category search | P1 |
| Recent searches | P2 |
| Save search | P1 |
| Keyboard open result | P1 |

### 19.2 Collections

Collections are saved searches/filters that keep the user focused.

#### Collection behaviours

| Behaviour | Priority |
|---|---:|
| Create collection from tag search | P1 |
| Create collection from keyword search | P1 |
| Group results by container | P1 |
| Complete tasks inside collection | P1 |
| Add task inside collection | P1 |
| Auto-apply collection tag to new task | P1 |
| Include projects/contacts/items | P1 |
| Exclude archived/deleted by default | P1 |

#### Example collections

```text
@phone-call
@waiting
@legal + @office
Files needing review
Upcoming client follow-ups
Software bugs
Receipts
```

### 19.3 Smart Lists

Smart Lists are more structured than collections.

#### Query conditions

| Condition | Priority |
|---|---:|
| Object type | P1 |
| Container type | P1 |
| Container ID | P1 |
| Tag includes | P1 |
| Category equals | P1 |
| Task status | P1 |
| Due before/after/today/overdue | P1 |
| Start before/after | P2 |
| Created/updated range | P2 |
| Text contains | P1 |
| Has attachment | P2 |
| Is favourite | P2 |

#### Query JSON

```json
{
  "version": 1,
  "match": "all",
  "conditions": [
    { "field": "item.type", "op": "eq", "value": "task" },
    { "field": "task.status", "op": "eq", "value": "open" },
    { "field": "task.dueAt", "op": "on_or_before", "value": "+7d" },
    { "field": "tag.slug", "op": "includes", "value": "follow-up" }
  ],
  "groupBy": "container",
  "sort": [
    { "field": "task.dueAt", "direction": "asc" }
  ]
}
```

#### Smart view acceptance criteria

| Requirement | Acceptance |
|---|---|
| Save query | User can save search/filter as named view. |
| Recompute | Results update when source objects change. |
| Group | Results can group by container/category/date. |
| Act inline | Completing task updates original object. |

---

## 20. Dashboard specification

### 20.1 Dashboard purpose

Dashboards are assembled command centres. They should answer: **what needs attention?**

### 20.2 Dashboard widget types

| Widget | Priority | Description |
|---|---:|---|
| Today | P1 | Today’s planned tasks |
| Overdue | P1 | Overdue open tasks |
| Upcoming | P1 | Due soon |
| Favourite projects | P1 | Pinned projects |
| Favourite contacts | P2 | Pinned contacts |
| Recent notes | P1 | Recently edited notes |
| Recent files | P2 | Recently added files |
| Saved view | P2 | Any collection/smart list |
| Project health | P1 | Open/overdue/upcoming per project |
| Recent activity | P1 | Activity log |
| Timeline snippet | P2 | Upcoming range visual |
| Calendar snippet | P2 | Month/week summary |

### 20.3 Default dashboard

The default dashboard should include:

```text
Today
Overdue
Upcoming this week
Favourite projects
Recent activity
```

### 20.4 Dashboard behaviours

| Behaviour | Priority |
|---|---:|
| Open dashboard from sidebar | P1 |
| Default dashboard exists | P1 |
| Widgets update from local database | P1 |
| Click widget item opens source object | P1 |
| Add saved view widget | P2 |
| Reorder widgets | P2 |
| Multi-column layout | P2 |

### 20.5 Dashboard acceptance criteria

| Requirement | Acceptance |
|---|---|
| Default dashboard | User sees useful overview without configuration. |
| Live data | Completing task updates widgets. |
| Navigation | Clicking result opens source container/item. |
| Persistence | Widget layout persists after restart. |

---

## 21. Today / Daily Planner specification

### 21.1 Today view purpose

Today is the daily working surface. It should reduce overwhelm and help the user decide what to do now.

### 21.2 Today view lanes

```text
Today
  ├── Manually planned tasks
  ├── Tasks due today
  └── Events/reminders if supported locally

Tomorrow
  ├── Tasks manually planned for tomorrow
  └── Tasks due tomorrow

Backlog
  ├── Overdue tasks from recent window
  └── Waiting/deferred items optionally hidden
```

### 21.3 Today behaviours

| Behaviour | Priority |
|---|---:|
| Show today due tasks | P0 |
| Show overdue tasks | P0 |
| Mark complete | P0 |
| Add new task | P1 |
| Plan task into Today | P1 |
| Plan task into Tomorrow | P1 |
| Manual order within lane | P1 |
| Drag between lanes | P1 |
| Snooze/reschedule | P1 |
| Hide completed | P1 |
| Keyboard-first entry | P2 |
| Ivy Lee top-six mode | P2 |

### 21.4 Tomorrow rollover

At start of a new local day:

```text
Yesterday's Tomorrow lane
  → becomes today's Today planned lane
  → preserves manual order
```

Rules:

| Case | Behaviour |
|---|---|
| Task completed yesterday | Do not roll over. |
| Task cancelled | Do not roll over. |
| Task manually removed | Do not roll over. |
| Task due date changed | Respect new date but preserve manual plan if still relevant. |
| App was closed overnight | Rollover occurs on next launch/open. |

### 21.5 Today acceptance criteria

| Requirement | Acceptance |
|---|---|
| Today tasks | Due-today tasks appear. |
| Overdue | Recent overdue tasks appear in backlog. |
| Manual planning | User can drag task into Today/Tomorrow. |
| Order | Manual order persists. |
| Completion | Completing task removes/marks it in all views. |

---

## 22. Timeline and calendar specification

### 22.1 Timeline purpose

Timeline shows workload over time, especially project/task ranges.

### 22.2 Timeline behaviours

| Behaviour | Priority |
|---|---:|
| Show upcoming tasks by due date | P1 |
| Group by project/contact | P1 |
| Show start–due ranges | P2 |
| Week/month range selector | P2 |
| Drag to reschedule | P2 |
| Filter by category/tag | P2 |
| Hide completed toggle | P1 |
| Project health overlay | P3 |

### 22.3 Calendar behaviours

| Behaviour | Priority |
|---|---:|
| Month view from local tasks | P1 |
| Week view | P2 |
| Day view | P2 |
| Click day to create task | P1 |
| Drag task to date | P2 |
| Filter by project/category/tag | P2 |
| Local `.ics` import | P3 |
| External live calendar sync | Exclude |

### 22.4 Timeline/calendar acceptance criteria

| Requirement | Acceptance |
|---|---|
| Date visibility | Dated tasks appear on calendar/timeline. |
| Navigation | User can move between date ranges. |
| Source link | Clicking item opens task/container. |
| Completion state | Completed tasks visibly distinct or hidden. |

---

## 23. Project health and visual status specification

### 23.1 Project status fields

```text
active
waiting
completed
archived
```

### 23.2 Health indicators

| Indicator | Priority |
|---|---:|
| Open task count | P1 |
| Completed task count | P1 |
| Overdue count | P1 |
| Next due date | P1 |
| Recent activity | P1 |
| Stale project warning | P2 |
| Health score | P3 |

### 23.3 Project health card

```text
Project Name
Status: Active
Open: 12
Overdue: 2
Next: Submit brief, Friday
Recent: Note edited yesterday
```

### 23.4 Acceptance criteria

| Requirement | Acceptance |
|---|---|
| Summary updates | Task completion changes counts. |
| Overdue visible | Overdue count is accurate. |
| Navigation | Clicking count opens filtered project view. |

---

## 24. Pipeline specification

### 24.1 Pipeline purpose

A pipeline is an alternative display mode for a list.

Example:

```text
Lead → Contacted → Proposal Sent → Won
```

or

```text
Idea → Draft → Review → Published
```

### 24.2 Pipeline behaviours

| Behaviour | Priority |
|---|---:|
| Enable pipeline mode for list | P2 |
| Treat top-level list items as stages | P2 |
| Child items become cards | P2 |
| Drag card between stages | P2 |
| Show progress | P2 |
| Convert back to checklist | P2 |

### 24.3 Acceptance criteria

| Requirement | Acceptance |
|---|---|
| Toggle mode | List can switch between checklist and pipeline. |
| Drag card | Moving card updates underlying list structure. |
| Persistence | Pipeline state survives restart. |

---

## 25. Templates specification

### 25.1 Template purpose

Templates let users create repeatable project/contact/list structures.

### 25.2 Template types

| Template | Priority |
|---|---:|
| List template | P1 |
| Project template | P2 |
| Contact template | P2 |
| Note template | P2 |
| Tab template | P2 |
| Full workspace template | P3 |

### 25.3 Template contents

A project template may include:

```text
Project name pattern
Description
Tabs
Tasks with relative dates
Lists
Notes
Tags
Category
File placeholders
Relationships placeholders
```

### 25.4 Relative date syntax

```text
+0d = creation date
+1d = one day after creation
+1w = one week after creation
+1m = one month after creation
```

### 25.5 Acceptance criteria

| Requirement | Acceptance |
|---|---|
| Create from template | New project/list created from saved template. |
| Relative dates | Template tasks get dates relative to creation date. |
| Tabs | Template can create tabs. |
| Metadata | Tags/categories copied. |

---

## 26. Local automation/workflows specification

### 26.1 Workflow purpose

For local-only, workflows should be **small, safe, inspectable local rules**.

### 26.2 Workflow scope

| Trigger | Priority |
|---|---:|
| Manual trigger | P2 |
| On item created | P3 |
| On file imported | P3 |
| On tag added | P3 |
| On due date reached | P3 |

| Action | Priority |
|---|---:|
| Add tag | P2 |
| Set category | P2 |
| Move item to container | P2 |
| Create list from template | P2 |
| Create task | P2 |
| Create project/contact from template | P3 |
| Run external script | Exclude initially |
| Send email/webhook | Exclude |

### 26.3 Workflow safety

| Rule | Specification |
|---|---|
| Preview first | Manual workflows show intended changes before applying. |
| Activity log | Every workflow action logs activity. |
| Undo support | Store before/after JSON. |
| No cloud actions | Strictly local. |
| No arbitrary code | Exclude external scripts in early versions. |

---

## 27. Reminders and notifications specification

### 27.1 Local reminder requirements

| Behaviour | Priority |
|---|---:|
| Reminder at due time | P1 |
| Reminder before due time | P1 |
| Default reminder preference | P2 |
| Reminder before start time | P2 |
| Snooze notification | P2 |
| Notification history | P3 |

### 27.2 Reminder data model

```text
reminder_policies
  id
  target_type
  target_id
  offset_minutes
  anchor
  enabled

reminder_events
  id
  policy_id
  scheduled_at
  fired_at
  dismissed_at
  snoozed_until
```

### 27.3 Acceptance criteria

| Requirement | Acceptance |
|---|---|
| Schedule | Task with reminder schedules local notification. |
| Fire | Notification appears at expected time. |
| Dismiss | Dismiss state persists. |
| Reschedule | Changing due date updates reminder. |

---

## 28. Backup, import, and export specification

### 28.1 Backup

Because this app is local-only, backup is a first-class feature.

| Behaviour | Priority |
|---|---:|
| Manual backup | P0 |
| Automatic backup on app close/open interval | P1 |
| Backup before migration | P0 |
| Restore backup into new workspace | P1 |
| Attachment manifest | P1 |
| Backup integrity check | P2 |

### 28.2 Export

| Export | Priority |
|---|---:|
| Full JSON export | P0 |
| Project Markdown export | P1 |
| Contact Markdown export | P1 |
| Task CSV/TSV export | P1 |
| Attachment manifest | P1 |
| Search index excluded | P0 |

### 28.3 Import

| Import | Priority |
|---|---:|
| Full JSON import into new workspace | P1 |
| Markdown note import | P2 |
| CSV task import | P2 |
| File folder import | P2 |
| External app importers | P3 |

### 28.4 Acceptance criteria

| Requirement | Acceptance |
|---|---|
| Backup | User can create backup snapshot. |
| Restore | Backup can open as a new workspace. |
| Export | JSON export contains containers/items/metadata. |
| Integrity | Export/import preserves IDs or maps them safely. |

---

## 29. Preferences specification

### 29.1 Preference areas

| Area | Settings |
|---|---|
| Workspace | Name, path, backup location |
| Appearance | Theme, compact mode, font size |
| Categories | Add/edit/delete categories |
| Tags | Rename/merge tags |
| Tasks | Default reminders, auto-archive completed |
| Today | Launch to Today, backlog window |
| Files | Attachment copy behaviour, reveal/open options |
| Search | Include archived/deleted toggles |
| Backups | Backup frequency, retention |
| Shortcuts | Keyboard shortcuts |

---

## 30. User flows

### 30.1 Capture a task into Inbox

```text
User presses Quick Add
  → selects Task or defaults to Task
  → types "Call accountant tomorrow @finance"
  → parser extracts due date and tag
  → Save-To defaults to Inbox
  → task saved
  → activity logged
  → search index updated
  → Today/Upcoming/Collection views refresh
```

### 30.2 Move Inbox task into project

```text
User opens Inbox
  → selects task
  → Move To
  → chooses Project
  → task.container_id changes
  → activity logged
  → Inbox removes task
  → project content feed shows task
  → collections still include task by tag
```

### 30.3 Create a project with mixed content

```text
Create Project
  → add category and tags
  → add task list
  → add meeting note
  → attach proposal PDF
  → add related contact
  → project summary updates
  → dashboard/project health updates
```

### 30.4 Use a collection

```text
User creates collection @phone-call
  → saved view query stored
  → collection shows tasks/notes/files/projects tagged @phone-call
  → grouped by container
  → user completes task from collection
  → original task updates everywhere
```

### 30.5 Plan tomorrow

```text
User opens Today view at end of day
  → reviews Backlog
  → drags 5 tasks into Tomorrow
  → orders them
  → closes app
  → next day, Tomorrow lane rolls into Today
```

### 30.6 Attach and version a file

```text
User drops file into project
  → file copied into workspace attachments
  → file item created
  → checksum calculated
  → file appears in project feed
  → later user creates snapshot
  → attachment version stored
  → version number increments
```

---

## 31. View relationships

### 31.1 Same object, many views

A single task may appear in:

```text
Project page
Contact page through relationship
Today view if due/planned
Dashboard widget if overdue/upcoming
Collection if tagged
Search results
Timeline if dated
Calendar if dated
Activity feed if recently changed
```

Therefore:

| Rule | Specification |
|---|---|
| One source of truth | There is one task record. |
| Views are projections | Views query and display the same underlying object. |
| Inline actions update source | Completing a task in any view completes it everywhere. |
| Activity is universal | Action from any view logs the same event. |

### 31.2 Metadata drives views

```text
Tags
  → Collections
  → Search
  → Dashboard widgets
  → Tag browser

Categories
  → Category browser
  → Dashboard filtering
  → Project health grouping
  → Visual colour coding

Dates
  → Today
  → Upcoming
  → Timeline
  → Calendar
  → Reminders

Relationships
  → Backlinks
  → Related contacts/projects
  → Dependency views
  → Project/contact histories
```

### 31.3 Containers create context

```text
Container = where the item lives.
Relationship = what else the item is connected to.
Tag = what flexible meaning the item has.
Category = what stable classification the item belongs to.
Date = when the item matters.
Saved view = why the user is seeing the item now.
```

---

## 32. MVP, V1, and V2 scope

### 32.1 MVP — usable local foundation

MVP should prove the object graph and core usability.

| Module | MVP scope |
|---|---|
| Workspace | Create/open local workspace |
| App shell | Sidebar, top bar, main view |
| Database | SQLite schema + migrations |
| Containers | Inbox and projects |
| Tasks | Create/edit/complete/due date |
| Lists | Basic checklist |
| Notes | Markdown notes |
| Files | Attach/open local file items |
| Tags | Inline `@tag` parsing |
| Categories | Create/assign colour category |
| Search | Global FTS search |
| Today | Today + overdue |
| Dashboard | Default overview |
| Activity | Log core writes |
| Backup/export | Manual backup + JSON export |

### 32.2 V1 — Pagico-like usability depth

| Module | V1 scope |
|---|---|
| Contacts | Contact/client containers with flexible fields |
| Container tabs | Multiple tabs in projects/contacts |
| Collections | Saved tag/keyword collections |
| Smart Lists | Query builder/saved views |
| Dashboard | Saved view widgets |
| Today | Tomorrow planning + manual order |
| Timeline | Upcoming visual timeline |
| Calendar | Month view |
| Relationships | Backlinks and related projects/contacts |
| Reminders | Local notifications |
| File metadata | Searchable descriptions/checksums |
| Import/export | Project/contact Markdown export |

### 32.3 V2 — advanced local power

| Module | V2 scope |
|---|---|
| Templates | Project/contact/list templates |
| File versions | Snapshot/versioning |
| Pipelines | List-to-pipeline view |
| Recurrence | Recurring tasks |
| Workflow engine | Local manual automations |
| Browser capture | Local extension/native bridge |
| Rich notes | Optional rich text editor |
| Advanced calendar | Week/day views and drag reschedule |
| Advanced dashboard | Multi-column custom layouts |
| Restore | Backup restore workflow |

---

## 33. Quality and test specification

### 33.1 Testing levels

| Level | Purpose |
|---|---|
| Unit tests | Domain commands, parser, query engine. |
| Repository tests | SQLite schema, migrations, CRUD operations. |
| Integration tests | Command → database → activity → search index. |
| Component tests | UI components and view logic. |
| E2E tests | Critical user flows in packaged/dev app. |
| Migration tests | Schema upgrades preserve data. |

### 33.2 Must-test behaviours

| Behaviour | Test requirement |
|---|---|
| Create project | DB + UI smoke |
| Create task | DB + command + UI |
| Complete task | Updates all views |
| Move task | Preserves metadata |
| Parse tag | Creates tag relation |
| Parse due date | Correct local date |
| Add note | Searchable body |
| Attach file | Copies to workspace |
| Search | Finds projects/tasks/notes/files |
| Collection | Returns tagged objects |
| Today | Shows due/overdue tasks |
| Backup | Creates valid snapshot |
| Activity log | Every write creates event |

### 33.3 Non-negotiable quality rules

```text
No write operation without an activity event.
No direct DB access from React components.
No direct filesystem access from renderer.
No cloud dependency.
No destructive delete without soft-delete first.
No migration without backup.
No feature without at least service-level tests.
```

---

## 34. Performance specification

### 34.1 Expected local scale

The app should comfortably handle:

| Object | Target |
|---|---:|
| Projects | 5,000 |
| Contacts | 20,000 |
| Items | 250,000 |
| List items | 500,000 |
| Tags | 10,000 |
| Attachments | 100,000 metadata records |
| Search results | First response under 300ms for typical queries |

### 34.2 Performance rules

| Area | Requirement |
|---|---|
| Search | Use FTS index, not naive scans. |
| Dashboard | Query summaries incrementally. |
| Large containers | Virtualised lists for long feeds. |
| Attachments | Do not load file contents unless needed. |
| Activity log | Paginate. |
| Backups | Avoid UI freeze; run in main process. |
| Timeline/calendar | Limit date range queries. |

---

## 35. Packaging and deployability specification

Even though this is local-only, the scaffold should be deployable as a desktop app.

### 35.1 Development commands

```text
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm package
```

### 35.2 Packaged outputs

| Platform | Output |
|---|---|
| macOS | `.dmg` or `.zip` |
| Windows | `.exe` installer |
| Linux | `.AppImage` or `.deb` |

### 35.3 Packaging requirements

| Requirement | Priority |
|---|---:|
| Development build launches | P0 |
| Packaged app opens workspace | P1 |
| Database path works in packaged app | P1 |
| File attachment paths work in packaged app | P1 |
| App icon/name configurable | P2 |
| Code signing | P3 / later cost consideration |

---

## 36. Product principles for the build

### 36.1 Functional principles

```text
Everything important can be captured quickly.
Everything captured can be moved later.
Everything can be found.
Everything can be connected.
Everything local stays local.
Everything that changes leaves a trace.
```

### 36.2 UX principles

```text
One object, many views.
The app should reward quick capture, not punish imperfect organisation.
Projects and contacts should feel like living workspaces.
Tags should create instant cross-project focus.
Today should be calm and actionable.
Dashboards should answer: what needs attention?
Search should feel like navigation, not a last resort.
```

### 36.3 Development principles

```text
Build schema before screens.
Build commands before UI actions.
Build reusable views before one-off screens.
Build query engine before dashboards.
Build local backup before risky migrations.
Build simple Markdown before rich text.
Build file metadata before file versioning.
Build Today basic before timeline/calendar sophistication.
```

---

## 37. Final build target

The full local-only product should eventually feel like this:

```text
A user opens the app.

They land on Today and see what matters now.

They capture a task with natural language:
  "Call builder tomorrow 10am @phone-call"

It lands in Inbox or the selected project.

They open a project and see:
  tasks, notes, checklists, files, links, headings, related contacts,
  project status, upcoming deadlines, and recent activity.

They open a contact and see:
  profile fields, follow-ups, meeting notes, documents, related projects,
  and interaction history.

They click @phone-call and see:
  every call task across all projects and contacts, grouped by context.

They open Dashboard and see:
  overdue items, upcoming deadlines, active projects, recent notes,
  files needing review, and saved smart lists.

They attach files directly to projects and keep version snapshots.

They use tags/categories/smart views to create flexible work systems.

All data remains local.
```

That is the functional and usability target.

---

## 38. Reference sources for feature inspiration

These are public reference sources used for the feature audit/specification. Use them for market understanding only, not to copy proprietary visual design, branding, wording, screenshots, assets, or implementation.

- Pagico homepage: https://www.pagico.com/
- Pagico project tour: https://www.pagico.com/tour/projects.shtml
- Pagico contacts tour: https://www.pagico.com/tour/contacts.shtml
- Pagico collections tour: https://www.pagico.com/tour/collections.shtml
- Pagico features / what’s new: https://www.pagico.com/tour/
- Pagico content tabs update: https://www.pagico.com/blog/pagico-february-edition-manage-projects-better-with-content-tabs.html
- Pagico Rapid Day Planner help: https://notes17.zendesk.com/hc/en-us/articles/33227393690131-Conducting-Daily-or-Nightly-Planning-with-the-Rapid-Day-Planner-Today-View
- Pagico tasks and lists help: https://notes17.zendesk.com/hc/en-us/articles/218325267-Creating-new-tasks-and-lists
- Pagico tagging help: https://notes17.zendesk.com/hc/en-us/articles/218326167-Tagging-tasks-and-notes
- Pagico date/time help: https://notes17.zendesk.com/hc/en-us/articles/115005294447-Faster-ways-to-set-dates-times
