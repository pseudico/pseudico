import { app } from "electron";
import { registerAppLifecycle } from "./appLifecycle";
import { registerDesktopIpc } from "./ipc";
import { createWorkspaceWindow } from "./workspaceWindow";

app.whenReady().then(() => {
  const createWindow = () => createWorkspaceWindow();

  registerDesktopIpc();
  createWindow();
  registerAppLifecycle(createWindow);
});
