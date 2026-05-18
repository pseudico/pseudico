import type {
  MixedFeedItemProps,
  ReadableWorkRowProps,
  SpaceBudgetInspectorProps,
  TimelineSpaceRowProps
} from "../components/SpaceBudgetPrimitives";

export const longDataFixtures = {
  taskTitle:
    "Prepare the operator handoff checklist with backup evidence, long filename verification, and follow-up owner notes before Thursday review",
  notePreview:
    "The workspace should preserve the full paragraph of context so the operator can understand what changed, why it matters, where the supporting files live, and what the next safe action is without opening three unrelated panels.",
  filename:
    "2026-05-operator-readiness-backup-restore-evidence-with-attachment-manifest-v03.final.pdf",
  linkTitle:
    "Reference notes for local-only import validation, recovery expectations, and search-index reconciliation after workspace restore",
  linkDomain: "docs.local-work-os.example",
  projectName:
    "Client onboarding program with legal review, vendor security notes, and launch readiness tasks",
  contactName:
    "Dr. Avery Longform-Ramirez, Operations Partner for Field Implementation",
  path:
    "Workspaces/Pseudico Pilot/backups/2026-05/operator-handoff/verified-restore-target",
  tags: ["operator-handoff", "backup-proof", "long-data", "space-budget"],
  timelineTitle:
    "Coordinate multi-day restore drill, attachment audit, search rebuild, and final operator sign-off"
} as const;

export const spaceBudgetReadableRowFixture = {
  kind: "task",
  title: longDataFixtures.taskTitle,
  body: longDataFixtures.notePreview,
  metadata: [
    { label: "Project", value: longDataFixtures.projectName },
    { label: "Due", value: "Tomorrow 4:00 PM" },
    { label: "Status", value: "Ready for review" }
  ]
} satisfies ReadableWorkRowProps;

export const spaceBudgetMixedFeedFixtures = [
  {
    itemType: "task",
    title: longDataFixtures.taskTitle,
    preview: "Two-line primary title allowance keeps the next action readable.",
    metadata: [
      { label: "Container", value: longDataFixtures.projectName },
      { label: "Due", value: "Today" }
    ]
  },
  {
    itemType: "note",
    title: "Restore run notes and caveats",
    preview: longDataFixtures.notePreview,
    metadata: [{ label: "Tags", value: longDataFixtures.tags.join(", ") }]
  },
  {
    itemType: "file",
    title: longDataFixtures.filename,
    preview: "Filename keeps the extension visible instead of becoming an icon-only attachment.",
    metadata: [{ label: "Path", value: longDataFixtures.path }]
  },
  {
    itemType: "link",
    title: longDataFixtures.linkTitle,
    preview: "Domain remains visible so the operator can trust the reference before opening.",
    metadata: [{ label: "Domain", value: longDataFixtures.linkDomain }]
  },
  {
    itemType: "location",
    title: "Local pilot workspace review room",
    preview: "Level 4, Building B — use the written address as primary context; map previews are secondary.",
    metadata: [{ label: "Context", value: "Operator walkthrough" }]
  }
] satisfies MixedFeedItemProps[];

export const spaceBudgetInspectorFixture = {
  eyebrow: "Selected item",
  title: longDataFixtures.taskTitle,
  body: longDataFixtures.notePreview,
  metadata: [
    { label: "Contact", value: longDataFixtures.contactName },
    { label: "File", value: longDataFixtures.filename },
    { label: "Link", value: `${longDataFixtures.linkDomain} — ${longDataFixtures.linkTitle}` }
  ]
} satisfies SpaceBudgetInspectorProps;

export const spaceBudgetTimelineFixture = {
  title: longDataFixtures.timelineTitle,
  meta: `${longDataFixtures.projectName} · P2 · Local-only evidence`,
  dateLabel: "May 18–20",
  statusLabel: "In progress",
  offsetPercent: 18,
  widthPercent: 22,
  color: "#245c55"
} satisfies TimelineSpaceRowProps;
