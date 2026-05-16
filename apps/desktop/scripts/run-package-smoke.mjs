import { spawn } from "node:child_process";
import http from "node:http";
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
      returnByValue: true
    });

    return result.result?.value;
  }

  close() {
    this.webSocket.close();
  }
}

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

  await runNormalLaunchSmoke({
    command: executablePath,
    label: "packaged executable normal launch",
    timeoutMs: 30_000
  });

  const packageSmokeResult = JSON.parse(await readFile(resultPath, "utf8"));
  console.log(JSON.stringify({
    ...packageSmokeResult,
    normalLaunchSmoke: { ok: true, target: "welcome window" }
  }, null, 2));
} finally {
  await rm(resultDir, { force: true, recursive: true });
}

function runNormalLaunchSmoke(input) {
  return new Promise((resolveRun, rejectRun) => {
    const port = 9349;
    const child = spawn(input.command, [`--remote-debugging-port=${port}`], {
      cwd: appRoot,
      env: {
        ...process.env,
        ELECTRON_ENABLE_LOGGING: "1"
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

    waitForNormalLaunch(port, input.timeoutMs - 1_000)
      .then(async () => {
        clearTimeout(timeout);
        child.kill();
        resolveRun();
      })
      .catch((error) => {
        clearTimeout(timeout);
        child.kill();
        rejectRun(error);
      });
  });
}

async function waitForNormalLaunch(port, timeoutMs) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const targets = await httpJson(`http://127.0.0.1:${port}/json/list`);
      const page = targets.find(
        (target) => target.type === "page" && target.webSocketDebuggerUrl
      );

      if (page !== undefined) {
        const client = await CdpClient.connect(page.webSocketDebuggerUrl);
        await client.send("Runtime.enable");
        const rendered = await client.evaluate(
          "document.body?.innerText.includes('Local Work OS') === true"
        );
        client.close();

        if (rendered === true) {
          return;
        }
      }
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw new Error(
    `Packaged normal launch did not render the welcome window. ${
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

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
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
