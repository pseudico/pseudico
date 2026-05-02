import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  apiOk,
  type DatabaseHealthStatus,
  type InboxSummary,
  type IpcModuleStatus,
  type ItemSummary,
  type LocalWorkOsApi,
  type ProjectSummary,
  type WorkspaceSummary
} from "../../src/preload/api";
import { InboxPage } from "../../src/renderer/pages/InboxPage";
import { workspaceStore } from "../../src/renderer/state/workspaceStore";

const workspace: WorkspaceSummary = {
  id: "workspace_1",
  name: "Personal Work",
  rootPath: "C:\\Work\\Personal",
  openedAt: "2026-05-01T00:00:00.000Z",
  schemaVersion: 1
};

const inboxItem: ItemSummary = {
  id: "item_1",
  workspaceId: "workspace_1",
  containerId: "container_inbox",
  containerTabId: null,
  type: "task",
  title: "Call supplier",
  body: "Ask about Friday delivery.",
  categoryId: "category_ops",
  status: "active",
  sortOrder: 1024,
  pinned: false,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  completedAt: null,
  archivedAt: null,
  deletedAt: null
};

const project: ProjectSummary = {
  id: "container_project_1",
  workspaceId: "workspace_1",
  type: "project",
  name: "Launch Plan",
  slug: "launch-plan",
  description: "Coordinate the launch work.",
  status: "active",
  categoryId: null,
  color: "#245c55",
  isFavorite: false,
  sortOrder: 0,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  archivedAt: null,
  deletedAt: null
};

describe("Inbox renderer page", () => {
  afterEach(() => {
    workspaceStore.reset();
  });

  it("asks for a workspace before showing Inbox content", () => {
    const html = renderToString(
      <MemoryRouter>
        <InboxPage apiClient={createMockApi()} />
      </MemoryRouter>
    );

    expect(html).toContain("Open or create a local workspace");
  });

  it("renders Inbox items with move-only triage actions", () => {
    workspaceStore.setCurrentWorkspace(workspace);

    const html = renderToString(
      <MemoryRouter>
        <InboxPage
          apiClient={createMockApi()}
          initialItems={[inboxItem]}
          initialProjects={[
            project,
            {
              ...project,
              id: "container_project_waiting",
              name: "Waiting Project",
              status: "waiting"
            }
          ]}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Triage queue");
    expect(html).toContain("Call supplier");
    expect(html).toContain("Ask about Friday delivery.");
    expect(html).toContain("Move");
    expect(html).toContain("Launch Plan");
    expect(html).not.toContain("Waiting Project");
  });
});

function moduleStatus(module: IpcModuleStatus["module"]): IpcModuleStatus {
  return {
    module,
    available: true,
    implemented: false,
    message: `${module} placeholder`
  };
}

function createMockApi(): LocalWorkOsApi {
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
      listItems: async () => apiOk([inboxItem]),
      moveItemToProject: async () =>
        apiOk({
          ...inboxItem,
          containerId: project.id
        })
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
      list: async () => apiOk([project]),
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
      listProjects: async () => apiOk([project]),
      getProject: async () => apiOk(project)
    },
    containers: {
      getStatus: async () => apiOk(moduleStatus("containers"))
    },
    items: {
      getStatus: async () => apiOk(moduleStatus("items"))
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
