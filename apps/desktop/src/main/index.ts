import { app } from "electron";
import { registerAppLifecycle } from "./appLifecycle";
import { createDesktopIpcServices, registerDesktopIpc } from "./ipc";
import { runPackageSmoke } from "./packageSmoke";
import { AutomaticBackupRunner } from "./services/backup/AutomaticBackupRunner";
import { startConfiguredCaptureBridge } from "./services/capture/configuredCaptureBridge";
import { createWorkspaceWindow } from "./workspaceWindow";
import { runPse240Capture } from "./pse240Capture";

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
  const services = createDesktopIpcServices();

  if (process.env.LOCAL_WORK_OS_CAPTURE_PSE240 === "1") {
    registerDesktopIpc(services);
    const window = createWindow();

    try {
      await runPse240Capture({ app, services, window });
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      app.exit(typeof process.exitCode === "number" ? process.exitCode : 0);
    }

    return;
  }

  const configuredCaptureBridge = await startConfiguredCaptureBridge(
    services.workspaceService
  );
  const automaticBackupRunner = new AutomaticBackupRunner({
    workspaceService: services.workspaceService
  });

  if (configuredCaptureBridge !== null) {
    app.once("before-quit", () => {
      void configuredCaptureBridge.bridge.stop();
    });
  }

  let appCloseBackupCompleted = false;

  app.on("before-quit", (event) => {
    if (appCloseBackupCompleted) {
      return;
    }

    event.preventDefault();
    automaticBackupRunner.stop();
    void automaticBackupRunner.runOnce("app_close").finally(() => {
      appCloseBackupCompleted = true;
      app.quit();
    });
  });

  registerDesktopIpc(services);
  createWindow();
  automaticBackupRunner.start();
  registerAppLifecycle(createWindow);
});
