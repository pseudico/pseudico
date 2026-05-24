# Operator runbook

Use this guide when Pseudico is being handed to a nontechnical operator.

## Before real work

- Create or open a local workspace.
- Add a test Inbox task and note.
- Close and reopen the app.
- Confirm the test records persist.
- Create a manual backup.

## Daily use

- Capture unprocessed work in the Inbox.
- Move work into projects or contacts when context is clear.
- Use tags, categories, and relationships to make work findable.
- Use Today for current action, Dashboard for review, and Search when you know part of a title, note, tag, category, or context.
- Use Workflows only for predefined guided beta routines; always read the
  preview and confirm only when the planned tasks, notes, and links are clear.

## Recovery basics

- Back up before imports, upgrades, migrations, or cleanup.
- For manual app upgrades, quit the app, back up important workspaces, replace
  only the app folder/bundle, then reopen and verify workspace health before
  deleting the previous build.
- Restore into a fresh workspace folder.
- Verify restored projects, contacts, tasks, notes, attachments, search, saved views, dashboard, timeline/calendar, and recent activity.
- Do not delete the original workspace until the restored copy is verified.

## What not to do

- Do not edit the SQLite database directly.
- Do not manually delete workspace attachment, backup, export, or data folders.
- Do not restore over the only active copy of important work.
- Do not enable optional network-facing features during handoff unless the relevant ticket includes privacy evidence.
- Do not expect Workflows to run in the background, execute scripts, send
  messages, or contact cloud services.

See `docs/OPERATOR_RUNBOOK.md` for the full runbook and troubleshooting checklist.
