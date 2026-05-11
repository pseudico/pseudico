import { afterEach, describe, expect, it } from "vitest";
import {
  ActivityLogRepository,
  CategoryRepository,
  ContainerRepository,
  DatabaseBootstrapService,
  DatabaseHealthService,
  SearchIndexRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  BackupService,
  CategoryService,
  ExportService,
  NoteService,
  ProjectService,
  SearchService,
  TaskService
} from "@local-work-os/features";
import {
  createTempWorkspace,
  makeTestIds,
  seedSmokeData,
  type TestWorkspaceHandle
} from "@local-work-os/test-utils";
import {
  createSmokeBackupFileSystem,
  createSmokeExportFileSystem,
  launchDesktopAppForTest,
  readWorkspaceRelativeFile
} from "./mvpSmokeHarness";

let workspace: TestWorkspaceHandle | null = null;
let connection: DatabaseConnection | null = null;

const smokeTimestamp = "2026-05-01T00:00:00.000Z";
const smokeTimestampLater = "2026-05-01T01:00:00.000Z";

describe("MVP end-to-end smoke flow", () => {
  afterEach(async () => {
    connection?.close();
    connection = null;
    await workspace?.cleanup();
    workspace = null;
  });

  it("launches, creates core workspace data, searches it, backs it up, exports it, and reopens persisted data", async () => {
    expect(launchDesktopAppForTest()).toContain("Create workspace");

    workspace = await createTempWorkspace();
    const seed = seedSmokeData({
      workspaceId: workspace.manifest.id,
      workspaceName: workspace.manifest.name,
      timestamp: smokeTimestamp
    });
    const ids = makeTestIds();

    await new DatabaseBootstrapService({
      idFactory: ids.nextId,
      now: () => new Date(seed.timestamp)
    }).bootstrapWorkspaceDatabase({
      databasePath: workspace.paths.databasePath,
      workspaceId: seed.workspaceId,
      workspaceName: seed.workspaceName
    });

    connection = await createDatabaseConnection({
      databasePath: workspace.paths.databasePath,
      fileMustExist: true
    });

    const smokeData = await seedMvpSmokeData({
      connection,
      idFactory: ids.nextId,
      workspaceId: seed.workspaceId
    });

    const searchResults = new SearchService({
      connection,
      idFactory: ids.nextId,
      now: () => new Date(smokeTimestampLater)
    }).search({
      workspaceId: seed.workspaceId,
      query: "runbook",
      kinds: ["note"],
      limit: 5
    });

    expect(searchResults).toMatchObject([
      {
        kind: "note",
        title: "Launch runbook",
        containerTitle: "Launch Plan",
        destinationPath: `/projects/${smokeData.projectId}`
      }
    ]);

    const backup = await new BackupService({
      connection,
      fileSystem: createSmokeBackupFileSystem(workspace),
      idFactory: ids.nextId,
      now: () => new Date(smokeTimestampLater)
    }).createManualBackup({
      workspaceId: seed.workspaceId,
      workspaceName: seed.workspaceName,
      databaseRelativePath: "data/local-work-os.sqlite",
      backupRelativePath: "backups/mvp-smoke",
      backupDatabaseRelativePath: "backups/mvp-smoke/local-work-os.sqlite",
      manifestRelativePath: "backups/mvp-smoke/attachment-manifest.json"
    });

    expect(backup).toMatchObject({
      workspaceId: seed.workspaceId,
      relativePath: "backups/mvp-smoke",
      attachmentCount: 0
    });
    expect(backup.databaseSizeBytes).toBeGreaterThan(0);

    const exportService = new ExportService({
      connection,
      fileSystem: createSmokeExportFileSystem(workspace),
      idFactory: ids.nextId,
      now: () => new Date(smokeTimestampLater)
    });
    const workspaceExport = await exportService.exportWorkspaceJson({
      workspaceId: seed.workspaceId,
      exportRelativePath: "exports/mvp-smoke-workspace.json"
    });
    const taskExport = await exportService.exportTasksCsv({
      workspaceId: seed.workspaceId,
      exportRelativePath: "exports/mvp-smoke-tasks.csv"
    });

    expect(workspaceExport).toMatchObject({
      workspaceId: seed.workspaceId,
      relativePath: "exports/mvp-smoke-workspace.json",
      itemCount: 2
    });
    expect(taskExport).toMatchObject({
      workspaceId: seed.workspaceId,
      relativePath: "exports/mvp-smoke-tasks.csv",
      rowCount: 1
    });

    const exportedJson = await readWorkspaceRelativeFile(
      workspace,
      workspaceExport.relativePath
    );
    const exportedTasks = await readWorkspaceRelativeFile(
      workspace,
      taskExport.relativePath
    );

    expect(exportedJson).toContain("Launch runbook");
    expect(exportedTasks).toContain("Book smoke-test review");
    expect(exportedTasks).toContain("mvp-smoke");

    expect(
      new ActivityLogRepository(connection).listRecent(seed.workspaceId, 20).map(
        (activity) => activity.action
      )
    ).toEqual(
      expect.arrayContaining([
        "workspace_created",
        "container_created",
        "task_created",
        "task_completed",
        "note_created",
        "category_created",
        "category_assigned",
        "backup_created",
        "export_created"
      ])
    );

    connection.close();
    connection = await createDatabaseConnection({
      databasePath: workspace.paths.databasePath,
      fileMustExist: true
    });

    await expect(
      new DatabaseHealthService({ connection }).getHealthReport()
    ).resolves.toMatchObject({
      connected: true,
      schemaVersion: 12,
      pendingMigrationCount: 0,
      error: null
    });
    expect(new WorkspaceRepository(connection).getById(seed.workspaceId))
      .toMatchObject({
        id: seed.workspaceId,
        name: seed.workspaceName
      });
    expect(new ContainerRepository(connection).getById(smokeData.projectId))
      .toMatchObject({
        name: "Launch Plan",
        categoryId: smokeData.categoryId
      });
    expect(new TaskRepository(connection).getByItemId(smokeData.taskId))
      .toMatchObject({
        task: {
          taskStatus: "done"
        }
      });
    expect(new CategoryRepository(connection).getById(smokeData.categoryId))
      .toMatchObject({
        name: "MVP"
      });
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: seed.workspaceId,
      targetType: "item",
      targetId: smokeData.noteId
    })).toMatchObject({
      title: "Launch runbook",
      isDeleted: false
    });
  });
});

async function seedMvpSmokeData(input: {
  connection: DatabaseConnection;
  idFactory: (prefix: string) => string;
  workspaceId: string;
}): Promise<{
  categoryId: string;
  noteId: string;
  projectId: string;
  taskId: string;
}> {
  const now = () => new Date(smokeTimestampLater);
  const projectService = new ProjectService({
    connection: input.connection,
    idFactory: input.idFactory,
    now
  });
  const taskService = new TaskService({
    connection: input.connection,
    idFactory: input.idFactory,
    now
  });
  const noteService = new NoteService({
    connection: input.connection,
    idFactory: input.idFactory,
    now
  });
  const categoryService = new CategoryService({
    connection: input.connection,
    idFactory: input.idFactory,
    now
  });

  const project = await projectService.createProject({
    workspaceId: input.workspaceId,
    name: "Launch Plan",
    description: "MVP smoke test project"
  });
  const task = await taskService.createTask({
    workspaceId: input.workspaceId,
    containerId: project.project.id,
    containerTabId: project.defaultTab.id,
    title: "Book smoke-test review @mvp-smoke",
    body: "Confirm project task completion survives reopen.",
    dueAt: "2026-05-07T00:00:00.000Z",
    priority: 2
  });
  const note = await noteService.createNote({
    workspaceId: input.workspaceId,
    containerId: project.project.id,
    containerTabId: project.defaultTab.id,
    title: "Launch runbook",
    content: "# Launch runbook\n\nUse this runbook for the MVP smoke test."
  });
  const category = await categoryService.createCategory({
    workspaceId: input.workspaceId,
    name: "MVP",
    color: "#2c6b8f"
  });

  await categoryService.assignCategoryToContainer({
    workspaceId: input.workspaceId,
    containerId: project.project.id,
    categoryId: category.id
  });
  await categoryService.assignCategoryToItem({
    workspaceId: input.workspaceId,
    itemId: task.item.id,
    categoryId: category.id
  });
  await taskService.completeTask(task.item.id);

  return {
    categoryId: category.id,
    noteId: note.item.id,
    projectId: project.project.id,
    taskId: task.item.id
  };
}
