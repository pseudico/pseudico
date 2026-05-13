import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { BrowserWindow, shell } from "electron";
import {
  isTrustedRendererNavigationUrl,
  openAllowedExternalUrl
} from "./electronSecurity";

const rendererDevUrl =
  process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL;

export function createWorkspaceWindow(): BrowserWindow {
  const packagedRendererPath = join(__dirname, "../renderer/index.html");
  const packagedRendererUrl = pathToFileURL(packagedRendererPath).toString();
  const workspaceWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "Local Work OS",
    backgroundColor: "#f6f5f0",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      allowRunningInsecureContent: false,
      contextIsolation: true,
      devTools: !appIsPackaged(),
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
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
    void workspaceWindow.loadFile(packagedRendererPath);
  }

  return workspaceWindow;
}

function appIsPackaged(): boolean {
  return process.env.NODE_ENV === "production" && !rendererDevUrl;
}
