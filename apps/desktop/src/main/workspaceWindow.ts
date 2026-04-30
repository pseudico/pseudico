import { join } from "node:path";
import { BrowserWindow, shell } from "electron";

const rendererDevUrl =
  process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL;

export function createWorkspaceWindow(): BrowserWindow {
  const workspaceWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "Local Work OS",
    backgroundColor: "#f6f5f0",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  workspaceWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (rendererDevUrl) {
    void workspaceWindow.loadURL(rendererDevUrl);
  } else {
    void workspaceWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return workspaceWindow;
}
