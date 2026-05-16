import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  RestoreService,
  type BackupManifest,
  type WorkspaceExportV1
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("RestoreService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    new MigrationService({ connection }).runPendingMigrations();
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("restores a workspace JSON export into an empty database and rebuilds search", async () => {
    const result = await createService().restoreExportToNewWorkspace({
      exportData: createExport(),
      sourcePath: "C:\\exports\\workspace.json",
      targetWorkspaceRootPath: "C:\\restored",
      copiedAttachmentCount: 1
    });

    expect(result).toMatchObject({
      valid: true,
      sourceType: "workspace_export",
      copiedAttachmentCount: 1,
      missingAttachmentCount: 0,
      counts: {
        containers: 1,
        items: 2,
        attachments: 1
      },
      searchIndex: {
        indexedContainerCount: 2,
        indexedItemCount: 2,
        indexedAttachmentCount: 1
      }
    });
    expect(new WorkspaceRepository(connection).getById("workspace_1")).toMatchObject({
      name: "Personal Work"
    });
    expect(new ContainerRepository(connection).getById("container_1")).toMatchObject({
      name: "Launch Plan"
    });
    expect(new ItemRepository(connection).getById("item_note_1")).toMatchObject({
      title: "Launch notes"
    });
    expect(
      new AttachmentRepository(connection).listByWorkspace({
        workspaceId: "workspace_1"
      })
    ).toMatchObject([{ id: "attachment_1" }]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: "item_note_1"
      })
    ).toMatchObject({ title: "Launch notes" });
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: "item_note_1"
      })?.body
    ).toContain("# Launch notes");
    expect(
      new ActivityLogRepository(connection).listForTarget("export", "workspace_1")
    ).toMatchObject([{ action: "export_restored" }]);
  });

  it("logs backup restore and rebuilds search for a copied backup database", async () => {
    seedCopiedBackupDatabase();

    const result = await createService().restoreBackupToNewWorkspace({
      manifest: createBackupManifest(),
      sourcePath: "backups/2026-05-01T00-00-00-000Z",
      targetWorkspaceRootPath: "C:\\restored",
      copiedAttachmentCount: 1
    });

    expect(result).toMatchObject({
      sourceType: "backup",
      copiedAttachmentCount: 1,
      searchIndex: {
        indexedContainerCount: 1,
        indexedItemCount: 1,
        indexedAttachmentCount: 1
      }
    });
    expect(
      new ActivityLogRepository(connection).listForTarget("backup", "backup_1")
    ).toMatchObject([{ action: "backup_restored" }]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "attachment",
        targetId: "attachment_1"
      })
    ).toMatchObject({ title: "Brief.pdf" });
  });

  it("blocks restore sources with unsafe attachment paths", () => {
    const result = createService().validateRestoreSource({
      sourceType: "backup",
      manifest: {
        ...createBackupManifest(),
        attachments: [
          {
            ...createBackupManifest().attachments[0]!,
            storagePath: "../Brief.pdf"
          }
        ]
      }
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toMatchObject([{ code: "unsafe_attachment_path" }]);
  });

  it("reports recoverable restore validation issues before changing a target workspace", () => {
    const result = createService().validateRestoreSource({
      sourceType: "backup",
      sourcePath: "backups/broken",
      databaseSizeBytes: 99,
      manifest: {
        ...createBackupManifest(),
        kind: "automatic",
        database: {
          ...createBackupManifest().database,
          backupRelativePath: "../local-work-os.sqlite"
        },
        attachmentCount: 2
      }
    });

    expect(result.valid).toBe(false);
    expect(result.targetPolicy).toMatchObject({
      mode: "new_workspace_only",
      canApplyToActiveWorkspace: false
    });
    expect(result.targetPolicy.message).toContain("never overwrites");
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "unsupported_backup_kind",
        "database_size_mismatch",
        "unsafe_database_path",
        "attachment_count_mismatch"
      ])
    );
  });
});

function createService(): RestoreService {
  return new RestoreService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_restore_${idCounter}`;
    },
    now: () => new Date("2026-05-02T00:00:00.000Z")
  });
}

function seedCopiedBackupDatabase(): void {
  new WorkspaceRepository(connection).create({
    id: "workspace_1",
    name: "Personal Work",
    schemaVersion: 8,
    timestamp: "2026-05-01T00:00:00.000Z"
  });
  new ContainerRepository(connection).create({
    id: "container_1",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
  new ItemRepository(connection).create({
    id: "item_file_1",
    workspaceId: "workspace_1",
    containerId: "container_1",
    type: "file",
    title: "Brief",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
  new AttachmentRepository(connection).create({
    id: "attachment_1",
    workspaceId: "workspace_1",
    itemId: "item_file_1",
    originalName: "Brief.pdf",
    storedName: "Brief.pdf",
    mimeType: "application/pdf",
    sizeBytes: 42,
    checksum: "a".repeat(64),
    storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
    description: "Launch brief",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
}

function createBackupManifest(): BackupManifest {
  return {
    id: "backup_1",
    kind: "manual",
    workspaceId: "workspace_1",
    workspaceName: "Personal Work",
    createdAt: "2026-05-01T00:00:00.000Z",
    database: {
      sourceRelativePath: "data/local-work-os.sqlite",
      backupRelativePath: "backups/2026-05-01T00-00-00-000Z/local-work-os.sqlite",
      sizeBytes: 2048
    },
    attachments: [
      {
        id: "attachment_1",
        itemId: "item_file_1",
        originalName: "Brief.pdf",
        storedName: "Brief.pdf",
        mimeType: "application/pdf",
        sizeBytes: 42,
        checksum: "a".repeat(64),
        storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
        description: "Launch brief",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z"
      }
    ],
    attachmentCount: 1,
    totalAttachmentBytes: 42
  };
}

function createExport(): WorkspaceExportV1 {
  const timestamp = "2026-05-01T00:00:00.000Z";

  return {
    schemaVersion: 1,
    exportedAt: timestamp,
    workspace: {
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 8,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    data: {
      containers: [
        {
          id: "container_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Launch Plan",
          slug: "launch-plan",
          description: null,
          status: "active",
          categoryId: null,
          color: null,
          isFavorite: false,
          isSystem: false,
          sortOrder: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
          archivedAt: null,
          deletedAt: null
        }
      ],
      containerTabs: [],
      items: [
        {
          id: "item_note_1",
          workspaceId: "workspace_1",
          containerId: "container_1",
          containerTabId: null,
          type: "note",
          title: "Launch notes",
          body: null,
          categoryId: null,
          status: "active",
          sortOrder: 0,
          pinned: false,
          createdAt: timestamp,
          updatedAt: timestamp,
          completedAt: null,
          archivedAt: null,
          deletedAt: null
        },
        {
          id: "item_file_1",
          workspaceId: "workspace_1",
          containerId: "container_1",
          containerTabId: null,
          type: "file",
          title: "Brief",
          body: null,
          categoryId: null,
          status: "active",
          sortOrder: 1,
          pinned: false,
          createdAt: timestamp,
          updatedAt: timestamp,
          completedAt: null,
          archivedAt: null,
          deletedAt: null
        }
      ],
      taskDetails: [],
      noteDetails: [
        {
          itemId: "item_note_1",
          workspaceId: "workspace_1",
          format: "markdown",
          content: "# Launch notes",
          preview: "Launch notes",
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      listDetails: [],
      listItems: [],
      linkDetails: [],
      tags: [],
      taggings: [],
      categories: [],
      relationships: [],
      savedViews: [],
      dashboards: [],
      dashboardWidgets: [],
      dailyPlans: [],
      dailyPlanItems: []
    },
    attachmentManifest: {
      attachments: [
        {
          id: "attachment_1",
          itemId: "item_file_1",
          originalName: "Brief.pdf",
          storedName: "Brief.pdf",
          mimeType: "application/pdf",
          sizeBytes: 42,
          checksum: "a".repeat(64),
          storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
          description: "Launch brief",
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      attachmentCount: 1,
      totalAttachmentBytes: 42
    }
  };
}
