import { app } from "electron";
import { registerAppLifecycle } from "./appLifecycle";
import { registerDesktopIpc } from "./ipc";
import { runPackageSmoke } from "./packageSmoke";
import { createWorkspaceWindow } from "./workspaceWindow";

app.whenReady().then(async () => {
  if (
    process.env.LOCAL_WORK_OS_PACKAGE_SMOKE === "1" ||
    process.argv.includes("--package-smoke")
  ) {
    try {
      await runPackageSmoke(app);
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      app.exit(typeof process.exitCode === "number" ? process.exitCode : 0);
    }

    return;
  }

  const createWindow = () => createWorkspaceWindow();

  registerDesktopIpc();
  createWindow();
  registerAppLifecycle(createWindow);
});
