import { pathToFileURL } from "node:url";
import { BrowserWindow, shell } from "electron";
import {
  isTrustedRendererNavigationUrl,
  openAllowedExternalUrl
} from "./electronSecurity";
import { createWorkspaceWindowWebPreferences } from "./workspaceWindowSecurity";
import { resolveWorkspaceWindowAssetPaths } from "./workspaceWindowPaths";

const rendererDevUrl =
  process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL;

export function createWorkspaceWindow(): BrowserWindow {
  const paths = resolveWorkspaceWindowAssetPaths();
  const packagedRendererUrl = pathToFileURL(paths.rendererIndexPath).toString();
  const workspaceWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "Local Work OS",
    backgroundColor: "#f6f5f0",
    webPreferences: createWorkspaceWindowWebPreferences({
      preloadPath: paths.preloadPath,
      devTools: !appIsPackaged()
    })
  });

  workspaceWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openAllowedExternalUrl(url, (safeUrl) => shell.openExternal(safeUrl));
    return { action: "deny" };
  });

  workspaceWindow.webContents.on("will-navigate", (event, url) => {
    if (
      isTrustedRendererNavigationUrl(url, {
        rendererDevUrl: rendererDevUrl ?? null,
        packagedRendererUrl
      })
    ) {
      return;
    }

    event.preventDefault();
    void openAllowedExternalUrl(url, (safeUrl) => shell.openExternal(safeUrl));
  });

  workspaceWindow.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });

  if (rendererDevUrl) {
    void workspaceWindow.loadURL(rendererDevUrl);
  } else {
    void workspaceWindow.loadFile(paths.rendererIndexPath);
  }

  return workspaceWindow;
}

function appIsPackaged(): boolean {
  return process.env.NODE_ENV === "production" && !rendererDevUrl;
}
