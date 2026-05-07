import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { App } from "electron";
import {
  createWorkspacePaths,
  type WorkspacePaths
} from "./workspace/WorkspaceManifest";

type AppPathProvider = Pick<App, "getAppPath" | "getPath">;

export function resolveUserDataPath(
  app: Pick<AppPathProvider, "getPath">,
  ...segments: string[]
): string {
  return resolve(app.getPath("userData"), ...segments);
}

export function resolveWorkspacePath(
  workspaceRootPath: string,
  pathName: keyof WorkspacePaths
): string {
  return createWorkspacePaths(workspaceRootPath)[pathName];
}

export function assertRuntimeDataPathOutsideAppBundle(
  app: AppPathProvider,
  runtimeDataPath: string
): string {
  const appPath = resolve(app.getAppPath());
  const appResourcesPath = appPath.endsWith(".asar") ? dirname(appPath) : appPath;
  const resolvedRuntimePath = resolve(runtimeDataPath);
  const appRelativePath = relative(appResourcesPath, resolvedRuntimePath);

  if (
    appRelativePath === "" ||
    (!appRelativePath.startsWith("..") && !isAbsolute(appRelativePath))
  ) {
    throw new Error(
      `Runtime data path must live outside the packaged app resources: ${resolvedRuntimePath}`
    );
  }

  return resolvedRuntimePath;
}
