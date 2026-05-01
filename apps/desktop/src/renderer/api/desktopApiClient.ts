import {
  apiError,
  type ApiResult,
  type LocalWorkOsApi
} from "../../preload/api";

function getPreloadApi(): LocalWorkOsApi {
  if (typeof window === "undefined" || window.localWorkOs === undefined) {
    throw new Error("Local Work OS preload API is unavailable.");
  }

  return window.localWorkOs;
}

async function callApi<T>(
  operation: () => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return apiError(
      "IPC_ERROR",
      error instanceof Error ? error.message : "Preload IPC call failed."
    );
  }
}

export function createDesktopApiClient(api: LocalWorkOsApi): LocalWorkOsApi {
  return {
    workspace: {
      createWorkspace: (input) =>
        callApi(() => api.workspace.createWorkspace(input)),
      openWorkspace: (input) => callApi(() => api.workspace.openWorkspace(input)),
      validateWorkspace: (input) =>
        callApi(() => api.workspace.validateWorkspace(input)),
      getCurrentWorkspace: () =>
        callApi(() => api.workspace.getCurrentWorkspace()),
      listRecentWorkspaces: () =>
        callApi(() => api.workspace.listRecentWorkspaces())
    },
    database: {
      getHealthStatus: () => callApi(() => api.database.getHealthStatus())
    },
    projects: {
      createProject: (input) => callApi(() => api.projects.createProject(input)),
      updateProject: (input) => callApi(() => api.projects.updateProject(input)),
      archiveProject: (projectId) =>
        callApi(() => api.projects.archiveProject(projectId)),
      softDeleteProject: (projectId) =>
        callApi(() => api.projects.softDeleteProject(projectId)),
      listProjects: (workspaceId) =>
        callApi(() => api.projects.listProjects(workspaceId)),
      getProject: (projectId) => callApi(() => api.projects.getProject(projectId))
    },
    containers: {
      getStatus: () => callApi(() => api.containers.getStatus())
    },
    items: {
      getStatus: () => callApi(() => api.items.getStatus())
    },
    files: {
      getStatus: () => callApi(() => api.files.getStatus())
    }
  };
}

export function getDesktopApiClient(): LocalWorkOsApi {
  return createDesktopApiClient(getPreloadApi());
}

export const desktopApiClient: LocalWorkOsApi = {
  workspace: {
    createWorkspace: (input) =>
      getDesktopApiClient().workspace.createWorkspace(input),
    openWorkspace: (input) =>
      getDesktopApiClient().workspace.openWorkspace(input),
    validateWorkspace: (input) =>
      getDesktopApiClient().workspace.validateWorkspace(input),
    getCurrentWorkspace: () =>
      getDesktopApiClient().workspace.getCurrentWorkspace(),
    listRecentWorkspaces: () =>
      getDesktopApiClient().workspace.listRecentWorkspaces()
  },
  database: {
    getHealthStatus: () => getDesktopApiClient().database.getHealthStatus()
  },
  projects: {
    createProject: (input) =>
      getDesktopApiClient().projects.createProject(input),
    updateProject: (input) =>
      getDesktopApiClient().projects.updateProject(input),
    archiveProject: (projectId) =>
      getDesktopApiClient().projects.archiveProject(projectId),
    softDeleteProject: (projectId) =>
      getDesktopApiClient().projects.softDeleteProject(projectId),
    listProjects: (workspaceId) =>
      getDesktopApiClient().projects.listProjects(workspaceId),
    getProject: (projectId) =>
      getDesktopApiClient().projects.getProject(projectId)
  },
  containers: {
    getStatus: () => getDesktopApiClient().containers.getStatus()
  },
  items: {
    getStatus: () => getDesktopApiClient().items.getStatus()
  },
  files: {
    getStatus: () => getDesktopApiClient().files.getStatus()
  }
};
