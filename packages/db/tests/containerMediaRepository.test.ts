import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AttachmentRepository, ContainerMediaRepository, ContainerRepository, ItemRepository, type DatabaseConnection } from "../src";
import { createRepositoryTestDatabase, seedWorkspace, TEST_TIMESTAMP, TEST_TIMESTAMP_LATER, type RepositoryTestDatabase } from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("ContainerMediaRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    new ContainerRepository(connection).create({ id: "container_project_1", workspaceId: "workspace_1", type: "project", name: "Launch", slug: "launch", timestamp: TEST_TIMESTAMP });
    new ItemRepository(connection).create({ id: "item_file_1", workspaceId: "workspace_1", containerId: "container_project_1", type: "file", title: "banner.png", timestamp: TEST_TIMESTAMP });
    new AttachmentRepository(connection).create({ id: "attachment_1", workspaceId: "workspace_1", itemId: "item_file_1", originalName: "banner.png", storedName: "banner.png", sizeBytes: 10, checksum: "abc", storagePath: "attachments/2026/05/attachment_1/banner.png", timestamp: TEST_TIMESTAMP });
  });

  afterEach(async () => { await testDb.cleanup(); });

  it("assigns one active media record per container role and soft deletes it", () => {
    const repository = new ContainerMediaRepository(connection);
    const media = repository.create({ id: "media_1", workspaceId: "workspace_1", containerId: "container_project_1", attachmentId: "attachment_1", role: "project_banner", thumbnailStoragePath: "attachments/2026/05/attachment_1/thumbnails/banner-thumb.png", altText: "Launch banner", timestamp: TEST_TIMESTAMP });

    expect(repository.getActiveForContainer("container_project_1", "project_banner")).toEqual(media);
    expect(repository.listForContainer("container_project_1")).toEqual([media]);

    const removed = repository.softDeleteActive("container_project_1", "project_banner", TEST_TIMESTAMP_LATER);

    expect(removed).toMatchObject({ id: "media_1", deletedAt: TEST_TIMESTAMP_LATER });
    expect(repository.getActiveForContainer("container_project_1", "project_banner")).toBeNull();
    expect(repository.listForContainer("container_project_1", true)).toHaveLength(1);
  });
});
