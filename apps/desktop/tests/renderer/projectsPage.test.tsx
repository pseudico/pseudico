import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  apiOk,
  type ActivitySummary,
  type CategorySummary,
  type CollectionEvaluationSummary,
  type CollectionSummary,
  type DatabaseHealthStatus,
  type InboxSummary,
  type IpcModuleStatus,
  type ItemSummary,
  type ListItemSummary,
  type ListSummary,
  type LocalWorkOsApi,
  type MetadataTargetSummary,
  type NoteSummary,
  type ProjectSummary,
  type SearchResultSummary,
  type TaskSummary,
  type TodayViewModelSummary,
  type WorkspaceSummary
} from "../../src/preload/api";
import { ProjectDetailPage } from "../../src/renderer/pages/ProjectDetailPage";
import { ProjectsPage } from "../../src/renderer/pages/ProjectsPage";
import { CollectionsPage } from "../../src/renderer/pages/CollectionsPage";
import { SearchPage } from "../../src/renderer/pages/SearchPage";
import { TagsCategoriesPage } from "../../src/renderer/pages/TagsCategoriesPage";
import { workspaceStore } from "../../src/renderer/state/workspaceStore";
import type { NoteCardViewModel, UniversalItemViewModel } from "@local-work-os/ui";

const workspace: WorkspaceSummary = {
  id: "workspace_1",
  name: "Personal Work",
  rootPath: "C:\\Work\\Personal",
  openedAt: "2026-05-01T00:00:00.000Z",
  schemaVersion: 1
};

const project: ProjectSummary = {
  id: "container_1",
  workspaceId: "workspace_1",
  type: "project",
  name: "Launch Plan",
  slug: "launch-plan",
  description: "Coordinate the launch work.",
  status: "active",
  categoryId: null,
  color: "#245c55",
  isFavorite: true,
  sortOrder: 0,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  archivedAt: null,
  deletedAt: null
};

const category: CategorySummary = {
  id: "category_1",
  workspaceId: "workspace_1",
  name: "Finance",
  slug: "finance",
  color: "#2c6b8f",
  description: null,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  deletedAt: null
};

const metadataTarget: MetadataTargetSummary = {
  targetType: "item",
  targetId: "item_1",
  workspaceId: "workspace_1",
  kind: "task",
  title: "Book launch venue",
  body: "Confirm the room hold before Friday.",
  status: "active",
  category: {
    id: "category_1",
    name: "Finance",
    slug: "finance",
    color: "#2c6b8f"
  },
  tags: [
    {
      id: "tag_1",
      name: "Launch",
      slug: "launch",
      source: "manual"
    }
  ],
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  archivedAt: null,
  deletedAt: null
};

const searchResult: SearchResultSummary = {
  id: "search_1",
  workspaceId: "workspace_1",
  targetType: "item",
  targetId: "item_1",
  kind: "task",
  title: "Book launch venue",
  body: "Confirm the room hold before Friday.",
  status: "open",
  tags: ["launch"],
  category: "Finance",
  updatedAt: "2026-05-01T00:00:00.000Z",
  archivedAt: null,
  deletedAt: null,
  containerId: "container_1",
  containerTitle: "Launch Plan",
  parentItemId: null,
  parentItemTitle: null,
  destinationPath: "/projects/container_1"
};

const projectItem: UniversalItemViewModel = {
  id: "item_1",
  type: "task",
  title: "Book launch venue",
  body: "Confirm the room hold before Friday.",
  status: "open",
  taskStatus: "open",
  dueAt: "2026-05-03T00:00:00.000Z",
  dueLabel: "Friday",
  pinned: true
} as UniversalItemViewModel;

const projectNote: NoteCardViewModel = {
  id: "item_note_1",
  type: "note",
  title: "Launch note",
  body: "Decision notes",
  status: "active",
  content: "# Decision notes\n\nConfirm launch plan.",
  preview: "Decision notes Confirm launch plan.",
  pinned: false
};

function moduleStatus(module: IpcModuleStatus["module"]): IpcModuleStatus {
  return {
    module,
    available: true,
    implemented: false,
    message: `${module} placeholder`
  };
}

function createMockApi(projects: ProjectSummary[] = []): LocalWorkOsApi {
  const health: DatabaseHealthStatus = {
    connected: true,
    schemaVersion: 1,
    workspaceExists: true,
    inboxExists: true,
    defaultDashboardExists: true,
    activityLogAvailable: true,
    searchIndexAvailable: true,
    databasePath: "C:\\Work\\Personal\\data\\local-work-os.sqlite",
    error: null
  };

  return {
    workspace: {
      createWorkspace: async () => apiOk(workspace),
      openWorkspace: async () => apiOk(workspace),
      validateWorkspace: async () =>
        apiOk({
          ok: true,
          workspaceRootPath: workspace.rootPath,
          paths: {
            workspaceRootPath: workspace.rootPath,
            manifestPath: `${workspace.rootPath}\\workspace.json`,
            dataPath: `${workspace.rootPath}\\data`,
            databasePath: health.databasePath!,
            attachmentsPath: `${workspace.rootPath}\\attachments`,
            backupsPath: `${workspace.rootPath}\\backups`,
            exportsPath: `${workspace.rootPath}\\exports`,
            logsPath: `${workspace.rootPath}\\logs`
          },
          problems: []
        }),
      getCurrentWorkspace: async () => apiOk(workspace),
      listRecentWorkspaces: async () => apiOk([])
    },
    database: {
      getHealthStatus: async () => apiOk(health)
    },
    inbox: {
      getInbox: async () => apiOk(inboxSummary()),
      listItems: async () => apiOk([itemSummary()]),
      moveItemToProject: async () =>
        apiOk({
          ...itemSummary(),
          containerId: project.id
        })
    },
    tasks: {
      create: async () => apiOk(taskSummary()),
      update: async () => apiOk(taskSummary()),
      complete: async () =>
        apiOk({
          ...taskSummary(),
          status: "completed",
          taskStatus: "done"
        }),
      reopen: async () => apiOk(taskSummary()),
      listByContainer: async () => apiOk([taskSummary()]),
      createTask: async () => apiOk(taskSummary()),
      updateTask: async () => apiOk(taskSummary()),
      completeTask: async () =>
        apiOk({
          ...taskSummary(),
          status: "completed",
          taskStatus: "done"
        }),
      reopenTask: async () => apiOk(taskSummary())
    },
    lists: {
      create: async () => apiOk(listSummary()),
      addItem: async () => apiOk(listItemSummary()),
      updateItem: async () => apiOk(listItemSummary()),
      completeItem: async () =>
        apiOk({
          ...listItemSummary(),
          status: "done",
          completedAt: "2026-05-01T01:00:00.000Z"
        }),
      reopenItem: async () => apiOk(listItemSummary()),
      bulkAddItems: async () => apiOk([listItemSummary()]),
      listByContainer: async () => apiOk([listSummary()]),
      createList: async () => apiOk(listSummary())
    },
    notes: {
      create: async () => apiOk(noteSummary()),
      update: async () => apiOk(noteSummary()),
      listByContainer: async () => apiOk([noteSummary()]),
      createNote: async () => apiOk(noteSummary()),
      updateNote: async () => apiOk(noteSummary())
    },
    projects: {
      create: async () => apiOk({ project, defaultTabId: "container_tab_1" }),
      update: async () => apiOk(project),
      archive: async () =>
        apiOk({
          ...project,
          status: "archived",
          archivedAt: "2026-05-01T01:00:00.000Z"
        }),
      softDelete: async () =>
        apiOk({
          ...project,
          deletedAt: "2026-05-01T01:00:00.000Z"
        }),
      list: async () => apiOk(projects),
      get: async () => apiOk(project),
      createProject: async () =>
        apiOk({ project, defaultTabId: "container_tab_1" }),
      updateProject: async () => apiOk(project),
      archiveProject: async () =>
        apiOk({
          ...project,
          status: "archived",
          archivedAt: "2026-05-01T01:00:00.000Z"
        }),
      softDeleteProject: async () =>
        apiOk({
          ...project,
          deletedAt: "2026-05-01T01:00:00.000Z"
        }),
      listProjects: async () => apiOk(projects),
      getProject: async () => apiOk(project)
    },
    categories: {
      create: async () => apiOk(category),
      update: async () => apiOk(category),
      delete: async () =>
        apiOk({ ...category, deletedAt: "2026-05-01T01:00:00.000Z" }),
      list: async () => apiOk([category]),
      assignToProject: async (input) =>
        apiOk({ ...project, categoryId: input.categoryId ?? null }),
      assignToItem: async (input) =>
        apiOk({ ...itemSummary(), categoryId: input.categoryId ?? null }),
      createCategory: async () => apiOk(category),
      updateCategory: async () => apiOk(category),
      deleteCategory: async () =>
        apiOk({ ...category, deletedAt: "2026-05-01T01:00:00.000Z" }),
      listCategories: async () => apiOk([category])
    },
    metadata: {
      listTagsWithCounts: async () =>
        apiOk([
          {
            id: "tag_1",
            workspaceId: "workspace_1",
            name: "Launch",
            slug: "launch",
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null,
            targetCount: 1
          }
        ]),
      listCategoriesWithCounts: async () =>
        apiOk([
          {
            ...category,
            targetCount: 1
          }
        ]),
      listTargetsByMetadata: async () => apiOk([metadataTarget])
    },
    search: {
      searchWorkspace: async () => apiOk([])
    },
    collections: {
      listCollections: async () => apiOk([collectionSummary()]),
      createTagCollection: async () => apiOk(collectionSummary()),
      createKeywordCollection: async () => apiOk({
        ...collectionSummary(),
        id: "saved_view_2",
        kind: "keyword",
        tagSlug: null,
        keyword: "supplier"
      }),
      evaluateCollection: async () => apiOk(collectionEvaluationSummary()),
      createTaskInCollection: async () =>
        apiOk({
          ...taskSummary(),
          tags: [
            {
              id: "tag_1",
              name: "Finance",
              slug: "finance",
              source: "manual"
            }
          ]
        })
    },
    today: {
      getViewModel: async () => apiOk(todayViewModelSummary())
    },
    activity: {
      listRecent: async () => apiOk([activitySummary()]),
      listForTarget: async () => apiOk([activitySummary()]),
      listRecentActivity: async () => apiOk([activitySummary()]),
      listActivityForTarget: async () => apiOk([activitySummary()])
    },
    containers: {
      getStatus: async () => apiOk(moduleStatus("containers"))
    },
    items: {
      getStatus: async () => apiOk(moduleStatus("items")),
      move: async () => apiOk(itemSummary()),
      archive: async () => apiOk({ ...itemSummary(), status: "archived" }),
      softDelete: async () =>
        apiOk({
          ...itemSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      getActivity: async () => apiOk([]),
      openInspector: async () =>
        apiOk({
          item: itemSummary(),
          activity: []
        }),
      moveItem: async () => apiOk(itemSummary()),
      archiveItem: async () => apiOk({ ...itemSummary(), status: "archived" }),
      softDeleteItem: async () =>
        apiOk({
          ...itemSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      getItemActivity: async () => apiOk([]),
      openItemInspector: async () =>
        apiOk({
          item: itemSummary(),
          activity: []
        })
    },
    files: {
      getStatus: async () => apiOk(moduleStatus("files"))
    }
  };
}

function inboxSummary(): InboxSummary {
  return {
    id: "container_inbox",
    workspaceId: "workspace_1",
    type: "inbox",
    name: "Inbox",
    slug: "inbox",
    description: null,
    status: "active",
    categoryId: null,
    color: null,
    isFavorite: true,
    sortOrder: 0,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    archivedAt: null,
    deletedAt: null
  };
}

function itemSummary(): ItemSummary {
  return {
    id: "item_1",
    workspaceId: "workspace_1",
    containerId: "container_inbox",
    containerTabId: null,
    type: "task",
    title: "Book launch venue",
    body: "Confirm the room hold before Friday.",
    categoryId: null,
    status: "active",
    sortOrder: 1024,
    pinned: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    completedAt: null,
    archivedAt: null,
    deletedAt: null
  };
}

function taskSummary(): TaskSummary {
  return {
    ...itemSummary(),
    type: "task",
    taskStatus: "open",
    priority: null,
    startAt: null,
    dueAt: "2026-05-03T00:00:00.000Z",
    allDay: true,
    timezone: null,
    taskCompletedAt: null,
    taskCreatedAt: "2026-05-01T00:00:00.000Z",
    taskUpdatedAt: "2026-05-01T00:00:00.000Z"
  };
}

function listItemSummary(): ListItemSummary {
  return {
    id: "list_item_1",
    workspaceId: "workspace_1",
    listItemParentId: null,
    listId: "item_list_1",
    title: "Confirm launch copy",
    body: null,
    status: "open",
    depth: 0,
    sortOrder: 1024,
    startAt: null,
    dueAt: null,
    completedAt: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    archivedAt: null,
    deletedAt: null
  };
}

function listSummary(): ListSummary {
  return {
    ...itemSummary(),
    id: "item_list_1",
    containerId: project.id,
    type: "list",
    title: "Launch checklist",
    displayMode: "checklist",
    showCompleted: true,
    progressMode: "count",
    listCreatedAt: "2026-05-01T00:00:00.000Z",
    listUpdatedAt: "2026-05-01T00:00:00.000Z",
    items: [listItemSummary()]
  };
}

function noteSummary(): NoteSummary {
  return {
    ...itemSummary(),
    id: "item_note_1",
    containerId: project.id,
    type: "note",
    title: "Launch note",
    body: "Decision notes Confirm launch plan.",
    format: "markdown",
    content: "# Decision notes\n\nConfirm launch plan.",
    preview: "Decision notes Confirm launch plan.",
    noteCreatedAt: "2026-05-01T00:00:00.000Z",
    noteUpdatedAt: "2026-05-01T00:00:00.000Z"
  };
}

function collectionSummary(): CollectionSummary {
  return {
    id: "saved_view_1",
    workspaceId: "workspace_1",
    name: "Finance",
    description: "Finance follow-ups",
    kind: "tag",
    tagSlug: "finance",
    keyword: null,
    isFavorite: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
}

function todayViewModelSummary(): TodayViewModelSummary {
  return {
    workspaceId: "workspace_1",
    generatedAt: "2026-05-01T00:00:00.000Z",
    localDate: "2026-05-01",
    backlogDays: 14,
    ranges: {
      today: {
        startInclusive: "2026-05-01T00:00:00.000Z",
        endExclusive: "2026-05-02T00:00:00.000Z"
      },
      overdueBacklog: {
        startInclusive: "2026-04-17T00:00:00.000Z",
        endExclusive: "2026-05-01T00:00:00.000Z"
      },
      tomorrow: {
        startInclusive: "2026-05-02T00:00:00.000Z",
        endExclusive: "2026-05-03T00:00:00.000Z"
      }
    },
    dueToday: [],
    overdueBacklog: [],
    tomorrowPreview: []
  };
}

function collectionEvaluationSummary(): CollectionEvaluationSummary {
  return {
    collection: collectionSummary(),
    total: 1,
    results: [
      {
        targetType: "item",
        targetId: "item_1",
        kind: "task",
        title: "Book launch venue",
        containerId: "container_1",
        containerType: "project",
        containerTitle: "Launch Plan",
        categoryId: "category_1",
        categoryName: "Finance",
        taskStatus: "open",
        dueAt: "2026-05-04T00:00:00.000Z",
        tags: ["finance"],
        destinationPath: "/projects/container_1/items/item_1"
      }
    ],
    groups: [
      {
        key: "container_1",
        label: "Launch Plan",
        results: [
          {
            targetType: "item",
            targetId: "item_1",
            kind: "task",
            title: "Book launch venue",
            containerId: "container_1",
            containerType: "project",
            containerTitle: "Launch Plan",
            categoryId: "category_1",
            categoryName: "Finance",
            taskStatus: "open",
            dueAt: "2026-05-04T00:00:00.000Z",
            tags: ["finance"],
            destinationPath: "/projects/container_1/items/item_1"
          }
        ]
      }
    ]
  };
}

function activitySummary(): ActivitySummary {
  return {
    id: "activity_1",
    workspaceId: "workspace_1",
    actorType: "local_user",
    action: "container_created",
    targetType: "container",
    targetId: "container_1",
    summary: "Created project \"Launch Plan\".",
    beforeJson: null,
    afterJson: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    actionLabel: "Container Created",
    actorLabel: "Local user",
    targetLabel: "Container container_1",
    description: "Created project \"Launch Plan\"."
  };
}

describe("Projects renderer pages", () => {
  afterEach(() => {
    workspaceStore.reset();
  });

  it("renders the empty Projects page for an open workspace", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter>
        <ProjectsPage apiClient={createMockApi()} />
      </MemoryRouter>
    );

    expect(html).toContain("Projects");
    expect(html).toContain("No projects yet");
    expect(html).toContain("Create project");
  });

  it("renders project detail metadata placeholders", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/projects/container_1"]}>
        <Routes>
          <Route
            path="/projects/:projectId"
            element={
              <ProjectDetailPage
                apiClient={createMockApi([project])}
                initialActivity={[activitySummary()]}
                initialProject={project}
                initialItems={[projectItem, projectNote]}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain("Launch Plan");
    expect(html).toContain("Status");
    expect(html).toContain("Category");
    expect(html).toContain("Tags");
    expect(html).toContain("Content feed");
    expect(html).toContain("Recent activity");
    expect(html).toContain("Created project &quot;Launch Plan&quot;.");
    expect(html).toContain("Book launch venue");
    expect(html).toContain("Launch note");
    expect(html).toContain("Decision notes Confirm launch plan.");
    expect(html).toContain("Edit note");
    expect(html).toContain("Complete");
    expect(html).toContain("Due");
    expect(html).toContain("Actions for Book launch venue");
  });

  it("renders the Tags & Categories browser with filters and grouped results", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter>
        <TagsCategoriesPage
          apiClient={createMockApi([project])}
          initialCategories={[
            {
              ...category,
              targetCount: 1
            }
          ]}
          initialTags={[
            {
              id: "tag_1",
              workspaceId: "workspace_1",
              name: "Launch",
              slug: "launch",
              createdAt: "2026-05-01T00:00:00.000Z",
              updatedAt: "2026-05-01T00:00:00.000Z",
              deletedAt: null,
              targetCount: 1
            }
          ]}
          initialSelectedTagSlugs={["launch"]}
          initialTargets={[metadataTarget]}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Tags &amp; Categories");
    expect(html).toContain("Launch");
    expect(html).toContain("data-tag-source=\"manual\"");
    expect(html).toContain("Finance");
    expect(html).toContain("Book launch venue");
    expect(html).toContain("Items");
  });

  it("renders global search results with type filters and source context", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter initialEntries={["/search?q=launch"]}>
        <SearchPage
          apiClient={createMockApi([project])}
          initialQuery="launch"
          initialKinds={["task"]}
          initialResults={[searchResult]}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Search");
    expect(html).toContain("Projects");
    expect(html).toContain("Tasks");
    expect(html).toContain("Book launch venue");
    expect(html).toContain("Confirm the room hold before Friday.");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("data-tag-source=\"manual\"");
  });

  it("renders collections with create controls, grouped results, and tag task creation", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter>
        <CollectionsPage
          apiClient={createMockApi([project])}
          initialCollections={[collectionSummary()]}
          initialEvaluation={collectionEvaluationSummary()}
          initialProjects={[project]}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Collections");
    expect(html).toContain("Tag slug");
    expect(html).toContain("Keyword");
    expect(html).toContain("Finance");
    expect(html).toContain("Finance follow-ups");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("Book launch venue");
    expect(html).toContain("Add task");
    expect(html).toContain("data-tag-source=\"manual\"");
  });
});
