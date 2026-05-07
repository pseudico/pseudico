import { spawn } from "node:child_process";
import {
  copyFile,
  mkdir,
  readFile,
  rm
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(command, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", rejectRun);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(
        new Error(
          `${command} ${args.join(" ")} failed with ${
            signal === null ? `exit code ${code}` : `signal ${signal}`
          }`
        )
      );
    });
  });
}

async function restoreDevelopmentNativeModules() {
  await run(
    pnpm,
    ["--filter", "@local-work-os/db", "rebuild", "better-sqlite3"],
    repoRoot
  );
  await run(
    pnpm,
    ["--filter", "@local-work-os/desktop", "rebuild", "better-sqlite3"],
    repoRoot
  );
}

let packageError;

try {
  await run(pnpm, ["build"], appRoot);
  await run(
    pnpm,
    ["exec", "electron-builder", "--config", "electron-builder.yml", "--dir"],
    appRoot
  );
  await rebuildNativeModulesForPackagedElectron();
  await copyNativeModulesToPackagedApp();
} catch (error) {
  packageError = error;
} finally {
  try {
    await restoreDevelopmentNativeModules();
  } catch (restoreError) {
    if (packageError instanceof Error) {
      packageError.message = `${packageError.message}; additionally failed to restore development native modules: ${
        restoreError instanceof Error ? restoreError.message : String(restoreError)
      }`;
    } else {
      packageError = restoreError;
    }
  }
}

if (packageError !== undefined) {
  throw packageError;
}

async function rebuildNativeModulesForPackagedElectron() {
  const electronVersion = await getElectronVersion();

  await run(
    pnpm,
    [
      "exec",
      "electron-rebuild",
      "--version",
      electronVersion,
      "--module-dir",
      appRoot,
      "--only",
      "better-sqlite3",
      "--force",
      "--build-from-source"
    ],
    appRoot
  );
}

async function copyNativeModulesToPackagedApp() {
  const sourcePath = resolve(
    appRoot,
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node"
  );
  const packagedPath = resolve(
    getPackagedResourcesPath(),
    "app.asar.unpacked",
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node"
  );

  await rm(packagedPath, { force: true });
  await mkdir(dirname(packagedPath), { recursive: true });
  await copyFile(sourcePath, packagedPath);
}

async function getElectronVersion() {
  const electronPackageJson = JSON.parse(
    await readFile(
      resolve(appRoot, "node_modules", "electron", "package.json"),
      "utf8"
    )
  );

  if (
    typeof electronPackageJson !== "object" ||
    electronPackageJson === null ||
    typeof electronPackageJson.version !== "string"
  ) {
    throw new Error("Could not resolve Electron version for native rebuild.");
  }

  return electronPackageJson.version;
}

function getPackagedResourcesPath() {
  if (process.platform === "win32") {
    return resolve(appRoot, "dist-packaged", "win-unpacked", "resources");
  }

  if (process.platform === "darwin") {
    return resolve(
      appRoot,
      "dist-packaged",
      "mac",
      "Local Work OS.app",
      "Contents",
      "Resources"
    );
  }

  return resolve(appRoot, "dist-packaged", "linux-unpacked", "resources");
}
