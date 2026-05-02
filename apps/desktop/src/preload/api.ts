export type ApiErrorCode =
  | "INVALID_INPUT"
  | "IPC_ERROR"
  | "NOT_IMPLEMENTED"
  | "WORKSPACE_ERROR"
  | "UNKNOWN_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
};

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiError;
    };

export type WorkspaceSummary = {
  id: string;
  name: string;
  rootPath: string;
  openedAt: string;
  schemaVersion: number | null;
};

export type RecentWorkspace = {
  name: string;
  rootPath: string;
  lastOpenedAt: string;
};

export type WorkspaceManifest = {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: string;
  lastOpenedAt: string;
  app: {
    name: "Local Work OS";
    workspaceFormat: 1;
  };
};

export type WorkspacePaths = {
  workspaceRootPath: string;
  manifestPath: string;
  dataPath: string;
  databasePath: string;
  attachmentsPath: string;
  backupsPath: string;
  exportsPath: string;
  logsPath: string;
};

export type WorkspaceValidationProblem = {
  code: string;
  message: string;
  severity: "error" | "warning";
  repairable: boolean;
  path?: string;
};

export type WorkspaceValidationResult = {
  ok: boolean;
  workspaceRootPath: string;
  paths: WorkspacePaths;
  problems: WorkspaceValidationProblem[];
  manifest?: WorkspaceManifest;
};

export type CreateWorkspaceInput = {
  name: string;
  rootPath: string;
};

export type OpenWorkspaceInput = {
  rootPath: string;
};

export type ValidateWorkspaceInput = {
  rootPath: string;
  repair?: boolean;
};

export type DatabaseHealthStatus = {
  connected: boolean;
  schemaVersion: number | null;
  workspaceExists: boolean;
  inboxExists: boolean;
  defaultDashboardExists: boolean;
  activityLogAvailable: boolean;
  searchIndexAvailable: boolean;
  databasePath: string | null;
  error: string | null;
};

export type ProjectStatus = "active" | "waiting" | "completed" | "archived";
export type ProjectMutableStatus = Exclude<ProjectStatus, "archived">;

export type ProjectSummary = {
  id: string;
  workspaceId: string;
  type: "project";
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  categoryId: string | null;
  color: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type InboxSummary = {
  id: string;
  workspaceId: string;
  type: "inbox";
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  categoryId: string | null;
  color: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ItemSummary = {
  id: string;
  workspaceId: string;
  containerId: string;
  containerTabId: string | null;
  type: string;
  title: string;
  body: string | null;
  categoryId: string | null;
  status: string;
  sortOrder: number;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type CreateProjectInput = {
  workspaceId?: string;
  name: string;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  isFavorite?: boolean;
  slug?: string;
  sortOrder?: number;
};

export type CreateProjectResult = {
  project: ProjectSummary;
  defaultTabId: string;
};

export type UpdateProjectInput = {
  projectId: string;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  isFavorite?: boolean;
  name?: string;
  slug?: string;
  sortOrder?: number;
  status?: ProjectMutableStatus;
};

export type MoveInboxItemToProjectInput = {
  itemId: string;
  projectId: string;
};

export type TaskStatus = "open" | "done" | "waiting" | "cancelled";

export type TaskSummary = ItemSummary & {
  type: "task";
  taskStatus: TaskStatus;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  timezone: string | null;
  taskCompletedAt: string | null;
  taskCreatedAt: string;
  taskUpdatedAt: string;
};

export type CreateTaskInput = {
  workspaceId?: string;
  containerId: string;
  title: string;
  actorType?: "local_user" | "system" | "importer";
  body?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  priority?: number | null;
  status?: TaskStatus;
  allDay?: boolean;
  timezone?: string | null;
  sortOrder?: number;
  pinned?: boolean;
};

export type UpdateTaskInput = {
  itemId: string;
  actorType?: "local_user" | "system" | "importer";
  title?: string;
  body?: string | null;
  categoryId?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  priority?: number | null;
  status?: TaskStatus;
  allDay?: boolean;
  timezone?: string | null;
  sortOrder?: number;
  pinned?: boolean;
  containerTabId?: string | null;
};

export type LocalWorkOsModuleName =
  | "containers"
  | "items"
  | "files";

export type IpcModuleStatus = {
  module: LocalWorkOsModuleName;
  available: boolean;
  implemented: boolean;
  message: string;
};

export const LOCAL_WORK_OS_IPC_CHANNELS = {
  workspace: {
    createWorkspace: "local-work-os:workspace:create-workspace",
    openWorkspace: "local-work-os:workspace:open-workspace",
    validateWorkspace: "local-work-os:workspace:validate-workspace",
    getCurrentWorkspace: "local-work-os:workspace:get-current-workspace",
    listRecentWorkspaces: "local-work-os:workspace:list-recent-workspaces"
  },
  database: {
    getHealthStatus: "local-work-os:database:get-health-status"
  },
  inbox: {
    getInbox: "local-work-os:inbox:get-inbox",
    listItems: "local-work-os:inbox:list-items",
    moveItemToProject: "local-work-os:inbox:move-item-to-project"
  },
  tasks: {
    createTask: "local-work-os:tasks:create-task",
    updateTask: "local-work-os:tasks:update-task",
    completeTask: "local-work-os:tasks:complete-task",
    reopenTask: "local-work-os:tasks:reopen-task",
    listByContainer: "local-work-os:tasks:list-by-container"
  },
  projects: {
    createProject: "local-work-os:projects:create-project",
    updateProject: "local-work-os:projects:update-project",
    archiveProject: "local-work-os:projects:archive-project",
    softDeleteProject: "local-work-os:projects:soft-delete-project",
    listProjects: "local-work-os:projects:list-projects",
    getProject: "local-work-os:projects:get-project"
  },
  containers: {
    getStatus: "local-work-os:containers:get-status"
  },
  items: {
    getStatus: "local-work-os:items:get-status"
  },
  files: {
    getStatus: "local-work-os:files:get-status"
  }
} as const;

export type LocalWorkOsIpcContracts = {
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.createWorkspace]: {
    input: CreateWorkspaceInput;
    result: ApiResult<WorkspaceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.openWorkspace]: {
    input: OpenWorkspaceInput;
    result: ApiResult<WorkspaceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.validateWorkspace]: {
    input: ValidateWorkspaceInput;
    result: ApiResult<WorkspaceValidationResult>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace]: {
    input: undefined;
    result: ApiResult<WorkspaceSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.listRecentWorkspaces]: {
    input: undefined;
    result: ApiResult<RecentWorkspace[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.database.getHealthStatus]: {
    input: undefined;
    result: ApiResult<DatabaseHealthStatus>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.inbox.getInbox]: {
    input: string | undefined;
    result: ApiResult<InboxSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.inbox.listItems]: {
    input: string | undefined;
    result: ApiResult<ItemSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.inbox.moveItemToProject]: {
    input: MoveInboxItemToProjectInput;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask]: {
    input: CreateTaskInput;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask]: {
    input: UpdateTaskInput;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask]: {
    input: string;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask]: {
    input: string;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.listByContainer]: {
    input: string;
    result: ApiResult<TaskSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject]: {
    input: CreateProjectInput;
    result: ApiResult<CreateProjectResult>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.updateProject]: {
    input: UpdateProjectInput;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject]: {
    input: string;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.softDeleteProject]: {
    input: string;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.listProjects]: {
    input: string | undefined;
    result: ApiResult<ProjectSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.getProject]: {
    input: string;
    result: ApiResult<ProjectSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.containers.getStatus]: {
    input: undefined;
    result: ApiResult<IpcModuleStatus>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.getStatus]: {
    input: undefined;
    result: ApiResult<IpcModuleStatus>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.getStatus]: {
    input: undefined;
    result: ApiResult<IpcModuleStatus>;
  };
};

export type LocalWorkOsIpcChannel = keyof LocalWorkOsIpcContracts & string;

export type LocalWorkOsIpcInput<Channel extends LocalWorkOsIpcChannel> =
  LocalWorkOsIpcContracts[Channel]["input"];

export type LocalWorkOsIpcResult<Channel extends LocalWorkOsIpcChannel> =
  LocalWorkOsIpcContracts[Channel]["result"];

export type LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
  channel: Channel,
  input: LocalWorkOsIpcInput<Channel>
) => Promise<LocalWorkOsIpcResult<Channel>>;

export type LocalWorkOsApi = {
  workspace: {
    createWorkspace: (
      input: CreateWorkspaceInput
    ) => Promise<ApiResult<WorkspaceSummary>>;
    openWorkspace: (
      input: OpenWorkspaceInput
    ) => Promise<ApiResult<WorkspaceSummary>>;
    validateWorkspace: (
      input: ValidateWorkspaceInput
    ) => Promise<ApiResult<WorkspaceValidationResult>>;
    getCurrentWorkspace: () => Promise<ApiResult<WorkspaceSummary | null>>;
    listRecentWorkspaces: () => Promise<ApiResult<RecentWorkspace[]>>;
  };
  database: {
    getHealthStatus: () => Promise<ApiResult<DatabaseHealthStatus>>;
  };
  inbox: {
    getInbox: (workspaceId?: string) => Promise<ApiResult<InboxSummary>>;
    listItems: (workspaceId?: string) => Promise<ApiResult<ItemSummary[]>>;
    moveItemToProject: (
      input: MoveInboxItemToProjectInput
    ) => Promise<ApiResult<ItemSummary>>;
  };
  tasks: {
    create: (input: CreateTaskInput) => Promise<ApiResult<TaskSummary>>;
    update: (input: UpdateTaskInput) => Promise<ApiResult<TaskSummary>>;
    complete: (itemId: string) => Promise<ApiResult<TaskSummary>>;
    reopen: (itemId: string) => Promise<ApiResult<TaskSummary>>;
    listByContainer: (
      containerId: string
    ) => Promise<ApiResult<TaskSummary[]>>;
    createTask: (input: CreateTaskInput) => Promise<ApiResult<TaskSummary>>;
    updateTask: (input: UpdateTaskInput) => Promise<ApiResult<TaskSummary>>;
    completeTask: (itemId: string) => Promise<ApiResult<TaskSummary>>;
    reopenTask: (itemId: string) => Promise<ApiResult<TaskSummary>>;
  };
  projects: {
    create: (
      input: CreateProjectInput
    ) => Promise<ApiResult<CreateProjectResult>>;
    update: (
      input: UpdateProjectInput
    ) => Promise<ApiResult<ProjectSummary>>;
    archive: (projectId: string) => Promise<ApiResult<ProjectSummary>>;
    softDelete: (projectId: string) => Promise<ApiResult<ProjectSummary>>;
    list: (
      workspaceId?: string
    ) => Promise<ApiResult<ProjectSummary[]>>;
    get: (projectId: string) => Promise<ApiResult<ProjectSummary | null>>;
    createProject: (
      input: CreateProjectInput
    ) => Promise<ApiResult<CreateProjectResult>>;
    updateProject: (
      input: UpdateProjectInput
    ) => Promise<ApiResult<ProjectSummary>>;
    archiveProject: (projectId: string) => Promise<ApiResult<ProjectSummary>>;
    softDeleteProject: (projectId: string) => Promise<ApiResult<ProjectSummary>>;
    listProjects: (
      workspaceId?: string
    ) => Promise<ApiResult<ProjectSummary[]>>;
    getProject: (projectId: string) => Promise<ApiResult<ProjectSummary | null>>;
  };
  containers: {
    getStatus: () => Promise<ApiResult<IpcModuleStatus>>;
  };
  items: {
    getStatus: () => Promise<ApiResult<IpcModuleStatus>>;
  };
  files: {
    getStatus: () => Promise<ApiResult<IpcModuleStatus>>;
  };
};

export function apiOk<T>(data: T): ApiResult<T> {
  return {
    ok: true,
    data
  };
}

export function apiError<T = never>(
  code: ApiErrorCode,
  message: string
): ApiResult<T> {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

export function createLocalWorkOsApi(
  invoke: LocalWorkOsIpcInvoke
): LocalWorkOsApi {
  return {
    workspace: {
      createWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.workspace.createWorkspace, input),
      openWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.workspace.openWorkspace, input),
      validateWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.workspace.validateWorkspace, input),
      getCurrentWorkspace: () =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace,
          undefined
        ),
      listRecentWorkspaces: () =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.workspace.listRecentWorkspaces,
          undefined
        )
    },
    database: {
      getHealthStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.database.getHealthStatus, undefined)
    },
    inbox: {
      getInbox: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.inbox.getInbox, workspaceId),
      listItems: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.inbox.listItems, workspaceId),
      moveItemToProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.inbox.moveItemToProject, input)
    },
    tasks: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask, input),
      complete: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask, itemId),
      reopen: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask, itemId),
      listByContainer: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.listByContainer, containerId),
      createTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask, input),
      updateTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask, input),
      completeTask: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask, itemId),
      reopenTask: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask, itemId)
    },
    projects: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.updateProject, input),
      archive: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject, projectId),
      softDelete: (projectId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.projects.softDeleteProject,
          projectId
        ),
      list: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.listProjects, workspaceId),
      get: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.getProject, projectId),
      createProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject, input),
      updateProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.updateProject, input),
      archiveProject: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject, projectId),
      softDeleteProject: (projectId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.projects.softDeleteProject,
          projectId
        ),
      listProjects: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.listProjects, workspaceId),
      getProject: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.getProject, projectId)
    },
    containers: {
      getStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.containers.getStatus, undefined)
    },
    items: {
      getStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.getStatus, undefined)
    },
    files: {
      getStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.getStatus, undefined)
    }
  };
}
