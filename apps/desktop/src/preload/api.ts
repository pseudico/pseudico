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
