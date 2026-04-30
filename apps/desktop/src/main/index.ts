import { app } from "electron";
import { registerAppLifecycle } from "./appLifecycle";
import { createWorkspaceWindow } from "./workspaceWindow";

app.whenReady().then(() => {
  const createWindow = () => createWorkspaceWindow();

  createWindow();
  registerAppLifecycle(createWindow);
});
