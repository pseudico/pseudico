import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ActivityLogRepository,
  AttachmentRepository,
  CategoryRepository,
  ContainerRepository,
  DashboardRepository,
  DatabaseBootstrapService,
  DatabaseHealthService,
  ItemRepository,
  ListRepository,
  MigrationService,
  RelationshipRepository,
  SavedViewRepository,
  SearchIndexRepository,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  BackupService,
  CalendarService,
  CategoryService,
  CollectionService,
  ContactService,
  DailyPlanService,
  DashboardService,
  ExportService,
  FileAttachmentService,
  LinkService,
  ListService,
  NoteService,
  ProjectService,
  RelationshipService,
  RestoreService,
  SavedViewService,
  SearchService,
  TaskService,
  TimelineService,
  TodayService,
  type WorkspaceExportV1
} from "@local-work-os/features";
import {
  createTempWorkspace,
  makeTestIds,
  type TestWorkspaceHandle
} from "@local-work-os/test-utils";
import {
  createSmokeBackupFileSystem,
  createSmokeExportFileSystem,
  readWorkspaceRelativeFile
} from "./mvpSmokeHarness";

const workspaces: TestWorkspaceHandle[] = [];
const connections: DatabaseConnection[] = [];

const workspaceId = "workspace_backup_restore_golden";
const workspaceName = "Backup Restore Golden Workspace";
const createdAt = "2026-05-15T00:00:00.000Z";
const now = new Date(2026, 4, 15, 9, 30, 0, 0);
const nowLater = new Date(2026, 4, 15, 10, 30, 0, 0);

describe("operator readiness backup/restore golden workflow", () => {
  afterEach(async () => {
    for (const connection of connections.splice(0)) {
      connection.close();
    }
    for (const workspace of workspaces.splice(0)) {
      await workspace.cleanup();
    }
  });

  it("backs up and exports a populated workspace, then restores into clean workspaces with attachments, search, relationships, and activity intact", async () => {
    const source = await createWorkspace({
      id: workspaceId,
      name: workspaceName,
      rootPrefix: "local-work-os-golden-source-"
    });
    const ids = makeTestIds();

    await new DatabaseBootstrapService({
      idFactory: ids.nextId,
      now: () => new Date(createdAt)
    }).bootstrapWorkspaceDatabase({
      databasePath: source.paths.databasePath,
      workspaceId,
      workspaceName
    });
    const populatedConnection = await openConnection(source);
    const fixture = await seedGoldenWorkspace({
      workspace: source,
      connection: populatedConnection,
      idFactory: ids.nextId
    });
    populatedConnection.sqlite.pragma("wal_checkpoint(TRUNCATE)");

    const backup = await new BackupService({
      connection: populatedConnection,
      fileSystem: createSmokeBackupFileSystem(source),
      idFactory: ids.nextId,
      now: () => nowLater
    }).createManualBackup({
      workspaceId,
      workspaceName,
      databaseRelativePath: "data/local-work-os.sqlite",
      backupRelativePath: "backups/operator-golden",
      backupDatabaseRelativePath: "backups/operator-golden/local-work-os.sqlite",
      manifestRelativePath: "backups/operator-golden/attachment-manifest.json"
    });
    const exportService = new ExportService({
      connection: populatedConnection,
      fileSystem: createSmokeExportFileSystem(source),
      idFactory: ids.nextId,
      now: () => nowLater
    });
    const exportResult = await exportService.exportWorkspaceJson({
      workspaceId,
      exportRelativePath: "exports/operator-golden-workspace.json"
    });
    const exportJson = await readWorkspaceRelativeFile(source, exportResult.relativePath);
    const exportData = JSON.parse(exportJson) as WorkspaceExportV1;

    expect(backup).toMatchObject({
      workspaceId,
      attachmentCount: 1,
      totalAttachmentBytes: fixture.attachmentSizeBytes,
      kind: "manual"
    });
    expect(exportResult).toMatchObject({
      workspaceId,
      attachmentCount: 1,
      itemCount: 5
    });
    expect(exportData.data).toMatchObject({
      containers: expect.arrayContaining([
        expect.objectContaining({ id: fixture.projectId, name: "Golden Recovery Project" }),
        expect.objectContaining({ id: fixture.contactId, name: "Riley Recovery" })
      ]),
      relationships: expect.arrayContaining([
        expect.objectContaining({ label: "Recovery owner" }),
        expect.objectContaining({ label: "Recovery evidence" })
      ]),
      savedViews: expect.arrayContaining([
        expect.objectContaining({ id: fixture.savedViewId, name: "Golden recovery tasks" }),
        expect.objectContaining({ id: fixture.collectionId, name: "Golden recovery collection" })
      ]),
      dailyPlans: expect.arrayContaining([
        expect.objectContaining({ planDate: "2026-05-15" })
      ])
    });

    populatedConnection.close();
    connections.pop();

    const exportTarget = await createWorkspace({
      id: "workspace_export_target",
      name: "Export Restore Target",
      rootPrefix: "local-work-os-golden-export-"
    });
    const exportConnection = await openFreshMigratedConnection(exportTarget);
    await copyGoldenAttachmentFiles({
      source,
      target: exportTarget,
      attachments: exportData.attachmentManifest.attachments
    });
    const exportRestore = await new RestoreService({
      connection: exportConnection,
      idFactory: ids.nextId,
      now: () => nowLater
    }).restoreExportToNewWorkspace({
      exportData,
      sourcePath: join(source.workspaceRootPath, exportResult.relativePath),
      targetWorkspaceRootPath: exportTarget.workspaceRootPath,
      copiedAttachmentCount: exportData.attachmentManifest.attachmentCount
    });

    expect(exportRestore).toMatchObject({
      valid: true,
      sourceType: "workspace_export",
      copiedAttachmentCount: 1,
      missingAttachmentCount: 0,
      counts: {
        containers: 3,
        items: 5,
        listItems: 1,
        attachments: 1
      },
      searchIndex: {
        indexedContainerCount: 3,
        indexedItemCount: 5,
        indexedListItemCount: 1,
        indexedAttachmentCount: 1
      }
    });
    await expectGoldenWorkspaceRestored({
      connection: exportConnection,
      workspace: exportTarget,
      fixture,
      restoreActivity: "export_restored"
    });

    const backupTarget = await createWorkspace({
      id: "workspace_backup_target",
      name: "Backup Restore Target",
      rootPrefix: "local-work-os-golden-backup-"
    });
    await copyWorkspaceRelativeFile({
      source,
      target: backupTarget,
      relativePath: backup.manifest.database.backupRelativePath,
      targetRelativePath: "data/local-work-os.sqlite"
    });
    await copyGoldenAttachmentFiles({
      source,
      target: backupTarget,
      attachments: backup.manifest.attachments
    });
    const backupConnection = await openConnection(backupTarget);
    const backupRestore = await new RestoreService({
      connection: backupConnection,
      idFactory: ids.nextId,
      now: () => nowLater
    }).restoreBackupToNewWorkspace({
      manifest: backup.manifest,
      sourcePath: join(source.workspaceRootPath, backup.relativePath),
      targetWorkspaceRootPath: backupTarget.workspaceRootPath,
      copiedAttachmentCount: backup.manifest.attachmentCount
    });

    expect(backupRestore).toMatchObject({
      valid: true,
      sourceType: "backup",
      copiedAttachmentCount: 1,
      missingAttachmentCount: 0,
      searchIndex: {
        indexedContainerCount: 3,
        indexedItemCount: 5,
        indexedListItemCount: 1,
        indexedAttachmentCount: 1
      }
    });
    await expectGoldenWorkspaceRestored({
      connection: backupConnection,
      workspace: backupTarget,
      fixture,
      restoreActivity: "backup_restored"
    });
  });
});

type GoldenFixture = {
  attachmentId: string;
  attachmentChecksum: string;
  attachmentPath: string;
  attachmentSizeBytes: number;
  categoryId: string;
  collectionId: string;
  contactId: string;
  fileItemId: string;
  linkItemId: string;
  listItemId: string;
  listRowId: string;
  noteItemId: string;
  projectId: string;
  savedViewId: string;
  taskItemId: string;
};

async function seedGoldenWorkspace(input: {
  workspace: TestWorkspaceHandle;
  connection: DatabaseConnection;
  idFactory: (prefix: string) => string;
}): Promise<GoldenFixture> {
  const serviceInput = {
    connection: input.connection,
    idFactory: input.idFactory,
    now: () => now
  };
  const category = await new CategoryService(serviceInput).createCategory({
    workspaceId,
    name: "Golden Recovery",
    color: "#2f9e44"
  });
  const project = await new ProjectService(serviceInput).createProject({
    workspaceId,
    name: "Golden Recovery Project",
    description: "Project used to prove backup and restore."
  });
  const contact = await new ContactService(serviceInput).createContact({
    workspaceId,
    name: "Riley Recovery",
    description: "Operator responsible for restore checks.",
    fields: [
      {
        label: "Email",
        value: "riley.recovery@example.test",
        type: "email",
        sortOrder: 10
      }
    ]
  });
  await new CategoryService(serviceInput).assignCategoryToContainer({
    workspaceId,
    containerId: project.project.id,
    categoryId: category.id
  });
  const task = await new TaskService(serviceInput).createTask({
    workspaceId,
    containerId: project.project.id,
    containerTabId: project.defaultTab.id,
    title: "Verify golden restore @golden-restore",
    body: "This task must survive export and backup restore.",
    dueAt: "2026-05-15T12:00:00.000Z",
    priority: 1,
    categoryId: category.id
  });
  const note = await new NoteService(serviceInput).createNote({
    workspaceId,
    containerId: project.project.id,
    containerTabId: project.defaultTab.id,
    title: "Golden restore runbook",
    content: "# Golden restore runbook\n\nRestored search should find this note."
  });
  const list = await new ListService(serviceInput).createList({
    workspaceId,
    containerId: project.project.id,
    containerTabId: project.defaultTab.id,
    title: "Golden restore checklist",
    body: "Operator-visible restore verification steps."
  });
  const listRow = await new ListService(serviceInput).addListItem({
    listId: list.item.id,
    title: "Confirm restored attachment checksum",
    body: "The attachment bytes must match the manifest.",
    dueAt: "2026-05-15T13:00:00.000Z"
  });
  const link = await new LinkService(serviceInput).createLink({
    workspaceId,
    containerId: project.project.id,
    containerTabId: project.defaultTab.id,
    url: "example.com/golden-restore",
    title: "Golden restore reference",
    description: "Reference link that must remain searchable after restore."
  });
  const file = await attachGoldenFile({
    workspace: input.workspace,
    service: new FileAttachmentService(serviceInput),
    containerId: project.project.id,
    containerTabId: project.defaultTab.id
  });
  await new RelationshipService(serviceInput).createRelationship({
    workspaceId,
    source: { type: "container", id: contact.contact.id },
    target: { type: "container", id: project.project.id },
    relationType: "related",
    label: "Recovery owner"
  });
  await new RelationshipService(serviceInput).createRelationship({
    workspaceId,
    source: { type: "item", id: task.item.id },
    target: { type: "item", id: note.item.id },
    relationType: "references",
    label: "Recovery evidence"
  });
  const savedView = await new SavedViewService(serviceInput).createSavedView({
    workspaceId,
    type: "smart_list",
    name: "Golden recovery tasks",
    query: {
      version: 1,
      match: "all",
      targets: ["item"],
      conditions: [
        { field: "itemType", operator: "is", value: "task" },
        { field: "tag", operator: "has", value: "golden-restore" }
      ],
      groupBy: "container",
      sort: [{ field: "dueAt", direction: "asc" }]
    },
    isFavorite: true
  });
  const collection = await new CollectionService(serviceInput).createTagCollection({
    workspaceId,
    tagSlug: "golden-restore",
    name: "Golden recovery collection"
  });
  await new DailyPlanService(serviceInput).planTask({
    workspaceId,
    itemId: task.item.id,
    lane: "today",
    date: now
  });
  await new DashboardService(serviceInput).getDefaultDashboard({ workspaceId });

  expect(new TodayService({ connection: input.connection, now: () => now }).getTodayViewModel({
    workspaceId,
    date: now
  }).dueToday.map((entry) => entry.title)).toEqual(
    expect.arrayContaining(["Verify golden restore @golden-restore"])
  );
  expect(new TimelineService({ connection: input.connection, now: () => now }).getTimelineItems({
    workspaceId,
    start: "2026-05-15",
    end: "2026-05-16"
  })).toEqual(expect.arrayContaining([expect.objectContaining({ title: "Verify golden restore @golden-restore" })]));
  expect(new CalendarService({ connection: input.connection, now: () => now }).getCalendarMonth({
    workspaceId,
    month: "2026-05"
  }).totalCount).toBeGreaterThan(0);

  return {
    attachmentId: file.attachmentId,
    attachmentChecksum: file.checksum,
    attachmentPath: file.storagePath,
    attachmentSizeBytes: file.sizeBytes,
    categoryId: category.id,
    collectionId: collection.id,
    contactId: contact.contact.id,
    fileItemId: file.itemId,
    linkItemId: link.item.id,
    listItemId: list.item.id,
    listRowId: listRow.listItem.id,
    noteItemId: note.item.id,
    projectId: project.project.id,
    savedViewId: savedView.savedView.id,
    taskItemId: task.item.id
  };
}

async function attachGoldenFile(input: {
  workspace: TestWorkspaceHandle;
  service: FileAttachmentService;
  containerId: string;
  containerTabId: string;
}): Promise<{
  attachmentId: string;
  checksum: string;
  itemId: string;
  sizeBytes: number;
  storagePath: string;
}> {
  const contents = "golden backup restore attachment\n";
  const checksum = createHash("sha256").update(contents).digest("hex");
  const storagePath = "attachments/2026/05/attachment_golden_restore/golden-restore.txt";
  const absolutePath = resolveWorkspacePath(input.workspace, storagePath);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents);

  const file = await input.service.attachFileToContainer({
    workspaceId,
    containerId: input.containerId,
    containerTabId: input.containerTabId,
    description: "Golden restore attachment evidence.",
    copiedFile: {
      attachmentId: "attachment_golden_restore",
      originalName: "golden-restore.txt",
      storedName: "golden-restore.txt",
      storagePath,
      sizeBytes: Buffer.byteLength(contents),
      checksum,
      mimeType: "text/plain"
    }
  });

  return {
    attachmentId: file.attachment.id,
    checksum,
    itemId: file.item.id,
    sizeBytes: Buffer.byteLength(contents),
    storagePath
  };
}

async function expectGoldenWorkspaceRestored(input: {
  connection: DatabaseConnection;
  workspace: TestWorkspaceHandle;
  fixture: GoldenFixture;
  restoreActivity: "backup_restored" | "export_restored";
}): Promise<void> {
  await expect(new DatabaseHealthService({ connection: input.connection }).getHealthReport())
    .resolves.toMatchObject({ connected: true, error: null });
  expect(new WorkspaceRepository(input.connection).getById(workspaceId)).toMatchObject({
    name: workspaceName
  });
  expect(new ContainerRepository(input.connection).getById(input.fixture.projectId)).toMatchObject({
    name: "Golden Recovery Project",
    categoryId: input.fixture.categoryId
  });
  expect(new ContainerRepository(input.connection).getById(input.fixture.contactId)).toMatchObject({
    name: "Riley Recovery",
    type: "contact"
  });
  expect(new ItemRepository(input.connection).getById(input.fixture.taskItemId)).toMatchObject({
    title: "Verify golden restore @golden-restore",
    categoryId: input.fixture.categoryId
  });
  expect(new TaskRepository(input.connection).getByItemId(input.fixture.taskItemId)).toMatchObject({
    task: { priority: 1, dueAt: "2026-05-15T12:00:00.000Z" }
  });
  expect(new ListRepository(input.connection).listItemsByWorkspace(workspaceId))
    .toEqual(expect.arrayContaining([expect.objectContaining({ id: input.fixture.listRowId })]));
  expect(new AttachmentRepository(input.connection).getById(input.fixture.attachmentId)).toMatchObject({
    checksum: input.fixture.attachmentChecksum,
    storagePath: input.fixture.attachmentPath
  });
  expect(await readFile(resolveWorkspacePath(input.workspace, input.fixture.attachmentPath), "utf8"))
    .toContain("golden backup restore attachment");
  expect(new CategoryRepository(input.connection).getById(input.fixture.categoryId)).toMatchObject({
    name: "Golden Recovery"
  });
  expect(new TagRepository(input.connection).listByWorkspace(workspaceId).map((tag) => tag.slug))
    .toContain("golden-restore");
  expect(new RelationshipRepository(input.connection).listByWorkspace(workspaceId))
    .toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Recovery owner" }),
      expect.objectContaining({ label: "Recovery evidence" })
    ]));
  expect(new SavedViewRepository(input.connection).getById(input.fixture.savedViewId)).toMatchObject({
    name: "Golden recovery tasks",
    isFavorite: true
  });
  expect(new SavedViewRepository(input.connection).getById(input.fixture.collectionId)).toMatchObject({
    name: "Golden recovery collection",
    type: "collection"
  });
  expect(new DashboardRepository(input.connection).listByWorkspace(workspaceId))
    .toEqual(expect.arrayContaining([expect.objectContaining({ isDefault: true })]));
  expect(new DashboardRepository(input.connection).listWidgetsByWorkspace(workspaceId).length)
    .toBeGreaterThanOrEqual(6);
  expect(new SearchIndexRepository(input.connection).getByTarget({
    workspaceId,
    targetType: "item",
    targetId: input.fixture.noteItemId
  })).toMatchObject({
    title: "Golden restore runbook",
    body: expect.stringContaining("Restored search should find this note")
  });
  expect(new SearchIndexRepository(input.connection).getByTarget({
    workspaceId,
    targetType: "attachment",
    targetId: input.fixture.attachmentId
  })).toMatchObject({
    title: "golden-restore.txt",
    isDeleted: false
  });
  expect(new SearchService({
    connection: input.connection,
    now: () => nowLater
  }).search({
    workspaceId,
    query: "Golden restore reference",
    limit: 5
  })).toMatchObject([
    {
      targetId: input.fixture.linkItemId,
      title: "Golden restore reference"
    }
  ]);
  expect(new ActivityLogRepository(input.connection).listRecent(workspaceId, 120).map((event) => event.action))
    .toEqual(expect.arrayContaining([input.restoreActivity]));
}

async function createWorkspace(input: {
  id: string;
  name: string;
  rootPrefix: string;
}): Promise<TestWorkspaceHandle> {
  const workspace = await createTempWorkspace({
    id: input.id,
    name: input.name,
    rootPrefix: input.rootPrefix,
    timestamp: createdAt
  });
  workspaces.push(workspace);
  return workspace;
}

async function openConnection(workspace: TestWorkspaceHandle): Promise<DatabaseConnection> {
  const connection = await createDatabaseConnection({
    databasePath: workspace.paths.databasePath,
    fileMustExist: true
  });
  connections.push(connection);
  return connection;
}

async function openFreshMigratedConnection(
  workspace: TestWorkspaceHandle
): Promise<DatabaseConnection> {
  const connection = await createDatabaseConnection({
    databasePath: workspace.paths.databasePath
  });
  connections.push(connection);
  new MigrationService({ connection }).runPendingMigrations();
  return connection;
}

async function copyGoldenAttachmentFiles(input: {
  source: TestWorkspaceHandle;
  target: TestWorkspaceHandle;
  attachments: { storagePath: string }[];
}): Promise<void> {
  for (const attachment of input.attachments) {
    await copyWorkspaceRelativeFile({
      source: input.source,
      target: input.target,
      relativePath: attachment.storagePath
    });
  }
}

async function copyWorkspaceRelativeFile(input: {
  source: TestWorkspaceHandle;
  target: TestWorkspaceHandle;
  relativePath: string;
  targetRelativePath?: string;
}): Promise<void> {
  const sourcePath = resolveWorkspacePath(input.source, input.relativePath);
  const targetPath = resolveWorkspacePath(
    input.target,
    input.targetRelativePath ?? input.relativePath
  );

  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
}

function resolveWorkspacePath(workspace: TestWorkspaceHandle, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");

  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`Golden restore path must be workspace-relative: ${relativePath}`);
  }

  return join(workspace.workspaceRootPath, ...normalized.split("/"));
}
