export type HelpArticleId =
  | "getting-started"
  | "capture-and-triage"
  | "projects-contacts"
  | "templates-workflows"
  | "keyboard-commands"
  | "operator-runbook"
  | "release-readiness";

export type HelpArticle = {
  id: HelpArticleId;
  title: string;
  summary: string;
  category: "Start" | "Workflows" | "Reference";
  body: string;
  relatedRoutes: readonly string[];
};

export type OnboardingChecklistItem = {
  id: string;
  title: string;
  description: string;
  helpArticleId: HelpArticleId;
};

export const onboardingChecklist: readonly OnboardingChecklistItem[] = [
  {
    id: "open-workspace",
    title: "Open or create a workspace",
    description:
      "Confirm the app is pointed at the local folder that owns your database, attachments, backups, and exports.",
    helpArticleId: "getting-started"
  },
  {
    id: "capture-first-task",
    title: "Capture the first task",
    description:
      "Use Quick Start or the Inbox to create a task before deciding where it belongs.",
    helpArticleId: "capture-and-triage"
  },
  {
    id: "create-project",
    title: "Create a project or contact",
    description:
      "Move work out of the Inbox into a project or contact container with notes, lists, links, and files beside it.",
    helpArticleId: "projects-contacts"
  },
  {
    id: "learn-shortcuts",
    title: "Learn the command and keyboard guide",
    description:
      "Use command palette, Quick Start, search, markdown, and planning shortcuts without leaving the keyboard.",
    helpArticleId: "keyboard-commands"
  }
];

export const helpArticles: readonly HelpArticle[] = [
  {
    id: "getting-started",
    title: "Getting started with a local workspace",
    summary:
      "Create or open the local folder that contains the SQLite database, attachments, backups, and exports.",
    category: "Start",
    relatedRoutes: ["/welcome", "/workspace", "/settings"],
    body: `# Getting started with a local workspace

Local Work OS is a local-only desktop app. Your workspace folder owns the app data, the SQLite database, attachment copies, backups, and export files.

## First run checklist

- Create or open a workspace from the Welcome screen.
- Confirm the workspace home shows the expected local folder path.
- Use the Inbox for quick capture before you know the right project or contact.
- Keep backups local and verify exports before deleting anything important.

## Local-only boundaries

- No hosted account is required.
- Cloud sync, telemetry, team workspaces, public sharing, and remote file storage are outside the current product scope.
- Renderer screens should never ask you for arbitrary filesystem or database access; local file actions go through the desktop app boundary.`
  },
  {
    id: "capture-and-triage",
    title: "Capture and triage work",
    summary:
      "Use the Inbox and Quick Start to capture tasks, notes, lists, links, and files before organizing them.",
    category: "Workflows",
    relatedRoutes: ["/inbox", "/today", "/search"],
    body: `# Capture and triage work

The Inbox is the safe place for unprocessed work. Capture first, then move items into a project or contact once the context is clear.

## Capture flow

- Use Quick Start from the top bar for the fastest entry point.
- Add small tasks directly in the Inbox.
- Use lists when a captured idea already has multiple steps.
- Search can find local tasks, notes, projects, and metadata after they are indexed.

## Triage flow

- Review the Inbox regularly.
- Move project work to Projects and client/person work to Contacts.
- Add tags or categories when they help future saved views.
- Prefer archive or soft delete for user data that should leave active feeds.`
  },
  {
    id: "projects-contacts",
    title: "Projects, contacts, and mixed content",
    summary:
      "Understand containers as local workspaces for tasks, notes, lists, files, links, metadata, and relationships.",
    category: "Workflows",
    relatedRoutes: ["/projects", "/contacts", "/tags-categories", "/collections"],
    body: `# Projects, contacts, and mixed content

Projects and contacts are containers. A container can hold tasks, notes, lists, links, files, tabs, tags, categories, and relationships.

## Project containers

- Use projects for outcomes, deliverables, and ongoing bodies of work.
- Keep related notes, links, files, lists, and tasks together.
- Use project health and dashboard views for review.

## Contact containers

- Use contacts for clients, collaborators, vendors, or people-centered work.
- Store tasks and notes beside interaction history and relationship context.
- Use labels and fields to keep contact details structured.

## Metadata

- Tags and categories cut across containers.
- Collections and saved views are projections over the local object graph.
- Search and dashboards should reflect relevant content changes.`
  },
  {
    id: "templates-workflows",
    title: "Templates and sample workflows",
    summary:
      "Use local templates and manual workflows to repeat common project, contact, and list structures.",
    category: "Workflows",
    relatedRoutes: ["/templates", "/workflows", "/projects"],
    body: `# Templates and sample workflows

Templates and workflows help repeat local patterns without cloud services or hosted automation.

## Sample workflow ideas

- Project kickoff: create a project, add a checklist, add a planning note, and tag it with @kickoff.
- Client follow-up: create a contact task, add a due date, and link it to the related project.
- Weekly review: open Today, review overdue work, then check dashboard and timeline summaries.

## Template guidance

- Save reusable project, contact, or list structures as local templates.
- Export template packs only to local files that you control.
- Keep templates generic; do not embed secrets, credentials, or proprietary reference-product assets.`
  },
  {
    id: "keyboard-commands",
    title: "Keyboard and command guide",
    summary:
      "Use command palette, Quick Start, search, navigation, markdown, and planning shortcuts.",
    category: "Reference",
    relatedRoutes: ["/workspace", "/inbox", "/search", "/today"],
    body: `# Keyboard and command guide

The app is designed to be keyboard friendly. Some shortcuts depend on the active screen and whether a text field is focused.

## Global commands

- Ctrl/Cmd+K opens the command palette.
- Quick Start opens from the top bar and creates context-aware tasks, notes, lists, links, files, projects, or contacts.
- Search from the top bar navigates to local workspace search.
- Recent navigation reopens recently viewed local targets.

## Markdown editing

- Ctrl/Cmd+Enter saves where the editor supports a save shortcut.
- Ctrl/Cmd+B toggles bold.
- Ctrl/Cmd+I toggles italic.
- Ctrl/Cmd+K creates a link.
- Ctrl/Cmd+E wraps inline code.

## Planning surfaces

- Use Today for current work.
- Use Timeline and Calendar for dated work.
- Use Dashboard for local status and review.`
  },
  {
    id: "operator-runbook",
    title: "Operator runbook",
    summary:
      "Use Pseudico safely without a developer nearby, including daily workflow, backup, restore, recovery, and known limitations.",
    category: "Reference",
    relatedRoutes: ["/help", "/settings", "/workspace", "/dashboard", "/today", "/search"],
    body: `# Operator runbook

This article mirrors the short in-app version of docs/OPERATOR_RUNBOOK.md. Use it when Pseudico is being handed to a nontechnical operator.

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

Current readiness should not be overclaimed: Pseudico remains pilot-ready until the operator-readiness report closes the remaining P0/P1 risks.`
  },
  {
    id: "release-readiness",
    title: "Release readiness and local data safety",
    summary:
      "Review local checks, release limitations, backups, exports, and workspace data boundaries.",
    category: "Reference",
    relatedRoutes: ["/settings", "/workspace", "/help"],
    body: `# Release readiness and local data safety

Use this guide before a release-candidate review or before relying on a new workspace for important work.

## Before a release candidate

- Run the documented local checks: lint, typecheck, tests, build, package, and package smoke where relevant.
- Review the release notes and known limitations in docs/RELEASE.md.
- Confirm all release work stays local-only: no hosted account, telemetry, cloud sync, public sharing, or remote file storage is required.
- Confirm workspace data, attachments, backups, exports, and logs are created under user-controlled local workspace folders, not inside the app bundle.

## Protecting local data

- Create a manual backup before risky maintenance or migration work.
- Keep exported workspace JSON and Markdown/CSV bundles in a local folder you control.
- Verify imports or restores with a separate test workspace before replacing important local data.
- Keep installer/signing/update decisions separate from workspace data access so a user never loses access to their local files.`
  }
];

export function listHelpArticles(): readonly HelpArticle[] {
  return helpArticles;
}

export function getHelpArticle(id: HelpArticleId): HelpArticle {
  return helpArticles.find((article) => article.id === id) ?? helpArticles[0]!;
}

export function getHelpArticlesForRoute(pathname: string): readonly HelpArticle[] {
  const normalizedPath = normalizeHelpPath(pathname);
  const matches = helpArticles.filter((article) =>
    article.relatedRoutes.some(
      (route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`)
    )
  );

  return matches.length === 0 ? [getHelpArticle("getting-started")] : matches;
}

function normalizeHelpPath(pathname: string): string {
  const pathOnly = pathname.split("?")[0] ?? "";

  if (pathOnly.length === 0) {
    return "/";
  }

  return pathOnly === "/" ? pathOnly : pathOnly.replace(/\/+$/, "");
}
