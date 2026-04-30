import { join } from "node:path";

export const LOCAL_WORK_OS_APP_NAME = "Local Work OS";
export const WORKSPACE_FORMAT_VERSION = 1;
export const WORKSPACE_SCHEMA_VERSION = 1;
export const WORKSPACE_MANIFEST_FILE = "workspace.json";
export const WORKSPACE_DATABASE_RELATIVE_PATH = "data/local-work-os.sqlite";

export const REQUIRED_WORKSPACE_DIRECTORIES = [
  "data",
  "attachments",
  "backups",
  "exports",
  "logs"
] as const;

export const GITKEEP_WORKSPACE_DIRECTORIES = [
  "attachments",
  "backups",
  "exports",
  "logs"
] as const;

export type WorkspaceManifest = {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: string;
  lastOpenedAt: string;
  app: {
    name: typeof LOCAL_WORK_OS_APP_NAME;
    workspaceFormat: typeof WORKSPACE_FORMAT_VERSION;
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
  code:
    | "INVALID_WORKSPACE_PATH"
    | "WORKSPACE_ROOT_MISSING"
    | "WORKSPACE_ROOT_NOT_DIRECTORY"
    | "MANIFEST_MISSING"
    | "MANIFEST_INVALID_JSON"
    | "MANIFEST_INVALID_SHAPE"
    | "UNSUPPORTED_WORKSPACE_FORMAT"
    | "REQUIRED_DIRECTORY_MISSING"
    | "REQUIRED_DIRECTORY_REPAIRED";
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

export type WorkspaceSummary = {
  id: string;
  name: string;
  rootPath: string;
  openedAt: string;
  schemaVersion: number | null;
};

export type RecentWorkspaceEntry = {
  name: string;
  rootPath: string;
  lastOpenedAt: string;
};

export function createWorkspacePaths(workspaceRootPath: string): WorkspacePaths {
  return {
    workspaceRootPath,
    manifestPath: join(workspaceRootPath, WORKSPACE_MANIFEST_FILE),
    dataPath: join(workspaceRootPath, "data"),
    databasePath: join(workspaceRootPath, WORKSPACE_DATABASE_RELATIVE_PATH),
    attachmentsPath: join(workspaceRootPath, "attachments"),
    backupsPath: join(workspaceRootPath, "backups"),
    exportsPath: join(workspaceRootPath, "exports"),
    logsPath: join(workspaceRootPath, "logs")
  };
}

export function createWorkspaceManifest(input: {
  name: string;
  createdAt?: Date;
  id?: string;
}): WorkspaceManifest {
  const createdAt = input.createdAt ?? new Date();
  const timestamp = createIsoTimestamp(createdAt);

  return {
    id: input.id ?? createWorkspaceId(createdAt),
    name: input.name,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    createdAt: timestamp,
    lastOpenedAt: timestamp,
    app: {
      name: LOCAL_WORK_OS_APP_NAME,
      workspaceFormat: WORKSPACE_FORMAT_VERSION
    }
  };
}

export function createWorkspaceId(
  date: Date = new Date(),
  random: () => number = Math.random
): string {
  const timestamp = date.getTime().toString(36);
  const entropy = Math.floor(random() * Number.MAX_SAFE_INTEGER)
    .toString(36)
    .padStart(11, "0")
    .slice(0, 11);

  return `workspace_${timestamp}_${entropy}`;
}

export function createIsoTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isWorkspaceManifest(value: unknown): value is WorkspaceManifest {
  if (!isRecord(value) || !isRecord(value.app)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    typeof value.schemaVersion === "number" &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.lastOpenedAt) &&
    value.app.name === LOCAL_WORK_OS_APP_NAME &&
    value.app.workspaceFormat === WORKSPACE_FORMAT_VERSION
  );
}

export function workspaceSummaryFromManifest(
  workspaceRootPath: string,
  manifest: WorkspaceManifest
): WorkspaceSummary {
  return {
    id: manifest.id,
    name: manifest.name,
    rootPath: workspaceRootPath,
    openedAt: manifest.lastOpenedAt,
    schemaVersion: manifest.schemaVersion
  };
}
