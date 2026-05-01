import { spawn } from "node:child_process";
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
}

let packageError;

try {
  await run(pnpm, ["build"], appRoot);
  await run(
    pnpm,
    ["exec", "electron-builder", "--config", "electron-builder.yml", "--dir"],
    appRoot
  );
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
