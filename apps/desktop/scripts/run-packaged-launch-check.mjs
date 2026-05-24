import { spawn, execFile } from "node:child_process";
import { createHash } from "node:crypto";
import http from "node:http";
import {
  access,
  mkdir,
  readFile,
  stat,
  writeFile
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(appRoot, "../..");
const args = parseArgs(process.argv.slice(2));
const timeoutMs = Number(args.timeoutMs ?? args.timeout ?? 30_000);
const port = Number(args.port ?? 9351);
const userDataDir =
  args.userDataDir === undefined ? null : resolve(String(args.userDataDir));
const screenshotPath =
  args.screenshot === undefined ? null : resolve(repoRoot, args.screenshot);
const executablePath = getPackagedExecutablePath();
const resourcesPath = getPackagedResourcesPath();
const appAsarPath = join(resourcesPath, "app.asar");
const desktopPackagePath = join(appRoot, "package.json");
const rootPackagePath = join(repoRoot, "package.json");

class CdpClient {
  constructor(webSocket) {
    this.webSocket = webSocket;
    this.nextId = 1;
    this.pending = new Map();
  }

  static connect(url) {
    return new Promise((resolveConnect, rejectConnect) => {
      const webSocket = new globalThis.WebSocket(url);
      const client = new CdpClient(webSocket);

      webSocket.addEventListener("open", () => resolveConnect(client));
      webSocket.addEventListener("error", () =>
        rejectConnect(new Error("Could not connect to packaged app DevTools target."))
      );
      webSocket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);

        if (!message.id || !client.pending.has(message.id)) {
          return;
        }

        const callbacks = client.pending.get(message.id);
        client.pending.delete(message.id);

        if (message.error !== undefined) {
          callbacks.reject(new Error(message.error.message));
          return;
        }

        callbacks.resolve(message.result ?? {});
      });
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;

    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
      this.webSocket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });

    return result.result?.value;
  }

  close() {
    this.webSocket.close();
  }
}

try {
  await access(executablePath);
  await access(appAsarPath);

  const launchResult = await runPackagedLaunchCheck();
  const metadata = await collectPackageMetadata();

  console.log(
    JSON.stringify(
      {
        ok: true,
        ...metadata,
        ...launchResult,
        note:
          "This is the canonical packaged-app QA launch check. Use it for operator/release QA screenshots instead of an unbounded background dev launch."
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        executablePath,
        appAsarPath,
        timeoutMs,
        port,
        userDataDir,
        error: error instanceof Error ? error.message : String(error),
        operatorHint:
          "If this failed with Windows display/Mojo access errors, rerun from a display-capable session. Do not treat a sandbox/no-display Electron failure as a product launch regression.",
        nextStep:
          "Run `pnpm package` first if the packaged artifact is missing; otherwise use display-capable execution for this helper."
      },
      null,
      2
    )
  );
  process.exitCode = 1;
}

async function runPackagedLaunchCheck() {
  const launchArgs = [`--remote-debugging-port=${port}`];

  if (userDataDir !== null) {
    await mkdir(userDataDir, { recursive: true });
    launchArgs.push(`--user-data-dir=${userDataDir}`);
  }

  const child = spawn(executablePath, launchArgs, {
    cwd: appRoot,
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: "1"
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  let stderr = "";
  let stdout = "";
  let exited = false;
  let exitCode = null;
  let exitSignal = null;

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  child.on("exit", (code, signal) => {
    exited = true;
    exitCode = code;
    exitSignal = signal;
  });

  const timeout = setTimeout(() => {
    child.kill();
  }, timeoutMs);

  try {
    const page = await waitForNormalLaunch({ child, timeoutMs, port });
    const client = await CdpClient.connect(page.webSocketDebuggerUrl);
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    const locationHref = await client.evaluate("location.href");
    const bodyText = await waitForRenderedShell(client);
    const rendered = bodyText.includes("Local Work OS");

    if (!rendered) {
      throw new Error(
        `Packaged app launched but did not render the welcome shell. URL: ${locationHref}. Body: ${bodyText}`
      );
    }

    let screenshot = null;
    if (screenshotPath !== null) {
      await mkdir(dirname(screenshotPath), { recursive: true });
      const captured = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true
      });
      await writeFile(screenshotPath, Buffer.from(captured.data, "base64"));
      screenshot = screenshotPath;
    }

    client.close();

    return {
      normalLaunchSmoke: {
        ok: true,
        target: "welcome window",
        url: locationHref
      },
      screenshot,
      stdoutTail: stdout.slice(-1_000),
      stderrTail: stderr.slice(-1_000)
    };
  } catch (error) {
    const exitSummary = exited
      ? ` Process exited with ${
          exitSignal === null ? `code ${exitCode}` : `signal ${exitSignal}`
        }.`
      : "";
    const diagnostic =
      stderr.includes("No displays detected") ||
      stderr.includes("Access is denied") ||
      stderr.includes("platform_channel")
        ? " This looks like a Windows/Electron display or sandbox boundary; rerun from a display-capable session."
        : "";

    throw new Error(
      `${error instanceof Error ? error.message : String(error)}${exitSummary}${diagnostic} stderrTail=${stderr.slice(-1_000)}`
    );
  } finally {
    clearTimeout(timeout);

    if (!exited) {
      child.kill();
    }
  }
}

async function waitForRenderedShell(client) {
  const startedAt = Date.now();
  let bodyText = "";

  while (Date.now() - startedAt < timeoutMs) {
    bodyText = await client.evaluate(
      "document.body?.innerText?.slice(0, 2000) ?? ''"
    );

    if (bodyText.includes("Local Work OS")) {
      return bodyText;
    }

    await delay(250);
  }

  return bodyText;
}

async function waitForNormalLaunch(input) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < input.timeoutMs) {
    if (input.child.exitCode !== null) {
      throw new Error(`Packaged app exited before rendering DevTools page.`);
    }

    try {
      const targets = await httpJson(`http://127.0.0.1:${input.port}/json/list`);
      const page = targets.find(
        (target) => target.type === "page" && target.webSocketDebuggerUrl
      );

      if (page !== undefined) {
        return page;
      }
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw new Error(
    `Packaged normal launch did not expose a DevTools page within ${input.timeoutMs}ms. ${
      lastError instanceof Error ? lastError.message : ""
    }`
  );
}

function httpJson(url) {
  return new Promise((resolveRequest, rejectRequest) => {
    http
      .get(url, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolveRequest(JSON.parse(body));
          } catch (error) {
            rejectRequest(error);
          }
        });
      })
      .on("error", rejectRequest);
  });
}

async function collectPackageMetadata() {
  const [rootPackage, desktopPackage, executableInfo, appAsarInfo, gitSha] =
    await Promise.all([
      readJson(rootPackagePath),
      readJson(desktopPackagePath),
      fileEvidence(executablePath),
      fileEvidence(appAsarPath),
      getGitSha()
    ]);

  return {
    appRoot,
    repositoryRoot: repoRoot,
    gitSha,
    rootPackage: {
      name: rootPackage.name,
      version: rootPackage.version,
      packageManager: rootPackage.packageManager
    },
    desktopPackage: {
      name: desktopPackage.name,
      version: desktopPackage.version,
      description: desktopPackage.description
    },
    executablePath,
    appAsarPath,
    executable: executableInfo,
    appAsar: appAsarInfo
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function fileEvidence(path) {
  const [stats, bytes] = await Promise.all([stat(path), readFile(path)]);
  return {
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

function getGitSha() {
  return new Promise((resolveSha) => {
    execFile("git", ["rev-parse", "HEAD"], { cwd: repoRoot }, (error, stdout) => {
      if (error) {
        resolveSha(null);
        return;
      }

      resolveSha(stdout.trim());
    });
  });
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (const arg of rawArgs) {
    if (!arg.startsWith("--")) {
      continue;
    }

    const withoutPrefix = arg.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");

    if (equalsIndex === -1) {
      parsed[withoutPrefix] = true;
      continue;
    }

    parsed[withoutPrefix.slice(0, equalsIndex)] = withoutPrefix.slice(
      equalsIndex + 1
    );
  }

  return parsed;
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
