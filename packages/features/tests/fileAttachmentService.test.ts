import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileAttachmentService, ItemService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("FileAttachmentService", () => {
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
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("creates a file item, attachment metadata, activity, and search records", async () => {
    const result = await createService().attachFileToContainer({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      description: "Signed proposal",
      copiedFile: {
        attachmentId: "attachment_known",
        originalName: "Proposal.pdf",
        storedName: "Proposal.pdf",
        storagePath: "attachments/2026/05/attachment_known/Proposal.pdf",
        sizeBytes: 42,
        checksum: "a".repeat(64),
        mimeType: "application/pdf"
      }
    });

    expect(result.item).toMatchObject({
      id: "item_1",
      type: "file",
      title: "Proposal.pdf",
      body: "Signed proposal",
      sortOrder: 1024
    });
    expect(result.attachment).toMatchObject({
      id: "attachment_known",
      itemId: "item_1",
      storagePath: "attachments/2026/05/attachment_known/Proposal.pdf",
      sizeBytes: 42,
      checksum: "a".repeat(64)
    });
    expect(
      new AttachmentRepository(connection).listForItem({
        workspaceId: "workspace_1",
        itemId: "item_1"
      })
    ).toEqual([result.attachment]);
    expect(
      new ActivityLogRepository(connection).listForTarget(
        "attachment",
        "attachment_known"
      )
    ).toMatchObject([{ action: "file_attached" }]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: "item_1"
      })
    ).toMatchObject({
      title: "Proposal.pdf",
      body: "Signed proposal"
    });
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "attachment",
        targetId: "attachment_known"
      })
    ).toMatchObject({
      title: "Proposal.pdf",
      body: expect.stringContaining("attachments/2026/05/attachment_known/Proposal.pdf")
    });
  });

  it("attaches copied file metadata to an existing item", async () => {
    const item = await new ItemService({
      connection,
      idFactory: createId,
      now: () => new Date("2026-05-01T00:00:00.000Z")
    }).createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "note",
      title: "Supplier note"
    });

    const result = await createService().attachFileToItem({
      itemId: item.item.id,
      description: "Reference image",
      copiedFile: {
        attachmentId: "attachment_image",
        originalName: "Sketch.png",
        storedName: "Sketch.png",
        storagePath: "attachments/2026/05/attachment_image/Sketch.png",
        sizeBytes: 128,
        checksum: "b".repeat(64),
        mimeType: "image/png"
      }
    });

    expect(result.item.id).toBe(item.item.id);
    expect(result.attachment).toMatchObject({
      id: "attachment_image",
      itemId: item.item.id,
      description: "Reference image"
    });
    expect(
      new ActivityLogRepository(connection).listForTarget(
        "attachment",
        "attachment_image"
      )
    ).toMatchObject([{ action: "file_attached" }]);
  });

  it("rejects copied file metadata outside workspace attachment storage", async () => {
    await expect(
      createService().attachFileToContainer({
        workspaceId: "workspace_1",
        containerId: "container_project_1",
        copiedFile: {
          attachmentId: "attachment_bad",
          originalName: "Bad.pdf",
          storedName: "Bad.pdf",
          storagePath: "../Bad.pdf",
          sizeBytes: 1,
          checksum: "c".repeat(64)
        }
      })
    ).rejects.toThrow("storagePath must stay inside workspace attachments.");
  });
});

function createService(): FileAttachmentService {
  return new FileAttachmentService({
    connection,
    idFactory: createId,
    now: () => new Date("2026-05-01T00:00:00.000Z")
  });
}

function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
