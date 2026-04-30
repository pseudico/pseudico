import { join, resolve } from "node:path";

export const WORKSPACE_DATABASE_FILE_NAME = "local-work-os.sqlite";
export const WORKSPACE_DATABASE_RELATIVE_PATH = join(
  "data",
  WORKSPACE_DATABASE_FILE_NAME
);

function normalizeWorkspaceRootPath(workspaceRootPath: string): string {
  const trimmed = workspaceRootPath.trim();

  if (trimmed.length === 0) {
    throw new Error("workspaceRootPath must be a non-empty local path.");
  }

  return resolve(trimmed);
}

export function resolveWorkspaceDataPath(workspaceRootPath: string): string {
  return join(normalizeWorkspaceRootPath(workspaceRootPath), "data");
}

export function resolveWorkspaceDatabasePath(workspaceRootPath: string): string {
  return join(resolveWorkspaceDataPath(workspaceRootPath), WORKSPACE_DATABASE_FILE_NAME);
}
