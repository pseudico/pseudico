import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ActivityLogRepository, ContainerMediaRepository, ContainerRepository, type DatabaseConnection } from "@local-work-os/db";
import { ContainerMediaService } from "../src";
import { createRepositoryTestDatabase, seedWorkspace, TEST_TIMESTAMP, type RepositoryTestDatabase } from "../../db/tests/repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("ContainerMediaService", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    new ContainerRepository(connection).create({ id: "container_project_1", workspaceId: "workspace_1", type: "project", name: "Launch", slug: "launch", timestamp: TEST_TIMESTAMP });
    new ContainerRepository(connection).create({ id: "container_contact_1", workspaceId: "workspace_1", type: "contact", name: "Ada", slug: "ada", timestamp: TEST_TIMESTAMP });
  });

  afterEach(async () => { await testDb.cleanup(); });

  it("sets and replaces project banner media with activity log coverage", async () => {
    let ids = 0;
    const service = new ContainerMediaService({ connection, idFactory: (prefix) => `${prefix}_${++ids}`, now: () => new Date(TEST_TIMESTAMP) });

    const first = await service.setContainerMedia({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      role: "project_banner",
      copiedFile: copied("attachment_first", "banner.png"),
      thumbnailStoragePath: "attachments/2026/05/attachment_first/thumbnails/banner-thumb.png",
      altText: "Launch banner"
    });
    const second = await service.setContainerMedia({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      role: "project_banner",
      copiedFile: copied("attachment_second", "new-banner.png")
    });

    expect(first.media).toMatchObject({ role: "project_banner", attachmentId: "attachment_first" });
    expect(second.previousMedia).toMatchObject({ attachmentId: "attachment_first", deletedAt: TEST_TIMESTAMP });
    expect(new ContainerMediaRepository(connection).getActiveForContainer("container_project_1", "project_banner")).toMatchObject({ attachmentId: "attachment_second" });
    expect(new ActivityLogRepository(connection).listForTarget("container", "container_project_1").some((event) => event.action === "container_media_set")).toBe(true);
  });

  it("rejects avatar media on project containers", async () => {
    const service = new ContainerMediaService({ connection });
    await expect(service.setContainerMedia({ workspaceId: "workspace_1", containerId: "container_project_1", role: "contact_avatar", copiedFile: copied("attachment_1", "avatar.png") })).rejects.toThrow(/Contact avatar/);
  });
});

function copied(attachmentId: string, name: string) {
  return { attachmentId, originalName: name, storedName: name, storagePath: `attachments/2026/05/${attachmentId}/${name}`, sizeBytes: 10, checksum: `${attachmentId}-checksum`, mimeType: "image/png" };
}

