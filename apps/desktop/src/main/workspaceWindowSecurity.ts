import type { WebPreferences } from "electron";

export function createWorkspaceWindowWebPreferences(input: {
  preloadPath: string;
  devTools: boolean;
}): WebPreferences {
  return {
    preload: input.preloadPath,
    allowRunningInsecureContent: false,
    contextIsolation: true,
    devTools: input.devTools,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    webviewTag: false
  };
}
