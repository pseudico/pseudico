import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { App, BrowserWindow, NativeImage } from "electron";
import { productionRouteManifest, type ProductionRouteManifestEntry } from "../shared/productionRouteManifest";
import type { DesktopIpcServices } from "./ipc";

type CaptureTarget = ProductionRouteManifestEntry & {
  route: string;
};

type SeedResult = {
  projectId: string;
  contactId: string;
};

const captureSizes = [
  { label: "1440x1000", width: 1440, height: 1000 },
  { label: "1280x800", width: 1280, height: 800 }
] as const;

function getRequestedCaptureSizes(): readonly (typeof captureSizes)[number][] {
  const requested = process.env.LOCAL_WORK_OS_CAPTURE_SIZES;

  if (requested === undefined || requested.trim().length === 0) {
    return captureSizes;
  }

  const allowed = new Set(requested.split(",").map((value) => value.trim()));
  const filtered = captureSizes.filter((size) => allowed.has(size.label));

  return filtered.length === 0 ? captureSizes : filtered;
}

export async function runPse241FullAppCapture(input: {
  app: App;
  services: DesktopIpcServices;
  window: BrowserWindow;
  issueKey?: string;
}): Promise<void> {
  const issueKey = input.issueKey ?? process.env.LOCAL_WORK_OS_CAPTURE_ISSUE ?? "PSE-247-full-app-visual-qa-gate";
  const repoRoot = process.env.LOCAL_WORK_OS_REPO_ROOT ??
    (process.cwd().replace(/\\/g, "/").endsWith("/apps/desktop")
      ? join(process.cwd(), "..", "..")
      : process.cwd());
  const outputDir = join(repoRoot, "docs", "manual-qa", "screenshots", issueKey);
  logCaptureStep(`start ${issueKey}`);
  await mkdir(outputDir, { recursive: true });

  const workspaceRoot = join(input.app.getPath("temp"), `pseudico-pse241-${Date.now()}`);
  await rm(workspaceRoot, { force: true, recursive: true });

  const workspace = await input.services.workspaceService.createDemoWorkspace({
    name: "PSE-241 full-app cohesion workspace",
    rootPath: workspaceRoot
  });

  await waitForInitialLoad(input.window);
  const seed = await seedFullAppOperatorData(input.window, workspace.id);
  const targets = resolveCaptureTargets(seed);

  for (const target of targets) {
    await navigateToRoute(input.window, target);
    await assertRouteIdentity(input.window, target);
  }

  const identityRows: string[] = [
    "# PSE-241 route identity capture results",
    "",
    "| Route | Screenshot key | Heading assertion | Landmark assertions |",
    "| --- | --- | --- | --- |"
  ];

  for (const size of getRequestedCaptureSizes()) {
    input.window.setContentSize(size.width, size.height);
    await delay(500);

    for (const target of targets) {
      logCaptureStep(`capture ${target.screenshotKey} ${size.label}`);
      await navigateToRoute(input.window, target);
      const result = await assertRouteIdentity(input.window, target);
      const image = await capturePageWithRetry(input.window);
      await writeFile(join(outputDir, `${target.screenshotKey}-${size.label}.png`), image.toPNG());
      if (size.label === "1440x1000") {
        identityRows.push(
          `| \`${target.route}\` | \`${target.screenshotKey}\` | ${result.headingFound ? "pass" : "fail"} | ${result.missingLandmarks.length === 0 ? "pass" : `missing ${result.missingLandmarks.join(", ")}`} |`
        );
      }
    }
  }

  await writeFile(join(outputDir, "route-identity-results.md"), `${identityRows.join("\n")}\n`);
  await rm(workspaceRoot, { force: true, recursive: true });
  logCaptureStep("done");
}

function resolveCaptureTargets(seed: SeedResult): CaptureTarget[] {
  const requestedTargets = process.env.LOCAL_WORK_OS_CAPTURE_TARGETS;
  const allowed =
    requestedTargets === undefined || requestedTargets.trim().length === 0
      ? null
      : new Set(requestedTargets.split(",").map((value) => value.trim()).filter(Boolean));

  return productionRouteManifest.filter((entry) =>
    allowed === null ||
    allowed.has(entry.screenshotKey) ||
    allowed.has(entry.path)
  ).map((entry) => ({
    ...entry,
    route: entry.path
      .replace(":projectId", seed.projectId)
      .replace(":contactId", seed.contactId)
  }));
}

async function seedFullAppOperatorData(window: BrowserWindow, workspaceId: string): Promise<SeedResult> {
  return window.webContents.executeJavaScript(`(async () => {
    const api = window.localWorkOs;
    const projects = await api.projects.listProjects(${JSON.stringify(workspaceId)});
    if (!projects.ok || projects.data.length === 0) {
      throw new Error("PSE-241 capture could not load demo projects");
    }
    const launch = projects.data.find((project) => project.name === "Launch Readiness") ?? projects.data[0];
    const today = new Date();
    today.setHours(10, 30, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const contactResult = await api.contacts.createContact({
      workspaceId: ${JSON.stringify(workspaceId)},
      name: "Maya Chen — launch reviewer for operator handoff and local recovery evidence",
      description: "Reviews the final local-only runbook, backup evidence, client approval notes, and launch readiness risks.",
      color: "#2c6b8f",
      actorType: "system"
    });
    if (!contactResult.ok) throw new Error(contactResult.error.message);
    const contact = contactResult.data.contact;

    await api.tasks.createTask({
      workspaceId: ${JSON.stringify(workspaceId)},
      containerId: launch.id,
      title: "Confirm redirected owner before content freeze today 10:30 — Website relaunch handoff",
      body: "Long realistic Today task proving row titles, project context, due date, and next actions remain readable in production routes.",
      dueAt: today.toISOString(),
      startAt: today.toISOString(),
      priority: 1,
      actorType: "system"
    });
    await api.tasks.createTask({
      workspaceId: ${JSON.stringify(workspaceId)},
      containerId: contact.id,
      title: "Follow up with Maya about launch recovery evidence, signed approval notes, and the support-file path that must wrap cleanly",
      body: "Contact detail primary-feed long title evidence. The operator must be able to read this before looking at profile or relationship panels.",
      dueAt: tomorrow.toISOString(),
      startAt: tomorrow.toISOString(),
      priority: 2,
      actorType: "system"
    });
    await api.notes.createNote({
      workspaceId: ${JSON.stringify(workspaceId)},
      containerId: contact.id,
      title: "Maya handoff notes with long local recovery path and approval caveats",
      content: "The contact page should preserve a full paragraph of context for the operator, including C:\\\\Users\\\\Local Work OS\\\\Evidence\\\\handoff-review-with-an-exceptionally-long-file-name.md and the next safe follow-up action.",
      pinned: true,
      actorType: "system"
    });
    await api.notes.createNote({
      workspaceId: ${JSON.stringify(workspaceId)},
      containerId: launch.id,
      title: "Client approval notes from 17 May with launch caveats and service-page wording",
      content: "The workspace should preserve the full paragraph of context so the operator can understand what changed, why it matters, where the supporting files live, and what the next safe action is without opening three unrelated panels. @operator @handoff",
      pinned: true,
      actorType: "system"
    });
    await api.links.createLink({
      workspaceId: ${JSON.stringify(workspaceId)},
      containerId: launch.id,
      url: "https://example.test/operator-handoff/readiness-review?source=pse-241-full-app-cohesion",
      title: "Analytics redirect notes from Jen with a very long reference title and visible example.test domain",
      description: "Long link/domain evidence for search, project detail, and inspector panels.",
      actorType: "system"
    });
    return { projectId: launch.id, contactId: contact.id };
  })()`);
}

async function navigateToRoute(window: BrowserWindow, target: CaptureTarget): Promise<void> {
  logCaptureStep(`navigate ${target.screenshotKey}`);
  await window.webContents.executeJavaScript(
    `setTimeout(() => { window.location.hash = ${JSON.stringify(`#${target.route}`)}; }, 0); true;`
  );
  await Promise.race([
    window.webContents.executeJavaScript(`new Promise((resolve) => {
      const expected = ${JSON.stringify(target.route)};
      const expectedPath = expected.split("?")[0];
      const currentPath = () => window.location.hash.slice(1).split("?")[0];
      if (currentPath() === expectedPath) { resolve(true); return; }
      const startedAt = Date.now();
      const tick = () => {
        if (currentPath() === expectedPath || Date.now() - startedAt > 5000) {
          resolve(currentPath() === expectedPath);
          return;
        }
        setTimeout(tick, 100);
      };
      tick();
    })`),
    delay(6000)
  ]);
  await waitForRendererIdle(window);
  await delay(2600);
}

async function assertRouteIdentity(window: BrowserWindow, target: CaptureTarget): Promise<{
  headingFound: boolean;
  missingLandmarks: string[];
}> {
  const result = await window.webContents.executeJavaScript(`(() => {
    const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim().toLowerCase();
    const fieldText = [...document.querySelectorAll("input, textarea, select, button, [aria-label]")]
      .map((node) => [
        node.textContent,
        node.getAttribute("aria-label"),
        node.getAttribute("placeholder"),
        "value" in node ? node.value : ""
      ].filter(Boolean).join(" "))
      .join(" ");
    const body = normalize(document.body.innerText + " " + fieldText);
    const headings = [...document.querySelectorAll("h1,h2,h3,[role='heading']")].map((node) => normalize(node.textContent)).join(" || ");
    const expectedHeading = normalize(${JSON.stringify(target.expectedHeading)});
    const landmarks = ${JSON.stringify(target.expectedLandmarks)};
    return {
      hash: window.location.hash,
      headingFound: headings.includes(expectedHeading) || body.includes(expectedHeading),
      missingLandmarks: landmarks.filter((landmark) => !body.includes(normalize(landmark)))
    };
  })()`);

  const routePath = target.route.split("?")[0];
  const actualHash = typeof result.hash === "string" ? result.hash : "";
  const actualPath = actualHash.startsWith("#") ? actualHash.slice(1).split("?")[0] : actualHash;
  if (actualPath !== routePath) {
    throw new Error(`Route identity failed for ${target.screenshotKey}: expected ${routePath}, got ${actualHash}`);
  }
  if (!result.headingFound || result.missingLandmarks.length > 0) {
    throw new Error(
      `Route identity failed for ${target.screenshotKey}: heading=${result.headingFound}, missing=${result.missingLandmarks.join(", ")}`
    );
  }

  return result;
}

async function capturePageWithRetry(window: BrowserWindow): Promise<NativeImage> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await forceWindowPaint(window);
      await delay(700);
      await window.webContents.capturePage();
      await delay(700);
      return await window.webContents.capturePage();
    } catch (error) {
      lastError = error;
      logCaptureStep(`capture retry ${attempt}`);
      await delay(1000);
    }
  }
  throw lastError;
}

async function forceWindowPaint(window: BrowserWindow): Promise<void> {
  const [width = 1280, height = 800] = window.getContentSize();
  window.setContentSize(width + 1, height);
  await delay(200);
  window.setContentSize(width, height);
}

async function waitForInitialLoad(window: BrowserWindow): Promise<void> {
  if (window.webContents.isLoadingMainFrame()) {
    await Promise.race([
      new Promise<void>((resolve) => {
        window.webContents.once("did-finish-load", () => resolve());
        window.webContents.once("did-fail-load", () => resolve());
      }),
      delay(10000)
    ]);
  }
  await waitForRendererIdle(window);
}

async function waitForRendererIdle(window: BrowserWindow): Promise<void> {
  await Promise.race([
    window.webContents.executeJavaScript(`new Promise((resolve) => {
      const settle = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
      if (document.readyState === "complete") settle();
      else window.addEventListener("load", settle, { once: true });
    })`),
    delay(10000)
  ]);
  await delay(1200);
}

function logCaptureStep(message: string): void {
  console.log(`[PSE-241 capture] ${message}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
