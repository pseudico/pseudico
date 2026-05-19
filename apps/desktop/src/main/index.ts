import { app } from "electron";
import { registerAppLifecycle } from "./appLifecycle";
import { createDesktopIpcServices, registerDesktopIpc } from "./ipc";
import { runPackageSmoke } from "./packageSmoke";
import { AutomaticBackupRunner } from "./services/backup/AutomaticBackupRunner";
import { startConfiguredCaptureBridge } from "./services/capture/configuredCaptureBridge";
import { createWorkspaceWindow } from "./workspaceWindow";
import { runPse240Capture } from "./pse240Capture";
import { runPse241FullAppCapture } from "./pse241Capture";

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

  const pse240CaptureMode =
    process.env.LOCAL_WORK_OS_CAPTURE_PSE240 === "1" ||
    process.argv.includes("--pse240-capture");
  const pse241CaptureMode =
    process.env.LOCAL_WORK_OS_CAPTURE_PSE241 === "1" ||
    process.argv.includes("--pse241-capture");
  if (pse240CaptureMode) {
    console.log("[PSE-240 capture] mode detected");
  }
  if (pse241CaptureMode) {
    console.log("[PSE-241 capture] mode detected");
  }

  const createWindow = () => createWorkspaceWindow();
  const services = createDesktopIpcServices();

  if (pse240CaptureMode || pse241CaptureMode) {
    registerDesktopIpc(services);
    const window = createWindow();

    try {
      if (pse241CaptureMode) {
        await runPse241FullAppCapture({ app, services, window });
      } else {
        await runPse240Capture({ app, services, window });
      }
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
