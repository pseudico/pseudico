# Common App Import Format Research

Status: PSE-171 research deliverable
Date: 2026-05-13
Scope: local export files only; no cloud sync, hosted accounts, telemetry, or proprietary asset copying.

## Decision summary

Local Work OS should prioritize importer adapters that consume files the user has already exported locally. The first production follow-ups should extend the existing Markdown/folder, CSV/TSV, and attachment services rather than introduce app-specific cloud connectors.

Recommended order:

1. **Notion Markdown/CSV ZIP importer** - highest overlap with the PSE-170 Markdown folder importer and existing CSV parsing; strong notes/projects/databases coverage. Initial local service foundation now lives in `docs/NOTION_IMPORT.md`.
2. **Todoist project CSV importer** - narrow, task-first, and close to the existing CSV task import surface. Initial local service foundation now lives in `docs/TODOIST_IMPORT.md`.
3. **Trello board JSON importer** - richer than Trello CSV and maps cleanly to project/list/card/checklist objects, but needs nested JSON fixtures.
4. **Evernote ENEX/HTML notebook importer** - valuable for notes + attachments, but parser/resource handling is higher risk.
5. **Obsidian vault enhancement** - treat as an enhancement to the Markdown folder importer, not a separate importer, unless frontmatter/wiki-link fidelity becomes a product goal.

Asana, ClickUp, Jira, Google Keep, Apple Notes, Microsoft To Do/Outlook Tasks, and OmniFocus remain candidate adapters, but they are either lower-fit to the single-user local-first scope, export only partial fidelity, or depend heavily on paid/cloud/team workflows.

## Source snapshot

| App/source | Local export formats found | Source note | Local Work OS implication |
|---|---|---|---|
| Notion | HTML ZIP, Markdown + CSV ZIP, PDF; workspace export can include uploaded files | Official Notion help says pages/databases/workspaces can be exported and Markdown/CSV downloads are ZIP files. | Best first external importer because Markdown pages, database CSVs, folders, and assets align with PSE-170. |
| Todoist | Project CSV and backup ZIPs containing project CSVs | Official Todoist help says project exports/backups use CSV and include active projects/tasks, dates, descriptions, comments, and attachment links, with completed/archived gaps. | Good second importer; map rows to tasks and preserve unsupported fields in notes/source metadata. |
| Trello | Board JSON for all members; Premium CSV; Premium workspace exports can include raw attachments | Official Trello help says JSON is available per board, CSV is Premium, JSON has better nested/card/comment data, and workspace export can include raw attachments. | JSON importer should precede CSV because it preserves lists, cards, checklists, labels, comments, and movement history better. |
| Evernote | ENEX, single-page HTML, multi-page HTML; resource folders for HTML exports | Official Evernote help says Mac/Windows desktop can export notes/notebooks as ENEX or HTML and can include note attributes/resources. | Strong notes importer candidate; ENEX parser and attachment resource copying are required. |
| Obsidian | Plain Markdown files in a local vault, attachments as regular files | Official Obsidian help says a vault is a local folder of Markdown files and attachments. | Mostly covered by PSE-170; add frontmatter/wiki-link/backlink enrichment later. |
| Asana | Project CSV | Official Asana material describes project CSV with task IDs, dates, names, assignees, tags, notes, project, and parent task. | Feasible CSV adapter, but team/project semantics exceed near-term local single-user needs. |
| ClickUp | Task data CSV; Docs can export PDF/HTML/Markdown; task attachments often represented as links | Official ClickUp help documents CSV task export fields and separate doc export formats. | Feasible but broad; attachment links should not be fetched automatically in local-only mode. |
| Jira Cloud | Issue CSV, site backups with attachments for admins | Atlassian support documents CSV issue export and cloud backups that can include attachments. | Lower priority because it is team/work-management heavy and workflows/custom fields are complex. |
| Google Keep | Google Takeout archive for selected Google products | Google Account help documents Takeout archive downloads; product-specific Keep fixture shape still needs verification from an exported archive. | Candidate only after verifying fixture shape from user-provided Takeout exports. |
| Apple Notes | Per-note PDF export/open in Pages | Apple support documents PDF export from a note and notes opened in Pages, with limited fidelity for tags/checklists/links. | Poor bulk importer target without user-provided exported files or third-party tools. |
| OmniFocus | CSV, UTF-16 CSV, plain text/TaskPaper-like, HTML, OmniFocus documents/backups | OmniFocus reference documents local data files, backups, and export formats. | Good advanced task importer for Apple-heavy users; defer until task hierarchy/recurrence fidelity matures. |

## Tradeoff table

| Candidate importer | Fit | Complexity | Fidelity risk | Privacy/local risk | Recommended action |
|---|---:|---:|---:|---:|---|
| Notion Markdown/CSV ZIP | High | Medium | Medium | Low if only local ZIP/folder | Create follow-up feature ticket first. |
| Todoist CSV/backup ZIP | High | Low | Medium | Low | Create follow-up feature ticket second. |
| Trello JSON board | High | Medium-high | Medium | Low if attachment URLs are not fetched | Create follow-up feature ticket third. |
| Evernote ENEX/HTML | Medium-high | High | Medium-high | Low | Create follow-up feature ticket after JSON adapters. |
| Obsidian vault enrichment | Medium | Low-medium | Low | Low | Add as Markdown importer enhancement, not a separate first-class app importer. |
| Asana CSV | Medium | Low-medium | Medium | Low | Keep as later CSV adapter. |
| ClickUp CSV/docs | Medium | Medium | High around attachments/custom fields | Low if no URL fetching | Keep as later CSV/docs adapter. |
| Jira CSV | Low-medium | Medium-high | High around custom workflows | Low if no URL fetching | Keep as later enterprise/team adapter. |
| Google Keep Takeout | Medium | Unknown until fixtures | Unknown | Low | Need user-provided Takeout fixture before committing implementation. |
| Apple Notes PDF/Pages | Low | Medium | High | Low | Do not prioritize as importer. |
| Microsoft To Do/Outlook Tasks | Low-medium | Medium | Medium | Medium if export path requires account/cloud | Research further only if user demand appears. |
| OmniFocus CSV/TaskPaper | Medium | Medium | Medium | Low | Later task-power-user adapter. |

## Fixture requirements

All fixtures must be synthetic or user-provided with private data scrubbed before committing.

| Importer | Minimum fixture set | Assertions needed |
|---|---|---|
| Notion ZIP | Page with nested page, database CSV, image/file asset, checkbox/to-do, inline link, tag/multi-select columns | Preview counts pages/databases/assets; import creates project/tabs/notes/tasks/attachments; unsupported blocks are preserved as Markdown/notes. |
| Todoist CSV/ZIP | Project CSV with sections, parent/subtasks, due date/time, recurring date text, labels, priority, description, comments, attachment-link fields | Tasks preserve hierarchy/status/dates/tags; comments/links are stored without network fetches; completed-task absence is warned. |
| Trello JSON | Board JSON with lists, cards, labels, checklists, comments/actions, due dates, archived cards, attachment metadata; optional raw attachment ZIP | Board maps to project; lists/cards/checklists/comments import predictably; archived cards are soft-deleted or skipped by option. |
| Evernote ENEX/HTML | Notebook export with text note, tags, created/updated dates, image/PDF resources, internal note link if available | Notes and attachments copy locally; metadata is preserved; unsupported formatting degrades safely. |
| Obsidian vault | Vault with Markdown, nested folders, YAML frontmatter, wiki-links, tags, attachments, canvas file | Existing folder importer handles baseline; enhancement resolves frontmatter/tags/wiki-links without accessing hidden plugin state by default. |

## Common adapter contract recommendations

- Add a shared `ExternalImportSourceDescriptor` in a future ticket only when at least two app-specific adapters exist.
- Keep detection local: ZIP/file sniffing, manifest names, and content signatures; no account login or remote API calls.
- Every adapter should support preview before import, explicit unsupported-field warnings, and a generated source report.
- Attachment URLs from SaaS exports must remain inert metadata unless a later explicitly approved local fetch workflow is added.
- Preserve original source IDs in importer metadata to support re-runs/deduplication later, but do not add schema until a concrete adapter needs it.
- Import execution should use the standard write flow: validate, transaction, domain writes, activity log, search update, commit, UI/query notification.

## Proposed follow-up importer tickets

1. **Build Notion Markdown/CSV ZIP importer**
   - Scope: local ZIP/folder selection, preview, Markdown pages as notes, database CSVs as tasks/lists/projects where mapped, assets as attachments, unsupported block report.
   - Out of scope: Notion API, live workspace export, cloud access, exact visual parity.

2. **Build Todoist CSV/backup ZIP task importer**
   - Scope: Todoist project CSV detection, preview/mapping, tasks/subtasks/sections/dates/labels/priorities/comments, warning for completed/archived omissions.
   - Out of scope: Todoist account login/API, downloading attachment links.

3. **Build Trello JSON board importer**
   - Scope: board JSON preview, board/list/card/checklist/comment/label/date mapping, optional raw attachment ZIP matching, archive handling option.
   - Out of scope: Trello API, recreating all action history as editable state.

4. **Build Evernote ENEX/HTML notebook importer**
   - Scope: ENEX and HTML notebook parsing, notes/tags/timestamps/resources/attachments, preview, source report.
   - Out of scope: Evernote account access and exact rich-text rendering parity.

5. **Enhance Markdown folder import for Obsidian vault metadata**
   - Scope: YAML frontmatter, tags, wiki-links, attachment embed resolution, optional `.canvas` warning/report.
   - Out of scope: Obsidian plugin settings, cloud sync integrations, plugin-specific data models.

## Recommendation for first external importer

Choose **Notion Markdown/CSV ZIP importer** first. It gives the broadest coverage of notes, nested pages, lightweight databases, and attachments while reusing the just-merged Markdown folder import foundation. Todoist should follow if the product priority is task migration rather than note/workspace migration.

## References

- Notion Help, “Export your content”: https://www.notion.com/en-gb/help/export-your-content
- Todoist Help, “Import or export a project as a CSV file”: https://www.todoist.com/help/articles/208821185-Import-or-export-Todoist-project-templates
- Todoist Help, “Download or restore backups in Todoist”: https://www.todoist.com/help/articles/115001799989-%E3%83%90%E3%83%83%E3%82%AF%E3%82%A2%E3%83%83%E3%83%97-%E5%85%A5%E9%96%80%E7%B7%A8
- Trello/Atlassian Support, “Export data from Trello”: https://support.atlassian.com/trello/docs/exporting-data-from-trello/
- Trello/Atlassian Support, “Making sense of Trello's JSON export”: https://support.atlassian.com/trello/docs/making-sense-of-trellos-json-export/
- Evernote Help, “Export Notes and Notebooks as ENEX or HTML”: https://help.evernote.com/hc/en-us/articles/209005557-Export-Notes-and-Notebooks-as-ENEX-or-HTML
- Obsidian Help, “How Obsidian stores data”: https://help.obsidian.md/data-storage
- Obsidian Help, “Accepted file formats”: https://help.obsidian.md/file-formats
- Asana, “Export Asana projects to CSV for custom reporting”: https://asana.com/inside-asana/export-to-csv
- ClickUp Help, “Export task data”: https://help.clickup.com/hc/en-us/articles/6310551109527-Export-task-data
- Jira/Atlassian Support, “Export issues from Jira cloud in CSV format”: https://support.atlassian.com/jira/kb/how-to-export-issues-from-jira-cloud-in-csv-format/
- Google Account Help, “How to download your Google data”: https://support.google.com/accounts/answer/3024190
- Apple Support, “Export or print notes on iPhone”: https://support.apple.com/guide/iphone/export-or-print-notes-iphdf551cfa2/ios
- OmniFocus 4 Reference Manual, “Managing Your Data”: https://support.omnigroup.com/documentation/omnifocus/universal/4.3.3/en/managing-your-data/
