import { useSearchParams } from "react-router-dom";
import { longDataFixtures } from "@local-work-os/ui";
import type {
  CategoryCountSummary,
  CollectionEvaluationSummary,
  CollectionSummary,
  ContactSummary,
  ProjectSummary,
  SearchResultSummary,
  SmartListSummary,
  TagCountSummary,
  WorkspaceSummary
} from "../../preload/api";
import { CollectionsPage } from "./CollectionsPage";
import { SearchPage } from "./SearchPage";

const workspaceId = "workspace_search_collections_fixture";
const projectId = "project_launch_readiness_fixture";
const contactId = "contact_operator_partner_fixture";
const now = "2026-05-18T10:00:00.000Z";

export function SearchCollectionsSpaceBudgetFixturePage(): React.JSX.Element {
  const [params] = useSearchParams();
  const surface = params.get("surface");

  if (surface === "collections") {
    return (
      <CollectionsPage
        disableLiveLoading
        initialCategories={[fixtureCategory]}
        initialCollections={fixtureCollections}
        initialContacts={[fixtureContact]}
        initialEvaluation={fixtureCollectionEvaluation}
        initialProjects={[fixtureProject]}
        initialSmartLists={fixtureSmartLists}
        initialTags={fixtureTags}
        initialWorkspace={fixtureWorkspace}
      />
    );
  }

  return (
    <SearchPage
      disableLiveLoading
      initialQuery="launch @client type:file OR type:note due:<7d status:open"
      initialResults={fixtureSearchResults}
      initialWorkspace={fixtureWorkspace}
    />
  );
}

const fixtureWorkspace: WorkspaceSummary = {
  id: workspaceId,
  name: "PSE-235 Search Collections Fixture",
  rootPath: "C:\\Users\\Operator\\Pseudico Search Fixture",
  openedAt: now,
  schemaVersion: 1
};

const fixtureCategory: CategoryCountSummary = {
  id: "category_delivery",
  workspaceId,
  name: "Client Delivery",
  slug: "client-delivery",
  color: "#245c55",
  description: "Searchable launch, handoff, and recovery work.",
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  targetCount: 12,
  containerCount: 2,
  itemCount: 10
};

const fixtureTags: TagCountSummary[] = [
  {
    id: "tag_client",
    workspaceId,
    name: "client",
    slug: "client",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    targetCount: 8,
    itemCount: 8
  },
  {
    id: "tag_launch",
    workspaceId,
    name: "launch",
    slug: "launch",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    targetCount: 7,
    itemCount: 7
  }
];

const fixtureProject: ProjectSummary = {
  id: projectId,
  workspaceId,
  type: "project",
  name: longDataFixtures.projectName,
  slug: "operator-search-fixture",
  description:
    "A long project container name proving search result context remains readable.",
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
  id: contactId,
  workspaceId,
  type: "contact",
  name: longDataFixtures.contactName,
  slug: "avery-longform-ramirez",
  description: "Operator partner with client launch approvals and follow-up notes.",
  status: "active",
  categoryId: fixtureCategory.id,
  color: "#387d8f",
  isFavorite: true,
  sortOrder: 0,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
  deletedAt: null
};

const fixtureSearchResults: SearchResultSummary[] = [
  {
    id: "search_task_legacy_redirect",
    workspaceId,
    targetType: "item",
    targetId: "item_redirect_task",
    kind: "task",
    title:
      "Confirm redirect owner for the thirty eight legacy pages before the content freeze and client review",
    body: "Next action assigned to Maya; keep the owner and due date visible.",
    status: "open",
    tags: ["launch", "client"],
    category: fixtureCategory.name,
    updatedAt: now,
    archivedAt: null,
    deletedAt: null,
    containerId: projectId,
    containerTitle: fixtureProject.name,
    parentItemId: null,
    parentItemTitle: null,
    destinationPath: `/projects/${projectId}`,
    dueAt: "2026-05-19T10:30:00.000Z",
    taskStatus: "todo",
    titleHighlights: [
      { text: "Confirm redirect owner for the thirty eight legacy pages before the content freeze and ", match: false },
      { text: "client", match: true },
      { text: " review", match: false }
    ]
  },
  {
    id: "search_note_client_approval",
    workspaceId,
    targetType: "item",
    targetId: "item_client_note",
    kind: "note",
    title: "Client approval notes from 17 May with launch caveats and service-page wording",
    body: longDataFixtures.notePreview,
    status: "active",
    tags: ["client", "writing"],
    category: fixtureCategory.name,
    updatedAt: now,
    archivedAt: null,
    deletedAt: null,
    containerId: projectId,
    containerTitle: fixtureProject.name,
    parentItemId: null,
    parentItemTitle: null,
    destinationPath: `/projects/${projectId}`,
    excerpt: {
      text: longDataFixtures.notePreview,
      segments: [
        { text: "The workspace should preserve the full paragraph of context so the operator can understand what changed, why it matters, where the supporting files live, and what the next safe action is without opening three unrelated panels.", match: true }
      ]
    }
  },
  {
    id: "search_file_redlines",
    workspaceId,
    targetType: "item",
    targetId: "item_redline_file",
    kind: "file",
    title: longDataFixtures.filename,
    body: "PDF, version 3, 5.8 MB; extension remains visible in result and preview.",
    status: "ready",
    tags: ["files", "client"],
    category: fixtureCategory.name,
    updatedAt: "2026-05-17T15:20:00.000Z",
    archivedAt: null,
    deletedAt: null,
    containerId: projectId,
    containerTitle: fixtureProject.name,
    parentItemId: null,
    parentItemTitle: null,
    destinationPath: `/projects/${projectId}`
  },
  {
    id: "search_link_analytics",
    workspaceId,
    targetType: "item",
    targetId: "item_analytics_link",
    kind: "link",
    title: longDataFixtures.linkTitle,
    body: `${longDataFixtures.linkDomain} remains visible before opening an external reference.`,
    status: "captured",
    tags: ["launch", "reference"],
    category: fixtureCategory.name,
    updatedAt: "2026-05-18T09:56:00.000Z",
    archivedAt: null,
    deletedAt: null,
    containerId: contactId,
    containerTitle: fixtureContact.name,
    parentItemId: null,
    parentItemTitle: null,
    destinationPath: `/contacts/${contactId}`
  }
];

const fixtureCollections: CollectionSummary[] = [
  {
    id: "collection_launch_blockers",
    workspaceId,
    name: "Launch blockers: client work due in the next seven days",
    description: "Saved collection for open launch work that needs review.",
    kind: "keyword",
    tagSlug: null,
    keyword: "launch @client due:<7d status:open",
    isFavorite: true,
    createdAt: now,
    updatedAt: now,
    viewMode: "list"
  },
  {
    id: "collection_file_versions",
    workspaceId,
    name: "Files needing version check before operator handoff",
    description: "Saved collection for attachment and PDF review.",
    kind: "tag",
    tagSlug: "files",
    keyword: null,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    viewMode: "list"
  }
];

const fixtureSmartLists: SmartListSummary[] = [
  {
    id: "smart_list_launch_due",
    workspaceId,
    name: "Open client launch work with files, notes, and due dates",
    description: "Readable filter summary for a saved smart list.",
    criteria: {
      match: "all",
      includeItems: true,
      includeContainers: true,
      itemTypes: ["task", "note", "file", "link"],
      tagSlugs: ["client", "launch"],
      categoryMode: "is",
      taskStatuses: ["todo", "in_progress"],
      archivedFilter: "active",
      dueFilter: "next7Days",
      groupBy: "type",
      sortField: "updatedAt",
      sortDirection: "desc"
    },
    query: { conditions: ["tag:client", "tag:launch", "due:next7Days"] },
    isFavorite: true,
    createdAt: now,
    updatedAt: now
  }
];

const fixtureCollectionEvaluation: CollectionEvaluationSummary = {
  collection: fixtureCollections[0]!,
  total: 4,
  results: fixtureSearchResults.map((result) => ({
    targetType: result.targetType === "container" ? "container" : "item",
    targetId: result.targetId,
    kind: result.kind,
    title: result.title,
    containerId: result.containerId ?? projectId,
    containerType: result.containerId === contactId ? "contact" : "project",
    containerTitle: result.containerTitle ?? fixtureProject.name,
    categoryId: fixtureCategory.id,
    categoryName: result.category,
    taskStatus: result.taskStatus ?? null,
    taskPriority: result.kind === "task" ? 2 : null,
    dueAt: result.dueAt ?? null,
    tags: result.tags,
    destinationPath: result.destinationPath ?? "/collections"
  })),
  groups: [
    {
      key: "task",
      label: "Tasks",
      results: [
        {
          targetType: "item",
          targetId: fixtureSearchResults[0]!.targetId,
          kind: "task",
          title: fixtureSearchResults[0]!.title,
          containerId: projectId,
          containerType: "project",
          containerTitle: fixtureProject.name,
          categoryId: fixtureCategory.id,
          categoryName: fixtureCategory.name,
          taskStatus: "todo",
          taskPriority: 2,
          dueAt: "2026-05-19T10:30:00.000Z",
          tags: ["launch", "client"],
          destinationPath: `/projects/${projectId}`
        }
      ]
    },
    {
      key: "files-notes-links",
      label: "Notes, files, and links",
      results: fixtureSearchResults.slice(1).map((result) => ({
        targetType: "item",
        targetId: result.targetId,
        kind: result.kind,
        title: result.title,
        containerId: result.containerId ?? projectId,
        containerType: result.containerId === contactId ? "contact" : "project",
        containerTitle: result.containerTitle ?? fixtureProject.name,
        categoryId: fixtureCategory.id,
        categoryName: fixtureCategory.name,
        taskStatus: null,
        taskPriority: null,
        dueAt: null,
        tags: result.tags,
        destinationPath: result.destinationPath ?? "/collections"
      }))
    }
  ],
  page: {
    limit: 50,
    offset: 0,
    hasMore: false
  }
};
