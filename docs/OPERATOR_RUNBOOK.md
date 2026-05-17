# Pseudico Operator Runbook

Status: draft handoff runbook for operator-readiness hardening.
Audience: nontechnical local desktop operator with no developer nearby.
Readiness assumption: Pseudico is **pilot ready, not yet release ready** until the operator-readiness report closes the remaining P0/P1 risks.

## 1. What Pseudico is for

Pseudico is a local-only desktop work OS for keeping projects, contacts, Inbox items, tasks, notes, lists, files, links, tags, categories, relationships, search, saved views, collections, dashboards, Today planning, timeline/calendar views, templates, workflows, backups, exports, imports, and maintenance tools in one local workspace.

Use it for:

- Capturing unprocessed work in the Inbox.
- Organising work into projects and contacts.
- Keeping tasks, notes, lists, links, and local file attachments beside the work they belong to.
- Reviewing Today, dashboards, search, saved views, timeline, and calendar views.
- Backing up and exporting local workspace data.

Do **not** use it as:

- A cloud sync service.
- A team collaboration system.
- A mobile app.
- A hosted account, billing, public sharing, telemetry, or remote file storage product.
- A replacement for your normal device-level backup plan.

## 2. Local-only safety rules

- Your workspace folder is the source of truth. It contains the SQLite database, local attachment copies, backups, exports, logs, and workspace metadata.
- Keep the workspace on a local disk or a local network location that is stable and writable. Avoid putting an active workspace inside a cloud-sync folder unless the owner has explicitly accepted the risk of sync conflicts and database locks.
- Do not edit the SQLite database directly.
- Do not manually rename, move, or delete files inside the workspace `attachments`, `data`, `backups`, or `exports` folders unless this runbook or a support ticket tells you to.
- Create a backup before risky maintenance, imports, upgrades, or cleanup.
- Restore backups into a fresh workspace folder. Do not restore over the only active copy of important work.

## 3. First-run checklist

1. Open Pseudico.
2. Choose **Create workspace** or **Open workspace**.
3. Select a local folder that you can read and write.
4. Confirm the app opens the workspace home without warnings.
5. Create one test Inbox task and one test note.
6. Close and reopen the app.
7. Confirm the test task and note are still present.
8. Create a manual backup.
9. Confirm the backup appears in the workspace backup list or backup folder.

If any step fails, stop and use the troubleshooting section before entering important real work.

## 4. Daily operating workflow

### Capture

- Use the Inbox for anything unprocessed.
- Create tasks for actions, notes for reference, lists for multi-step checklists, links for web references, and files for local attachments.
- Add due dates or planned dates only when they help Today, timeline, or calendar views.

### Triage

- Review Inbox items regularly.
- Move work into the correct project or contact when the context is known.
- Add tags for cross-cutting themes.
- Add categories when one primary grouping is useful.
- Relate records when one project, contact, task, note, file, or link should be discoverable from another.

### Review

- Use **Today** for current work and planned items.
- Use **Search** when you know part of a title, note, tag, category, or project/contact context.
- Use **Saved views** and **Collections** for repeated filters.
- Use **Dashboard** for overdue, upcoming, project-health, favourites, and recent-activity review.
- Use **Timeline** and **Calendar** for dated work.

## 5. Core objects

| Area | Operator use | Handoff standard |
|---|---|---|
| Projects | Outcomes, deliverables, bodies of work. | Tasks, notes, lists, files, links, tags, categories, and relationships stay visible from the project. |
| Contacts | People, clients, vendors, collaborators. | Contact tasks, notes, relationship context, and interaction history stay local and searchable. |
| Inbox | Safe holding area for unprocessed work. | Operator can capture first and organise later without data loss. |
| Tasks | Actions with optional status, dates, planning, and context. | Task changes persist after restart and appear in Today/calendar/search where relevant. |
| Notes | Local written reference. | Large notes remain editable and searchable without freezing the app. |
| Lists | Checklists, agendas, workflows, pipelines later. | List rows remain ordered, editable, and recoverable. |
| Files | Local attachment records copied into the workspace. | Missing file states are understandable and recoverable from backup or reattachment. |
| Links | Local records for URLs. | Malformed URLs are rejected or shown as fixable errors; external opening remains safe. |
| Tags/categories | Cross-work organisation. | Tag/category filters and saved views stay in sync with edits. |
| Relationships | Explicit links between records. | Related items are visible from both sides where applicable. |

## 6. Backups, exports, imports, and restore

In **Settings**, start from the intent sections instead of scanning every tool:

- **Appearance & readability** changes theme, density, font size, locale, and
  shortcut help.
- **Backup & restore** is the normal place to create backups and restore a
  backup into a fresh workspace folder.
- **Privacy & local-only** confirms telemetry/cloud sync are off and keeps
  optional network-capable features explicit.
- **Imports & exports** is for deliberate local file movement.
- **Advanced maintenance** is for troubleshooting, repair, and cleanup only.
- **Categories / metadata** manages organisation labels.

### When to back up

Create a manual backup:

- Before first serious use.
- Before app upgrades.
- Before imports.
- Before maintenance tools that repair, rebuild, clean up, or migrate data.
- After a large amount of important work is entered.

### Manual backup expectations

A valid backup should preserve:

- SQLite database data.
- Workspace metadata needed to identify the workspace.
- Attachment files referenced by file records.
- Enough activity/search state to recover or rebuild local views.

After creating a backup, verify at least one known project, one note/task, and one attachment can be found in the source workspace before relying on it.

### Before upgrading the app

Until Pseudico has a signed installer/update channel, upgrades are manual:

1. Quit the app.
2. Create a manual backup of every important workspace.
3. Keep the previous app build until the new build opens your workspace.
4. Replace only the app folder/bundle, not the workspace folder.
5. Open the workspace in the new build and confirm workspace health, search,
   attachments, and the backup list.
6. If anything looks wrong, quit and restore into a fresh workspace folder from
   the verified backup.

### Export expectations

Workspace export is for portable local data exchange and recovery testing. It is not a cloud sync feature.

- Export only to a local folder you control.
- Treat exported data as sensitive because it may contain project names, contact details, notes, links, and attachment references.
- Keep export files with the same care as the workspace folder.

### Restore expectations

Restore into a clean, empty workspace folder whenever possible:

1. Open **Settings → Backup & restore**.
2. Select **Choose restore folder** and pick the folder that should become the
   restored workspace. Do not choose the currently open workspace folder.
3. Select **Preview restore** on the backup you intend to recover.
4. Confirm the preview shows the current workspace, backup source, restore
   destination, included database/attachment status, and the new-workspace-only
   safety policy.
5. Run **Restore into new workspace** only after the destination is correct.
6. On success, use **Open restored workspace**, **Show restored folder**, or
   **Show backup folder** as the next safe action.

The advanced portable JSON restore in **Imports & exports** is for deliberate
local data-portability recovery only. Normal recovery should use backup restore.

After restoring:

1. Confirm the restored workspace opens without warnings.
2. Search for known project, contact, task, and note names.
3. Open at least one known attachment.
4. Check Today, dashboard, timeline/calendar, saved views, and collections for expected records.
5. Rebuild or verify the search index if the app reports stale search state.
6. Confirm recent activity includes restore or import evidence.

Do not delete the original workspace until the restored copy has been verified.

### Import expectations

For the internal pilot, treat imports as deliberate local file movement, not as
daily capture:

1. Create a manual backup first.
2. Use **Settings → Imports & exports** only with files or folders you already
   have on local disk.
3. Preview CSV/TSV and Markdown folder imports before executing.
4. After import, search for a known imported title/body token, check recent
   activity, and verify any copied attachment opens from the workspace
   attachment area.

Packaged QA for PSE-223 directly exercised CSV/TSV, Markdown folder,
standalone Markdown note IPC, EML email, and local ICS file imports in the
packaged runtime. Notion, Todoist, Trello, and Evernote remain service
foundations without a pilot operator UI path; IMAP remains adapter-required.
Do not represent those service-only foundations as ready operator importers.

## 7. Attachments and missing files

- Attached files should be copied into the workspace-controlled attachment area.
- Project/contact templates do not copy binary attachment files. When a
  template contains a file placeholder, the created project/contact shows a
  note named `File placeholder: ...` with the original local file metadata and
  instructions to reattach the source file. Treat that note as a reminder, not
  as an attached file.
- If an attachment is missing, do not remove the file record immediately.
- First run the attachment or workspace health check if available.
- If the file was moved outside the workspace, reattach it from the original source.
- If the workspace copy is missing, restore from a verified backup into a fresh workspace and compare.
- If many attachments are missing, stop work and escalate; this can indicate folder movement, backup failure, or manual deletion.

## 8. Maintenance tools

Use maintenance tools only when you understand the expected result.

| Tool area | Use when | Operator caution |
|---|---|---|
| Workspace health | Opening a workspace, after restore, or after warnings. | Save the health result before changing anything. |
| Backup status/retention | Verifying backup schedule and cleanup. | Never keep only one backup of important work. |
| Search rebuild | Search results look stale or incomplete. | Rebuild should not delete user data. |
| Attachment audit | Files appear missing or orphaned. | Quarantine/cleanup must be reversible or backed up first. |
| Import validation | Before importing JSON, CSV/TSV, Markdown, ENEX, or app exports. | Preview and validate before executing; service-only third-party foundations are not pilot UI importers. |
| Corruption recovery | Database is locked, unavailable, or corrupt. | Stop writing, copy the workspace folder, restore from backup into a new folder. |

## 9. Privacy and network expectations

Pseudico's product promise is local-only.

Expected:

- No hosted account.
- No telemetry or analytics.
- No cloud sync.
- No remote file storage.
- No team workspace dependency.
- Local database and local attachment storage.

Optional or future local-adjacent features, such as browser capture, IMAP import, web widgets, metadata fetching, or `.ics` import, must remain explicit, bounded, documented, and disabled or limited according to the relevant feature docs. Do not enable optional network-facing features during operator handoff unless the ticket explicitly includes the privacy review evidence.

## 10. Troubleshooting

| Problem | Operator response |
|---|---|
| App will not open a workspace | Confirm the folder still exists, is writable, and contains expected workspace metadata. Do not create a new workspace over the old folder. |
| Permission denied | Move to a writable local folder or fix OS folder permissions. Avoid protected system folders. |
| Database locked | Close duplicate app windows and other tools that might be accessing the database. If it persists, copy the workspace folder and escalate. |
| Database corrupt or unavailable | Stop using the workspace. Copy the whole folder. Restore the newest verified backup into a fresh folder. |
| Backup fails | Check disk space, permissions, and whether the workspace is on a stable local disk. Do not continue risky changes until a backup succeeds. |
| Restore fails | Keep the original backup unchanged. Try a fresh empty folder. Save the error message and escalate. |
| Search misses known content | Run search rebuild if available. If still wrong, record examples and escalate as an activity/search consistency issue. |
| Attachment missing | Do not delete the file record. Run attachment audit, reattach from source, or restore from backup. |
| Import rejected | Keep the original import file unchanged. Read validation errors, fix the source copy, and retry in a test workspace first. |
| App slow with large workspace | Close unused views, avoid huge date ranges, and record startup/search/dashboard timing for the performance ticket. |
| Unexpected network prompt or traffic | Stop, document the feature and action, and escalate because local-only guarantees may be at risk. |

## 11. Escalation checklist

When asking for help, provide:

- Pseudico version or commit/PR if known.
- Operating system.
- Workspace folder path.
- What you were trying to do.
- The exact error text or screenshot.
- Whether recent changes included import, restore, migration, backup cleanup, or manual file movement.
- Whether the original workspace folder and newest backup are still untouched.

Preserve:

- The original workspace folder.
- The newest successful backup.
- The failed backup/export/import file if applicable.
- Screenshots of warnings or errors.
- Any generated health, audit, or maintenance report.

## 12. Known limitations

Until the operator-readiness program is complete, do not overclaim release readiness.

Current limitations to explain honestly:

- Public distribution, installer signing, update path, and support packaging are still release-hardening concerns.
- Advanced rich-text editing remains future work; Markdown-first editing is the current model.
- Advanced saved-view builder UX and custom dashboard editing remain future work.
- Browser capture production bridge and broader local automation scheduling remain future work unless explicitly ticketed.
- External live calendar sync is excluded.
- Monthly/yearly recurrence, richer drag/drop calendar editing, and advanced planning UX remain future work.
- Broader third-party import execution remains staged behind service-level validation and fixture coverage unless a packaged operator UI is explicitly added and reviewed.
- Local-only does not replace device-level backups.

## 13. Handoff acceptance checklist

Pseudico is ready for a nontechnical operator only when:

- Fresh-workspace core journeys pass.
- Backup and restore work into a fresh workspace and are documented.
- Data survives restart.
- Search and activity logs stay consistent after writes, restore, and rebuild.
- Renderer code does not directly access SQLite or Node filesystem APIs.
- External URL opening remains allowlisted and safe.
- No unexpected network, telemetry, cloud, or account behavior exists.
- Performance is acceptable on representative larger workspaces.
- P0/P1 risks are fixed or explicitly accepted.
- The operator can follow this runbook without developer explanation.
