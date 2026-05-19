import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { App, BrowserWindow } from "electron";
import type { DesktopIpcServices } from "./ipc";

const PSE240_OUTPUT_DIR = join(
  process.cwd(),
  "docs",
  "manual-qa",
  "screenshots",
  "PSE-240-option-10-production-parity"
);

type CaptureTarget = {
  key: string;
  route: string;
};

const captureTargets = (projectId: string): CaptureTarget[] => [
  { key: "workspace-home", route: "/workspace" },
  { key: "today-planning", route: "/today" },
  { key: "project-detail", route: `/projects/${projectId}` },
  { key: "search-collections", route: "/search?q=operator%20handoff" },
  { key: "timeline-calendar", route: "/timeline" }
];

const captureSizes = [
  { label: "1440x1000", width: 1440, height: 1000 },
  { label: "1280x800", width: 1280, height: 800 }
] as const;

export async function runPse240Capture(input: {
  app: App;
  services: DesktopIpcServices;
  window: BrowserWindow;
}): Promise<void> {
  logCaptureStep("start");
  await mkdir(PSE240_OUTPUT_DIR, { recursive: true });

  const workspaceRoot = join(
    input.app.getPath("temp"),
    `pseudico-pse240-${Date.now()}`
  );

  await rm(workspaceRoot, { force: true, recursive: true });
  logCaptureStep(`create workspace ${workspaceRoot}`);
  const workspace = await input.services.workspaceService.createDemoWorkspace({
    name: "PSE-240 option-10 production parity workspace",
    rootPath: workspaceRoot
  });

  logCaptureStep(`workspace ready ${workspace.id}`);
  await waitForInitialLoad(input.window);
  logCaptureStep("window loaded");
  const projectId = await seedLongOperatorData(input.window, workspace.id);
  logCaptureStep(`seeded project ${projectId}`);
  for (const target of captureTargets(projectId)) {
    logCaptureStep(`warm ${target.key}`);
    await navigateToRoute(input.window, target.route);
  }

  for (const size of captureSizes) {
    input.window.setContentSize(size.width, size.height);
    await delay(250);

    for (const target of captureTargets(projectId)) {
      logCaptureStep(`capture ${target.key} ${size.label}`);
      await navigateToRoute(input.window, target.route);
      const image = await input.window.webContents.capturePage();
      await writeFile(
        join(PSE240_OUTPUT_DIR, `${target.key}-${size.label}.png`),
        image.toPNG()
      );
    }
  }

  await rm(workspaceRoot, { force: true, recursive: true });
  logCaptureStep("done");
}

function logCaptureStep(message: string): void {
  console.log(`[PSE-240 capture] ${message}`);
}

async function seedLongOperatorData(
  window: BrowserWindow,
  workspaceId: string
): Promise<string> {
  return window.webContents.executeJavaScript(`(async () => {
    const api = window.localWorkOs;
    const projects = await api.projects.listProjects(${JSON.stringify(workspaceId)});
    if (!projects.ok || projects.data.length === 0) {
      throw new Error("PSE-240 capture could not load demo projects");
    }
    const launch = projects.data.find((project) => project.name === "Launch Readiness") ?? projects.data[0];
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    await api.contacts.createContact({
      workspaceId: ${JSON.stringify(workspaceId)},
      name: "Maya Chen — launch reviewer for operator handoff and local recovery evidence",
      description: "Reviews the final local-only runbook, backup evidence, client approval notes, and launch readiness risks.",
      color: "#2c6b8f",
      actorType: "system"
    });

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
      containerId: launch.id,
      title: "Coordinate the multi-day supplier readiness review, attachment audit, calendar handoff, and executive sign-off without hiding the actual task name",
      body: "Timeline evidence: the full work title must stay in a readable row label or detail area while bars only carry date/status information.",
      startAt: tomorrow.toISOString(),
      dueAt: nextWeek.toISOString(),
      priority: 2,
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
      url: "https://example.test/operator-handoff/readiness-review?source=pse-240-option-10",
      title: "Analytics redirect notes from Jen with a very long reference title and visible example.test domain",
      description: "Long link/domain evidence for search, project detail, and inspector panels.",
      actorType: "system"
    });

    return launch.id;
  })()`);
}

async function navigateToRoute(window: BrowserWindow, route: string): Promise<void> {
  await window.webContents.executeJavaScript(
    `window.location.hash = ${JSON.stringify(route)}; void 0;`
  );
  await waitForRendererIdle(window);
}

async function waitForInitialLoad(window: BrowserWindow): Promise<void> {
  if (!window.webContents.isLoadingMainFrame()) {
    await waitForRendererIdle(window);
    return;
  }

  await new Promise<void>((resolve) => {
    window.webContents.once("did-finish-load", () => resolve());
  });
  await waitForRendererIdle(window);
}

async function waitForRendererIdle(window: BrowserWindow): Promise<void> {
  await window.webContents.executeJavaScript(`new Promise((resolve) => {
    const settle = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
    if (document.readyState === "complete") {
      settle();
    } else {
      window.addEventListener("load", settle, { once: true });
    }
  })`);
  await delay(2200);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
