import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  apiOk,
  type DatabaseHealthStatus,
  type IpcModuleStatus,
  type LocalWorkOsApi,
  type ProjectSummary,
  type WorkspaceSummary
} from "../../src/preload/api";
import { ProjectDetailPage } from "../../src/renderer/pages/ProjectDetailPage";
import { ProjectsPage } from "../../src/renderer/pages/ProjectsPage";
import { workspaceStore } from "../../src/renderer/state/workspaceStore";
import type { UniversalItemViewModel } from "@local-work-os/ui";

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

const projectItem: UniversalItemViewModel = {
  id: "item_1",
  type: "task",
  title: "Book launch venue",
  body: "Confirm the room hold before Friday.",
  status: "active",
  dueLabel: "Friday",
  pinned: true
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
                initialProject={project}
                initialItems={[projectItem]}
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
    expect(html).toContain("Book launch venue");
    expect(html).toContain("Actions for Book launch venue");
  });
});
