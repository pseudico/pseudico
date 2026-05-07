import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const executablePath = getPackagedExecutablePath();
const packagedAppPath = join(getPackagedResourcesPath(), "app.asar");
const resultDir = await mkdtemp(join(tmpdir(), "local-work-os-package-smoke-"));
const resultPath = join(resultDir, "result.json");

await access(executablePath);

try {
  try {
    await runSmokeTarget({
      command: executablePath,
      args: ["--package-smoke"],
      label: "packaged executable",
      timeoutMs: 20_000
    });
  } catch (error) {
    if (process.platform !== "win32") {
      throw error;
    }

    console.warn(
      `Packaged executable smoke did not exit cleanly; retrying packaged app.asar with Electron. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    await access(packagedAppPath);
    await runSmokeTarget({
      command: getElectronExecutablePath(),
      args: [packagedAppPath, "--package-smoke"],
      label: "packaged app.asar",
      timeoutMs: 60_000
    });
  }

  console.log(await readFile(resultPath, "utf8"));
} finally {
  await rm(resultDir, { force: true, recursive: true });
}

function runSmokeTarget(input) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(input.command, input.args, {
      cwd: appRoot,
      env: {
        ...process.env,
        ELECTRON_ENABLE_LOGGING: "1",
        LOCAL_WORK_OS_PACKAGE_SMOKE: "1",
        LOCAL_WORK_OS_PACKAGE_SMOKE_RESULT: resultPath
      },
      stdio: "inherit",
      windowsHide: true
    });
    const timeout = setTimeout(() => {
      child.kill();
      rejectRun(new Error(`${input.label} timed out after ${input.timeoutMs}ms.`));
    }, input.timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timeout);
      rejectRun(error);
    });
    child.on("exit", (code, signal) => {
      clearTimeout(timeout);

      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(
        new Error(
          `${input.label} failed with ${
            signal === null ? `exit code ${code}` : `signal ${signal}`
          }.`
        )
      );
    });
  });
}

function getPackagedExecutablePath() {
  if (process.platform === "win32") {
    return join(appRoot, "dist-packaged", "win-unpacked", "Local Work OS.exe");
  }

  if (process.platform === "darwin") {
    return join(
      appRoot,
      "dist-packaged",
      "mac",
      "Local Work OS.app",
      "Contents",
      "MacOS",
      "Local Work OS"
    );
  }

  return join(appRoot, "dist-packaged", "linux-unpacked", "local-work-os");
}

function getElectronExecutablePath() {
  if (process.platform === "win32") {
    return join(appRoot, "node_modules", "electron", "dist", "electron.exe");
  }

  if (process.platform === "darwin") {
    return join(
      appRoot,
      "node_modules",
      "electron",
      "dist",
      "Electron.app",
      "Contents",
      "MacOS",
      "Electron"
    );
  }

  return join(appRoot, "node_modules", "electron", "dist", "electron");
}

function getPackagedResourcesPath() {
  if (process.platform === "win32") {
    return join(appRoot, "dist-packaged", "win-unpacked", "resources");
  }

  if (process.platform === "darwin") {
    return join(
      appRoot,
      "dist-packaged",
      "mac",
      "Local Work OS.app",
      "Contents",
      "Resources"
    );
  }

  return join(appRoot, "dist-packaged", "linux-unpacked", "resources");
}
