import { spawn, execFile } from "node:child_process";
import { createHash } from "node:crypto";
import http from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(appRoot, "../..");
const args = parseArgs(process.argv.slice(2));
const timeoutMs = Number(args.timeoutMs ?? args.timeout ?? 60_000);
const commandTimeoutMs = Number(args.commandTimeoutMs ?? 30_000);
const port = Number(args.port ?? 9361);
const workspaceRootPath = resolveRequiredPath(args.workspace, "--workspace");
const screenshotDir = resolve(
  repoRoot,
  String(args.screenshotDir ?? "docs/manual-qa/screenshots/packaged-route-evidence")
);
const userDataDir = resolve(
  String(
    args.userDataDir ?? join(tmpdir(), `local-work-os-route-evidence-${Date.now()}`)
  )
);
const executablePath = getPackagedExecutablePath();
const appAsarPath = join(getPackagedResourcesPath(), "app.asar");

const routes = [
  {
    key: "workspace",
    hash: "#/workspace",
    waitFor: ["__WORKSPACE_NAME__"],
    screenshot: "00-workspace.png"
  },
  {
    key: "search-retrospective",
    hash: "#/search?q=retrospective",
    waitFor: ["retrospective"],
    waitUntilNot: ["Searching local index"],
    screenshot: "01-search-retrospective.png"
  },
  {
    key: "search-painting-weekend",
    hash: "#/search?q=Painting%20weekend",
    waitFor: ["Painting weekend"],
    waitUntilNot: ["Searching local index"],
    screenshot: "02-search-painting-weekend.png"
  },
  {
    key: "search-balcony",
    hash: "#/search?q=balcony",
    waitFor: ["balcony"],
    waitUntilNot: ["Searching local index"],
    screenshot: "03-search-balcony.png"
  },
  {
    key: "today",
    hash: "#/today",
    waitFor: ["Daily and weekly summary", "Visible work lanes"],
    screenshot: "04-today.png"
  }
].filter((route) => {
  if (args.routes === undefined) {
    return true;
  }
  const requested = String(args.routes)
    .split(",")
    .map((routeKey) => routeKey.trim())
    .filter(Boolean);
  return requested.includes(route.key);
});

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
        clearTimeout(callbacks.timeout);

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
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectSend(new Error(`${method} timed out after ${commandTimeoutMs}ms.`));
      }, commandTimeoutMs);
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend, timeout });
      this.webSocket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });

    if (result.exceptionDetails !== undefined) {
      throw new Error(
        result.exceptionDetails.text ?? "Runtime.evaluate failed in packaged app."
      );
    }

    return result.result?.value;
  }

  close() {
    this.webSocket.close();
  }
}

await mkdir(screenshotDir, { recursive: true });
await mkdir(userDataDir, { recursive: true });

let child = null;
let stderr = "";
let stdout = "";

try {
  await stat(executablePath);
  await stat(appAsarPath);
  child = spawn(
    executablePath,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "--disable-gpu"
    ],
    {
      cwd: appRoot,
      env: {
        ...process.env,
        ELECTRON_ENABLE_LOGGING: "1"
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    }
  );
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const page = await waitForNormalLaunch({ child, port, timeoutMs });
  const client = await CdpClient.connect(page.webSocketDebuggerUrl);
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await waitForBodyText(client, { includes: ["Local Work OS"], timeoutMs });

  const workspace = await client.evaluate(`
    (async () => {
      const result = await window.localWorkOs.workspace.openWorkspace({ rootPath: ${JSON.stringify(workspaceRootPath)} });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      location.hash = "#/workspace";
      return result.data;
    })()
  `);
  const workspaceIdJson = JSON.stringify(workspace.id);
  const apiChecks = await client.evaluate(`
    (async () => {
      const checks = [];
      for (const query of ["retrospective", "Painting weekend", "balcony"]) {
        const startedAt = Date.now();
        const result = await window.localWorkOs.search.searchWorkspace({
          workspaceId: ${workspaceIdJson},
          query,
          limit: 30,
          offset: 0
        });
        checks.push({
          query,
          ok: result.ok,
          durationMs: Date.now() - startedAt,
          count: result.ok ? result.data.length : null,
          error: result.ok ? null : result.error.message
        });
      }
      const recentStartedAt = Date.now();
      const recent = await window.localWorkOs.search.listRecentSearches(${workspaceIdJson});
      checks.push({
        query: "recent-searches",
        ok: recent.ok,
        durationMs: Date.now() - recentStartedAt,
        count: recent.ok ? recent.data.length : null,
        error: recent.ok ? null : recent.error.message
      });
      return checks;
    })()
  `);

  const routeResults = [];
  for (const route of routes) {
    await client.evaluate(`location.hash = ${JSON.stringify(route.hash)}`);
    const waitFor = route.waitFor.map((term) =>
      term === "__WORKSPACE_NAME__" ? workspace.name : term
    );
    if (args.blindCapture !== undefined) {
      await delay(Number(args.settleMs ?? 10_000));
    } else if (route.key.startsWith("search-")) {
      await waitForSearchSettled(client, { includes: waitFor, timeoutMs });
    } else {
      await waitForBodyText(client, {
        includes: waitFor,
        excludes: route.waitUntilNot ?? [],
        timeoutMs
      });
    }
    const screenshotPath = join(screenshotDir, route.screenshot);
    if (args.blindCapture === undefined) {
      await client.send("Page.bringToFront");
    }
    const captured = await client.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true
    });
    await writeFile(screenshotPath, Buffer.from(captured.data, "base64"));
    const summary = await evaluateOptionalSummary(client);
    routeResults.push({
      key: route.key,
      hash: route.hash,
      screenshotPath,
      ...summary
    });
  }

  client.close();
  console.log(
    JSON.stringify(
      {
        ok: true,
        workspace,
        apiChecks,
        workspaceRootPath,
        screenshotDir,
        userDataDir,
        routes: routeResults,
        ...(await collectMetadata()),
        stdoutTail: stdout.slice(-1_000),
        stderrTail: stderr.slice(-1_000)
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
        workspaceRootPath,
        screenshotDir,
        userDataDir,
        error: error instanceof Error ? error.message : String(error),
        stdoutTail: stdout.slice(-1_000),
        stderrTail: stderr.slice(-1_000)
      },
      null,
      2
    )
  );
  process.exitCode = 1;
} finally {
  if (child !== null) {
    await terminateProcessTree(child);
  }
  if (args.keepUserDataDir === undefined) {
    await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function evaluateOptionalSummary(client) {
  try {
    return await client.evaluate(`
      (() => {
        const bodyText = document.body?.innerText ?? "";
        const cards = Array.from(document.querySelectorAll(".search-result-card")).map((node) => ({
          title: node.querySelector(".search-result-card-title")?.textContent?.trim() ?? "",
          meta: node.querySelector(".search-result-card-meta")?.textContent?.trim() ?? ""
        }));
        return {
          url: location.href,
          bodyTextPreview: bodyText.slice(0, 1200),
          bodyTextLength: bodyText.length,
          searchResultCardCount: cards.length,
          searchResultCards: cards.slice(0, 20)
        };
      })()
    `);
  } catch (error) {
    return {
      summaryError: error instanceof Error ? error.message : String(error)
    };
  }
}

async function waitForSearchSettled(client, input) {
  const startedAt = Date.now();
  let state = null;

  while (Date.now() - startedAt < input.timeoutMs) {
    state = await client.evaluate(`
      (() => {
        const bodyText = document.body?.innerText ?? "";
        const cardCount = document.querySelectorAll(".search-result-card").length;
        return {
          bodyText: bodyText.slice(0, 1000),
          includes: ${JSON.stringify(input.includes)}.every((term) => bodyText.includes(term)),
          searching: bodyText.includes("Searching local index"),
          cardCount,
          empty: bodyText.includes("No visible matches"),
          error: bodyText.includes("Search error")
        };
      })()
    `);

    if (
      state.includes === true &&
      state.searching !== true &&
      (state.cardCount > 0 || state.empty === true || state.error === true)
    ) {
      return state;
    }

    await delay(300);
  }

  throw new Error(
    `Timed out waiting for settled Search route. Last state=${JSON.stringify(state)}`
  );
}

async function waitForNormalLaunch(input) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < input.timeoutMs) {
    if (input.child.exitCode !== null) {
      throw new Error("Packaged app exited before rendering DevTools page.");
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
    `Packaged normal launch did not expose a DevTools page within ${
      input.timeoutMs
    }ms. ${lastError instanceof Error ? lastError.message : ""}`
  );
}

async function waitForBodyText(client, input) {
  const startedAt = Date.now();
  let bodyText = "";

  while (Date.now() - startedAt < input.timeoutMs) {
    bodyText = await client.evaluate("document.body?.innerText ?? ''");
    const includesOk = input.includes.every((term) => bodyText.includes(term));
    const excludesOk = (input.excludes ?? []).every(
      (term) => !bodyText.includes(term)
    );

    if (includesOk && excludesOk) {
      return bodyText;
    }

    await delay(300);
  }

  throw new Error(
    `Timed out waiting for body text. Required=${input.includes.join(
      ", "
    )} Excluded=${(input.excludes ?? []).join(", ")} Body=${bodyText.slice(
      0,
      1000
    )}`
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

function terminateProcessTree(childProcess) {
  return new Promise((resolveTerminate) => {
    if (childProcess.exitCode !== null) {
      resolveTerminate();
      return;
    }

    if (process.platform !== "win32") {
      childProcess.kill();
      resolveTerminate();
      return;
    }

    execFile(
      "taskkill",
      ["/pid", String(childProcess.pid), "/T", "/F"],
      { windowsHide: true },
      () => resolveTerminate()
    );
  });
}

async function collectMetadata() {
  const [executable, appAsar, gitSha] = await Promise.all([
    fileEvidence(executablePath),
    fileEvidence(appAsarPath),
    getGitSha()
  ]);
  return {
    gitSha,
    executablePath,
    appAsarPath,
    executable,
    appAsar
  };
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
      resolveSha(error ? null : stdout.trim());
    });
  });
}

function resolveRequiredPath(value, flagName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${flagName} is required.`);
  }
  return resolve(value);
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
