import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type WorkspaceWindowAssetPaths = {
  mainDirectory: string;
  preloadPath: string;
  rendererIndexPath: string;
};

export function resolveWorkspaceWindowAssetPaths(
  mainModuleUrl: string = import.meta.url
): WorkspaceWindowAssetPaths {
  const mainDirectory = dirname(fileURLToPath(mainModuleUrl));

  return {
    mainDirectory,
    preloadPath: join(mainDirectory, "../preload/index.cjs"),
    rendererIndexPath: join(mainDirectory, "../renderer/index.html")
  };
}
