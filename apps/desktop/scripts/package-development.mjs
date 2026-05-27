import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");
const packageStagingRoot = resolve(appRoot, ".package-app");
const packageOutputRoot = resolve(appRoot, "dist-packaged");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const electronBuilder = resolve(
  appRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "electron-builder.CMD" : "electron-builder"
);

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

let packageError;

try {
  await stopPackagedAppProcesses();
  await run(pnpm, ["build"], appRoot);
  await preparePackagingStaging();
  const electronVersion = await getElectronVersion();
  await rebuildStagedNativeModulesForPackagedElectron(electronVersion);
  await runElectronBuilderFromStaging(electronVersion);
  await copyStagedNativeModulesToPackagedApp();
} catch (error) {
  packageError = error;
} finally {
  try {
    await removeGeneratedPath(packageStagingRoot, appRoot);
    await restoreDevelopmentNativeModules();
  } catch (restoreError) {
    if (packageError instanceof Error) {
      packageError.message = `${packageError.message}; additionally failed to clean package staging or restore development native modules: ${
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

async function preparePackagingStaging() {
  await removeGeneratedPath(packageStagingRoot, appRoot);
  await removeGeneratedPath(packageOutputRoot, appRoot);
  await run(
    pnpm,
    [
      "--filter",
      "@local-work-os/desktop",
      "deploy",
      "--prod",
      "--legacy",
      packageStagingRoot
    ],
    repoRoot
  );
}

async function stopPackagedAppProcesses() {
  if (process.platform !== "win32") {
    return;
  }

  const executablePath = resolve(packageOutputRoot, "win-unpacked", "Local Work OS.exe");
  const escapedExecutablePath = executablePath.replace(/'/g, "''");
  const command = [
    `$target = '${escapedExecutablePath}'`,
    "Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $target } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
  ].join("; ");

  await new Promise((resolveStop, rejectStop) => {
    const child = spawn("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      command
    ], {
      cwd: repoRoot,
      stdio: "inherit",
      windowsHide: true
    });

    child.on("error", rejectStop);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolveStop();
        return;
      }

      rejectStop(
        new Error(
          `stopping generated packaged app processes failed with ${
            signal === null ? `exit code ${code}` : `signal ${signal}`
          }`
        )
      );
    });
  });
}

async function runElectronBuilderFromStaging(electronVersion) {
  const targetArgs =
    process.platform === "win32"
      ? ["--win", "dir", "nsis", "zip"]
      : ["--dir"];

  await run(
    electronBuilder,
    [
      ...targetArgs,
      "--config",
      "electron-builder.yml",
      `--config.electronVersion=${electronVersion}`,
      "--config.npmRebuild=false",
      "--config.directories.output=../dist-packaged"
    ],
    packageStagingRoot
  );
}


async function rebuildStagedNativeModulesForPackagedElectron(electronVersion) {
  await run(
    pnpm,
    [
      "exec",
      "electron-rebuild",
      "--version",
      electronVersion,
      "--module-dir",
      packageStagingRoot,
      "--only",
      "better-sqlite3",
      "--force",
      "--build-from-source"
    ],
    appRoot
  );
}

async function copyStagedNativeModulesToPackagedApp() {
  const sourcePath = resolve(
    packageStagingRoot,
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

  await removeGeneratedPath(packagedPath, packageOutputRoot);
  await mkdir(dirname(packagedPath), { recursive: true });
  await copyFile(sourcePath, packagedPath);
}

async function removeGeneratedPath(targetPath, allowedParentPath) {
  const resolvedTarget = resolve(targetPath);
  const resolvedParent = resolve(allowedParentPath);
  const relativeTarget = relative(resolvedParent, resolvedTarget);

  if (
    relativeTarget === "" ||
    relativeTarget.startsWith("..") ||
    resolve(resolvedParent, relativeTarget) !== resolvedTarget
  ) {
    throw new Error(`Refusing to remove generated path outside app root: ${targetPath}`);
  }

  await rm(resolvedTarget, { force: true, recursive: true });
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
