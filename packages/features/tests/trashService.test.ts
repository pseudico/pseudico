import {
  ActivityLogRepository,
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
import { BackupService, ItemService, TrashService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;
const copies: Array<{ source: string; destination: string }> = [];
const manifests = new Map<string, unknown>();

describe("TrashService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
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
    idCounter = 0;
    copies.length = 0;
    manifests.clear();
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("supports delete to Trash and restore back into active item feeds", async () => {
    const itemService = createItemService();
    const created = await itemService.createItem({
      workspaceId: "workspace_1",
      containerId: "container_1",
      type: "note",
      title: "Restore me",
      body: "Recoverable body"
    });
    await itemService.softDeleteItem(created.item.id);

    const trash = createTrashService();
    expect(trash.listTrash({ workspaceId: "workspace_1" })).toMatchObject([
      {
        targetType: "item",
        title: "Restore me",
        originalContainerName: "Launch Plan"
      }
    ]);

    const restored = await trash.restore({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: created.item.id
    });

    expect(restored.entry).toMatchObject({ id: created.item.id, deletedAt: "" });
    expect(itemService.listItemsByContainer({ containerId: "container_1" }).items).toHaveLength(1);
    expect(new SearchIndexRepository(connection).search("workspace_1", "Restore")).toHaveLength(1);
    expect(new ActivityLogRepository(connection).listForTarget("item", created.item.id).map((event) => event.action)).toEqual(expect.arrayContaining([
      "item_created",
      "item_deleted",
      "trash_restored"
    ]));
  });

  it("requires a backup preflight id before clearing Trash", async () => {
    const itemService = createItemService();
    const created = await itemService.createItem({
      workspaceId: "workspace_1",
      containerId: "container_1",
      type: "note",
      title: "Purge me"
    });
    await itemService.softDeleteItem(created.item.id);

    const trash = createTrashService();
    await expect(trash.clearTrash({
      workspaceId: "workspace_1",
      backupSnapshotId: ""
    })).rejects.toThrow("backupSnapshotId");

    const backup = await createBackupService().createManualBackup({
      workspaceId: "workspace_1",
      workspaceName: "Personal Work",
      databaseRelativePath: "data/local-work-os.sqlite",
      backupRelativePath: "backups/pre-clear-trash",
      backupDatabaseRelativePath: "backups/pre-clear-trash/local-work-os.sqlite",
      manifestRelativePath: "backups/pre-clear-trash/attachment-manifest.json"
    });

    const cleared = await trash.clearTrash({
      workspaceId: "workspace_1",
      backupSnapshotId: backup.id
    });

    expect(copies).toEqual([
      {
        source: "data/local-work-os.sqlite",
        destination: "backups/pre-clear-trash/local-work-os.sqlite"
      }
    ]);
    expect(manifests.has("backups/pre-clear-trash/attachment-manifest.json")).toBe(true);
    expect(cleared).toMatchObject({ clearedCount: 1, backupSnapshotId: backup.id });
    expect(new ItemRepository(connection).getById(created.item.id)).toBeNull();
    expect(new ActivityLogRepository(connection).listForTarget("workspace", "workspace_1").map((event) => event.action)).toContain("trash_cleared");
  });
});

function createItemService(): ItemService {
  return new ItemService({
    connection,
    idFactory,
    now: () => new Date("2026-05-01T00:00:00.000Z")
  });
}

function createTrashService(): TrashService {
  return new TrashService({
    connection,
    idFactory,
    now: () => new Date("2026-05-02T00:00:00.000Z")
  });
}

function createBackupService(): BackupService {
  return new BackupService({
    connection,
    idFactory,
    now: () => new Date("2026-05-02T00:00:00.000Z"),
    fileSystem: {
      async copyDatabase(input) {
        copies.push({
          source: input.sourceRelativePath,
          destination: input.destinationRelativePath
        });
        return { sizeBytes: 128 };
      },
      async writeManifest(input) {
        manifests.set(input.manifestRelativePath, input.manifest);
      }
    }
  });
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
