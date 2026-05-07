import {
  ActivityLogRepository,
  DatabaseBootstrapService,
  createDatabaseConnection
} from "@local-work-os/db";
import { ProjectService, TaskService } from "@local-work-os/features";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { App } from "electron";
import {
  assertRuntimeDataPathOutsideAppBundle,
  resolveUserDataPath,
  resolveWorkspacePath
} from "./services/mainProcessPaths";
import { RecentWorkspacesService } from "./services/workspace/RecentWorkspacesService";
import { WorkspaceFileSystemService } from "./services/workspace/WorkspaceFileSystemService";

export async function runPackageSmoke(app: App): Promise<void> {
  const smokeRoot = await mkdtemp(join(tmpdir(), "local-work-os-package-smoke-"));
  const workspaceRootPath = join(smokeRoot, "Smoke Workspace");
  const recentWorkspacesPath = assertRuntimeDataPathOutsideAppBundle(
    app,
    resolveUserDataPath(app, "package-smoke", "recent-workspaces.json")
  );

  try {
    await mkdir(workspaceRootPath, { recursive: true });

    const workspaceService = new WorkspaceFileSystemService({
      databaseBootstrapService: new DatabaseBootstrapService(),
      recentWorkspacesService: new RecentWorkspacesService(recentWorkspacesPath),
      now: () => new Date("2026-05-07T00:00:00.000Z")
    });

    const workspace = await workspaceService.createWorkspace({
      name: "Smoke Workspace",
      rootPath: workspaceRootPath
    });
    const databasePath = resolveWorkspacePath(workspace.rootPath, "databasePath");
    const attachmentsPath = resolveWorkspacePath(
      workspace.rootPath,
      "attachmentsPath"
    );
    const appBundlePath = app.getAppPath();

    assertRuntimeDataPathOutsideAppBundle(app, databasePath);
    assertRuntimeDataPathOutsideAppBundle(app, attachmentsPath);

    let connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    const ids = createSmokeIdFactory();
    const projectService = new ProjectService({
      connection,
      idFactory: ids,
      now: () => new Date("2026-05-07T00:01:00.000Z")
    });
    const taskService = new TaskService({
      connection,
      idFactory: ids,
      now: () => new Date("2026-05-07T00:02:00.000Z")
    });
    const project = await projectService.createProject({
      workspaceId: workspace.id,
      name: "Packaged Smoke",
      description: "Verifies packaged workspace persistence."
    });
    const task = await taskService.createTask({
      workspaceId: workspace.id,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      title: "Persist packaged data"
    });

    connection.close();
    connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    const activityActions = new ActivityLogRepository(connection)
      .listRecent(workspace.id, 10)
      .map((activity) => activity.action);

    if (!activityActions.includes("container_created")) {
      throw new Error("Packaged smoke did not persist project activity.");
    }

    if (!activityActions.includes("task_created")) {
      throw new Error("Packaged smoke did not persist task activity.");
    }

    connection.close();

    const result = {
      ok: true,
      appBundlePath,
      workspaceRootPath: workspace.rootPath,
      databasePath,
      attachmentsPath,
      projectId: project.project.id,
      taskId: task.item.id
    };

    if (process.env.LOCAL_WORK_OS_PACKAGE_SMOKE_RESULT !== undefined) {
      await writeFile(
        process.env.LOCAL_WORK_OS_PACKAGE_SMOKE_RESULT,
        `${JSON.stringify(result, null, 2)}\n`,
        "utf8"
      );
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } finally {
    await rm(smokeRoot, { force: true, recursive: true });
  }
}

function createSmokeIdFactory(): (prefix: string) => string {
  let next = 0;

  return (prefix) => `${prefix}_package_smoke_${++next}`;
}
