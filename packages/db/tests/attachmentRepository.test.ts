import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  AttachmentRepository,
  ContainerRepository,
  ItemRepository,
  type DatabaseConnection
} from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("AttachmentRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: TEST_TIMESTAMP
    });
    new ItemRepository(connection).create({
      id: "item_file_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "file",
      title: "Brief.pdf",
      timestamp: TEST_TIMESTAMP
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates and lists attachment metadata for an item", () => {
    const repository = new AttachmentRepository(connection);

    const attachment = repository.create({
      id: "attachment_1",
      workspaceId: "workspace_1",
      itemId: "item_file_1",
      originalName: "Brief.pdf",
      storedName: "Brief.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12,
      checksum: "abc123",
      storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
      description: "Launch brief",
      timestamp: TEST_TIMESTAMP
    });

    expect(attachment).toMatchObject({
      id: "attachment_1",
      workspaceId: "workspace_1",
      itemId: "item_file_1",
      originalName: "Brief.pdf",
      storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
      sizeBytes: 12,
      checksum: "abc123"
    });
    expect(repository.getById("attachment_1")).toEqual(attachment);
    expect(
      repository.listForItem({
        workspaceId: "workspace_1",
        itemId: "item_file_1"
      })
    ).toEqual([attachment]);
    expect(
      repository.listByWorkspace({
        workspaceId: "workspace_1"
      })
    ).toEqual([attachment]);
  });

  it("updates attachment metadata without changing stored file identity", () => {
    const repository = new AttachmentRepository(connection);
    const attachment = repository.create({
      id: "attachment_1",
      workspaceId: "workspace_1",
      itemId: "item_file_1",
      originalName: "Brief.pdf",
      storedName: "Brief.pdf",
      sizeBytes: 12,
      checksum: "abc123",
      storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
      description: "Launch brief",
      timestamp: TEST_TIMESTAMP
    });

    const updated = repository.update(attachment.id, {
      description: "Signed launch brief",
      timestamp: "2026-05-02T00:00:00.000Z"
    });

    expect(updated).toMatchObject({
      id: attachment.id,
      originalName: "Brief.pdf",
      storagePath: attachment.storagePath,
      description: "Signed launch brief",
      updatedAt: "2026-05-02T00:00:00.000Z"
    });
  });
});
