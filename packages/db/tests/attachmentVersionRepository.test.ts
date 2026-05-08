import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  AttachmentRepository,
  AttachmentVersionRepository,
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

describe("AttachmentVersionRepository", () => {
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
    new AttachmentRepository(connection).create({
      id: "attachment_1",
      workspaceId: "workspace_1",
      itemId: "item_file_1",
      originalName: "Brief.pdf",
      storedName: "Brief.pdf",
      sizeBytes: 12,
      checksum: "abc123",
      storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
      timestamp: TEST_TIMESTAMP
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates and lists attachment versions newest first", () => {
    const repository = new AttachmentVersionRepository(connection);

    const first = repository.create({
      id: "version_1",
      workspaceId: "workspace_1",
      attachmentId: "attachment_1",
      versionNumber: 1,
      originalName: "Brief.pdf",
      storedName: "Brief.pdf",
      sizeBytes: 12,
      checksum: "a".repeat(64),
      storagePath: "attachments/2026/05/attachment_1/versions/v1/Brief.pdf",
      note: "Initial draft",
      timestamp: TEST_TIMESTAMP
    });
    const second = repository.create({
      id: "version_2",
      workspaceId: "workspace_1",
      attachmentId: "attachment_1",
      versionNumber: 2,
      originalName: "Brief.pdf",
      storedName: "Brief.pdf",
      sizeBytes: 14,
      checksum: "b".repeat(64),
      storagePath: "attachments/2026/05/attachment_1/versions/v2/Brief.pdf",
      timestamp: "2026-05-01T01:00:00.000Z"
    });

    expect(repository.getById("version_1")).toEqual(first);
    expect(repository.getLatestVersionNumber("attachment_1")).toBe(2);
    expect(repository.listForAttachment("attachment_1")).toEqual([
      second,
      first
    ]);
  });
});
