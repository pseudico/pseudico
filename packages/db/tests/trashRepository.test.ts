import {
  AttachmentRepository,
  ContainerRepository,
  ItemRepository,
  ListRepository,
  MigrationService,
  TrashRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;

const NOW = "2026-05-01T00:00:00.000Z";
const LATER = "2026-05-02T00:00:00.000Z";

describe("TrashRepository", () => {
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
      timestamp: NOW
    });
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("lists deleted containers, items, list rows, and attachments with context", () => {
    seedDeletedRecords();

    expect(new TrashRepository(connection).listDeletedByWorkspace("workspace_1")).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "attachment_1",
        targetType: "attachment",
        title: "brief.pdf",
        originalContainerName: "Launch Plan",
        parentItemTitle: "Deleted file"
      }),
      expect.objectContaining({
        id: "list_item_1",
        targetType: "list_item",
        title: "Deleted row",
        originalContainerName: "Launch Plan",
        parentItemTitle: "Checklist"
      }),
      expect.objectContaining({
        id: "item_deleted",
        targetType: "item",
        title: "Deleted note",
        originalContainerName: "Launch Plan"
      }),
      expect.objectContaining({
        id: "container_deleted",
        targetType: "container",
        title: "Old Project"
      })
    ]));
  });

  it("restores a deleted item and clears only deleted records", () => {
    seedDeletedRecords();
    const repository = new TrashRepository(connection);

    const restored = repository.restoreTarget({
      targetType: "item",
      targetId: "item_deleted",
      timestamp: "2026-05-03T00:00:00.000Z"
    });

    expect(restored).toMatchObject({
      id: "item_deleted",
      targetType: "item",
      deletedAt: ""
    });
    expect(new ItemRepository(connection).getById("item_deleted")).toMatchObject({
      id: "item_deleted",
      deletedAt: null
    });

    const counts = repository.clearDeletedByWorkspace("workspace_1");

    expect(counts).toEqual({
      attachment: 1,
      list_item: 1,
      item: 0,
      container: 1
    });
    expect(new ContainerRepository(connection).getById("container_active")).not.toBeNull();
    expect(new ItemRepository(connection).getById("item_deleted")).not.toBeNull();
    expect(repository.listDeletedByWorkspace("workspace_1")).toEqual([]);
  });
});

function seedDeletedRecords(): void {
  const containers = new ContainerRepository(connection);
  containers.create({
    id: "container_active",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    timestamp: NOW
  });
  containers.create({
    id: "container_deleted",
    workspaceId: "workspace_1",
    type: "project",
    name: "Old Project",
    slug: "old-project",
    timestamp: NOW
  });
  containers.softDelete("container_deleted", LATER);

  const items = new ItemRepository(connection);
  items.create({
    id: "item_deleted",
    workspaceId: "workspace_1",
    containerId: "container_active",
    type: "note",
    title: "Deleted note",
    timestamp: NOW
  });
  items.softDelete("item_deleted", LATER);
  items.create({
    id: "item_list",
    workspaceId: "workspace_1",
    containerId: "container_active",
    type: "list",
    title: "Checklist",
    timestamp: NOW
  });
  items.create({
    id: "item_file",
    workspaceId: "workspace_1",
    containerId: "container_active",
    type: "file",
    title: "Deleted file",
    timestamp: NOW
  });

  const lists = new ListRepository(connection);
  lists.createDetails({
    itemId: "item_list",
    workspaceId: "workspace_1",
    timestamp: NOW
  });
  lists.createListItem({
    id: "list_item_1",
    workspaceId: "workspace_1",
    listId: "item_list",
    title: "Deleted row",
    timestamp: NOW
  });
  connection.sqlite
    .prepare("update list_items set deleted_at = ?, updated_at = ? where id = ?")
    .run(LATER, LATER, "list_item_1");

  new AttachmentRepository(connection).create({
    id: "attachment_1",
    workspaceId: "workspace_1",
    itemId: "item_file",
    originalName: "brief.pdf",
    storedName: "brief.pdf",
    sizeBytes: 42,
    storagePath: "attachments/brief.pdf",
    timestamp: NOW
  });
  connection.sqlite
    .prepare("update attachments set deleted_at = ?, updated_at = ? where id = ?")
    .run(LATER, LATER, "attachment_1");
}
