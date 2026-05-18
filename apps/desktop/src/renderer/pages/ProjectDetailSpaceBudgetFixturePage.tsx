import {
  longDataFixtures,
  type FileCardViewModel,
  type ItemInspectorActivity,
  type ItemInspectorItem,
  type LinkCardViewModel,
  type ListCardViewModel,
  type LocationCardViewModel,
  type NoteCardViewModel,
  type ProjectHealthViewModel,
  type TaskCardViewModel,
  type UniversalItemViewModel
} from "@local-work-os/ui";
import type {
  ActivitySummary,
  CategorySummary,
  ContainerPreferencesSummary,
  ContainerTabContentSummary,
  ContainerTabSummary,
  ContactSummary,
  ProjectHealthSummary,
  ProjectSummary,
  RelatedContactSummary
} from "../../preload/api";
import { ProjectDetailPage } from "./ProjectDetailPage";

const workspaceId = "workspace_space_budget_fixture";
const projectId = "project_operator_room";
const now = "2026-05-18T09:30:00.000Z";

export function ProjectDetailSpaceBudgetFixturePage(): React.JSX.Element {
  return (
    <ProjectDetailPage
      disableLiveLoading
      initialActivity={fixtureActivity.map(toRecentActivity)}
      initialAvailableContacts={[fixtureContact]}
      initialCategories={[fixtureCategory]}
      initialInspector={{
        item: fixtureInspectorItem,
        activity: fixtureInspectorActivity
      }}
      initialItems={fixtureItems}
      initialPreferences={fixturePreferences}
      initialProject={fixtureProject}
      initialProjectHealth={toProjectHealthViewModel(fixtureProjectHealth)}
      initialRelatedContacts={[fixtureRelatedContact]}
      initialTabSummaries={fixtureTabSummaries}
      initialTabs={fixtureTabs}
    />
  );
}

const fixtureCategory: CategorySummary = {
  id: "category_delivery",
  workspaceId,
  name: "Client Delivery",
  slug: "client-delivery",
  color: "#245c55",
  description: "Operator-facing delivery, evidence, and launch readiness work.",
  createdAt: now,
  updatedAt: now,
  deletedAt: null
};

const fixtureProject: ProjectSummary = {
  id: projectId,
  workspaceId,
  type: "project",
  name: longDataFixtures.projectName,
  slug: "operator-room",
  description:
    "Replace the old launch plan with a local-first working room that keeps tasks, notes, files, links, locations, contacts, and recovery evidence readable in one place.",
  status: "active",
  categoryId: fixtureCategory.id,
  color: "#245c55",
  isFavorite: true,
  sortOrder: 0,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
  deletedAt: null
};

const fixtureContact: ContactSummary = {
  id: "contact_avery",
  workspaceId,
  type: "contact",
  name: longDataFixtures.contactName,
  slug: "avery-longform-ramirez",
  description: "Primary operator reviewer for the local handoff drill.",
  status: "active",
  categoryId: fixtureCategory.id,
  color: "#2c6b8f",
  isFavorite: true,
  sortOrder: 0,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
  deletedAt: null
};

const fixtureTabs: ContainerTabSummary[] = [
  tab("tab_next", "Next actions", true, 0),
  tab("tab_checklist", "Launch readiness checklist", false, 1),
  tab("tab_research", "Client approval notes, files, and links", false, 2)
];

const fixtureTags = [
  { id: "tag_operator", name: "operator-handoff", slug: "operator-handoff", source: "manual" as const },
  { id: "tag_local", name: "local-only", slug: "local-only", source: "manual" as const },
  { id: "tag_long", name: "long-data", slug: "long-data", source: "manual" as const }
];

const fixtureItems: UniversalItemViewModel[] = [
  {
    id: "task_handoff",
    type: "task",
    title: longDataFixtures.taskTitle,
    body: "Next action assigned to Avery; due date, project context, category, and tags stay visible without cramping the title.",
    status: "open",
    taskStatus: "open",
    categoryId: fixtureCategory.id,
    categoryLabel: fixtureCategory.name,
    categoryColor: fixtureCategory.color,
    containerTabId: "tab_next",
    dueLabel: "Today 4:00 PM",
    dueAt: "2026-05-18T16:00:00.000Z",
    priority: 2,
    pinned: true,
    sortOrder: 1,
    createdAt: now,
    updatedLabel: now,
    tags: fixtureTags,
    metadata: [
      { label: "Owner", value: "Avery" },
      { label: "Status", value: "Ready for review" }
    ]
  } as TaskCardViewModel,
  {
    id: "list_launch_readiness",
    type: "list",
    title: "Launch readiness checklist with backup restore, attachment audit, search rebuild, and sign-off rows",
    body: "Checklist rows keep their own editor instead of being flattened into tiny chips.",
    status: "active",
    categoryId: fixtureCategory.id,
    categoryLabel: fixtureCategory.name,
    containerTabId: "tab_next",
    sortOrder: 2,
    createdAt: now,
    updatedLabel: now,
    pinned: false,
    displayMode: "checklist",
    progressMode: "manual",
    showCompleted: true,
    tags: fixtureTags,
    listItems: [
      {
        id: "list_item_restore",
        title: "Verify restored workspace opens with the long filename and local attachment intact",
        body: null,
        listItemParentId: null,
        status: "open",
        depth: 0,
        sortOrder: 1,
        startAt: null,
        dueAt: "2026-05-18T15:00:00.000Z"
      },
      {
        id: "list_item_search",
        title: "Rebuild search index and confirm the note body is discoverable from Search",
        body: null,
        listItemParentId: null,
        status: "done",
        depth: 0,
        sortOrder: 2,
        startAt: null,
        dueAt: null
      }
    ]
  } as ListCardViewModel,
  {
    id: "note_client_approval",
    type: "note",
    title: "Client approval notes from the 17 May local ownership review",
    body: longDataFixtures.notePreview,
    status: "active",
    categoryId: fixtureCategory.id,
    categoryLabel: fixtureCategory.name,
    containerTabId: "tab_next",
    sortOrder: 3,
    createdAt: now,
    updatedLabel: now,
    pinned: false,
    tags: fixtureTags,
    content: `# Client approval notes\n\n${longDataFixtures.notePreview}`,
    preview: longDataFixtures.notePreview,
    format: "markdown",
    noteUpdatedAt: now,
    wikilinks: []
  } as NoteCardViewModel,
  {
    id: "file_restore_evidence",
    type: "file",
    title: longDataFixtures.filename,
    body: "PDF, version 3, 5.8 MB. The filename wraps but keeps the final extension visible.",
    status: "active",
    categoryId: fixtureCategory.id,
    categoryLabel: fixtureCategory.name,
    containerTabId: "tab_next",
    sortOrder: 4,
    createdAt: now,
    updatedLabel: now,
    pinned: false,
    tags: fixtureTags,
    attachment: {
      id: "attachment_restore_pdf",
      originalName: longDataFixtures.filename,
      storedName: longDataFixtures.filename,
      mimeType: "application/pdf",
      sizeBytes: 5800000,
      checksum: "sha256:space-budget-fixture",
      storagePath: `${longDataFixtures.path}/${longDataFixtures.filename}`,
      description: "Restore evidence PDF with attachment manifest."
    },
    missing: false,
    versions: []
  } as FileCardViewModel,
  {
    id: "link_local_recovery",
    type: "link",
    title: longDataFixtures.linkTitle,
    body: "Reference link keeps the domain visible so the operator can decide whether opening it is safe.",
    status: "active",
    categoryId: fixtureCategory.id,
    categoryLabel: fixtureCategory.name,
    containerTabId: "tab_next",
    sortOrder: 5,
    createdAt: now,
    updatedLabel: now,
    pinned: false,
    tags: fixtureTags,
    url: `https://${longDataFixtures.linkDomain}/operator/readiness`,
    normalizedUrl: `https://${longDataFixtures.linkDomain}/operator/readiness`,
    linkTitle: longDataFixtures.linkTitle,
    description: "Local-only recovery expectations and search-index reconciliation.",
    domain: longDataFixtures.linkDomain,
    faviconPath: null,
    previewImagePath: null,
    renderAsWidget: false,
    widgetWarningAcceptedAt: null,
    metadata: [{ label: "Domain", value: longDataFixtures.linkDomain }]
  } as LinkCardViewModel,
  {
    id: "location_review_room",
    type: "location",
    title: "Local pilot workspace review room and restore drill table",
    body: "Level 4, Building B — use the written address and meeting context as primary information; map preview stays secondary.",
    status: "active",
    categoryId: fixtureCategory.id,
    categoryLabel: fixtureCategory.name,
    containerTabId: "tab_next",
    sortOrder: 6,
    createdAt: now,
    updatedLabel: now,
    pinned: false,
    tags: fixtureTags,
    address: "Level 4, Building B, 28 Local Evidence Lane, Melbourne VIC",
    latitude: null,
    longitude: null,
    viewportCenterLat: null,
    viewportCenterLng: null,
    viewportZoom: 13,
    metadata: [{ label: "Context", value: "Operator walkthrough" }]
  } as LocationCardViewModel
];

const fixtureInspectorItem: ItemInspectorItem = {
  id: "note_client_approval",
  type: "note",
  title: "Client approval notes from the 17 May local ownership review",
  body: longDataFixtures.notePreview,
  categoryId: fixtureCategory.id,
  categoryLabel: fixtureCategory.name,
  containerId: projectId,
  containerTabId: "tab_next",
  status: "active",
  sortOrder: 3,
  pinned: false,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
  deletedAt: null,
  completedAt: null,
  startAt: null,
  dueAt: null,
  tags: fixtureTags
};

const fixtureActivity: ActivitySummary[] = [
  {
    id: "activity_note_updated",
    workspaceId,
    actorType: "local_user",
    action: "note_updated",
    targetType: "item",
    targetId: "note_client_approval",
    summary: "Updated client approval note and linked it to the launch readiness checklist.",
    beforeJson: null,
    afterJson: null,
    createdAt: now,
    actionLabel: "Note updated",
    actorLabel: "Local user",
    targetLabel: "Client approval notes",
    description: "Updated client approval note and linked it to the launch readiness checklist."
  }
];

const fixtureInspectorActivity: ItemInspectorActivity[] = fixtureActivity.map(toRecentActivity);

const fixtureProjectHealth: ProjectHealthSummary = {
  projectId,
  workspaceId,
  name: fixtureProject.name,
  status: "at-risk",
  color: fixtureProject.color,
  generatedAt: now,
  openTaskCount: 4,
  completedTaskCount: 1,
  overdueTaskCount: 1,
  upcomingTaskCount: 2,
  waitingTaskCount: 1,
  totalTaskCount: 5,
  completionRatio: 0.2,
  staleAfterDays: 7,
  lastActivityAt: now,
  isStale: false,
  hasRecentActivity: true,
  nextDueTask: {
    itemId: "task_handoff",
    title: longDataFixtures.taskTitle,
    dueAt: "2026-05-18T16:00:00.000Z",
    taskStatus: "open",
    priority: 2
  },
  nextTask: {
    itemId: "task_handoff",
    title: longDataFixtures.taskTitle,
    dueAt: "2026-05-18T16:00:00.000Z",
    taskStatus: "open",
    priority: 2
  },
  healthBadges: [
    { kind: "overdue", label: "1 overdue", tone: "risk" },
    { kind: "upcoming", label: "2 upcoming", tone: "info" }
  ],
  recentActivity: fixtureActivity
};

const fixtureRelatedContact: RelatedContactSummary = {
  relationshipId: "relationship_avery_project",
  relationshipCreatedAt: now,
  contact: fixtureContact,
  openTaskCount: 2,
  recentActivityCount: 1,
  recentActivity: fixtureActivity
};

const fixtureTabSummaries: ContainerTabContentSummary[] = fixtureTabs.map((tabSummary, index) => ({
  tab: tabSummary,
  totalItemCount: index === 0 ? 6 : index === 1 ? 1 : 4,
  openTaskCount: index === 0 ? 1 : 0,
  completedTaskCount: index === 0 || index === 1 ? 1 : 0,
  overdueTaskCount: index === 0 ? 1 : 0,
  upcomingTaskCount: index === 0 ? 1 : 0,
  noteCount: index === 0 || index === 2 ? 1 : 0,
  fileCount: index === 0 || index === 2 ? 1 : 0,
  linkCount: index === 0 || index === 2 ? 1 : 0,
  listCount: index === 0 || index === 1 ? 1 : 0,
  openTaskPreviews:
    index === 0
      ? [
          {
            itemId: "task_handoff",
            type: "task",
            title: longDataFixtures.taskTitle,
            status: "open",
            preview: "Due today with local handoff evidence.",
            dueAt: "2026-05-18T16:00:00.000Z",
            createdAt: now,
            updatedAt: now,
            kind: "open_task"
          }
        ]
      : [],
  recentContentPreviews: []
}));

const fixturePreferences: ContainerPreferencesSummary = {
  workspaceId,
  containerId: projectId,
  updatedAt: now,
  defaultView: "feed",
  defaultTabId: "tab_next",
  showCompleted: true,
  grouping: "none",
  defaultQuickAddType: "task",
  summaryFirst: false,
  compactMode: false
};

function tab(
  id: string,
  name: string,
  isDefault: boolean,
  sortOrder: number
): ContainerTabSummary {
  return {
    id,
    workspaceId,
    containerId: projectId,
    name,
    description: null,
    sortOrder,
    isDefault,
    createdAt: now,
    updatedAt: now,
    hiddenAt: null,
    archivedAt: null,
    deletedAt: null
  };
}

function toRecentActivity(activity: ActivitySummary): ItemInspectorActivity {
  return {
    id: activity.id,
    action: activity.action,
    actorType: activity.actorType,
    actionLabel: activity.actionLabel,
    actorLabel: activity.actorLabel,
    targetLabel: activity.targetLabel,
    summary: activity.summary,
    description: activity.description,
    createdAt: activity.createdAt
  };
}

function toProjectHealthViewModel(
  health: ProjectHealthSummary
): ProjectHealthViewModel {
  return {
    projectId: health.projectId,
    name: health.name,
    status: health.status,
    color: health.color,
    openTaskCount: health.openTaskCount,
    completedTaskCount: health.completedTaskCount,
    overdueTaskCount: health.overdueTaskCount,
    upcomingTaskCount: health.upcomingTaskCount,
    waitingTaskCount: health.waitingTaskCount,
    totalTaskCount: health.totalTaskCount,
    completionRatio: health.completionRatio,
    staleAfterDays: health.staleAfterDays,
    lastActivityAt: health.lastActivityAt,
    isStale: health.isStale,
    hasRecentActivity: health.hasRecentActivity,
    nextDueTask: health.nextDueTask,
    nextTask: health.nextTask,
    healthBadges: health.healthBadges,
    recentActivity: health.recentActivity.map(toRecentActivity)
  };
}
