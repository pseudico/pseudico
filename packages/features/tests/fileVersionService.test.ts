import {
  ActivityLogRepository,
  AttachmentRepository,
  AttachmentVersionRepository,
  ContainerRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileAttachmentService, FileVersionService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;
let seedIdCounter = 0;

describe("FileVersionService", () => {
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
    seedIdCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("creates incrementing file snapshots with activity coverage", async () => {
    await attachFile();

    const service = createService();
    const first = await service.createFileSnapshot({
      attachmentId: "attachment_known",
      note: " First review ",
      versionFile: {
        originalName: "Proposal.pdf",
        storedName: "Proposal.pdf",
        storagePath:
          "attachments/2026/05/attachment_known/versions/v1/Proposal.pdf",
        sizeBytes: 42,
        checksum: "b".repeat(64)
      }
    });
    const second = await service.createFileSnapshot({
      attachmentId: "attachment_known",
      versionFile: {
        originalName: "Proposal.pdf",
        storedName: "Proposal.pdf",
        storagePath:
          "attachments/2026/05/attachment_known/versions/v2/Proposal.pdf",
        sizeBytes: 43,
        checksum: "c".repeat(64)
      }
    });

    expect(first.version).toMatchObject({
      id: "attachment_version_1",
      attachmentId: "attachment_known",
      versionNumber: 1,
      note: "First review"
    });
    expect(second.version).toMatchObject({
      versionNumber: 2,
      note: null
    });
    expect(service.getNextVersionNumber("attachment_known")).toBe(3);
    expect(service.listFileVersions("attachment_known")).toMatchObject([
      { versionNumber: 2 },
      { versionNumber: 1 }
    ]);
    expect(
      new ActivityLogRepository(connection).listForTarget(
        "attachment",
        "attachment_known"
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "file_version_created" }),
        expect.objectContaining({ action: "file_attached" })
      ])
    );
    expect(
      new AttachmentVersionRepository(connection).getLatestVersionNumber(
        "attachment_known"
      )
    ).toBe(2);
  });

  it("restores file metadata and refreshes the attachment search projection", async () => {
    await attachFile();
    const snapshot = await createService().createFileSnapshot({
      attachmentId: "attachment_known",
      versionFile: {
        originalName: "Proposal.pdf",
        storedName: "Proposal.pdf",
        storagePath:
          "attachments/2026/05/attachment_known/versions/v1/Proposal.pdf",
        sizeBytes: 42,
        checksum: "b".repeat(64)
      }
    });

    const restored = await createService().restoreFileVersion({
      versionId: snapshot.version.id,
      restoredFile: {
        sizeBytes: 42,
        checksum: "b".repeat(64)
      }
    });

    expect(restored.attachment).toMatchObject({
      id: "attachment_known",
      sizeBytes: 42,
      checksum: "b".repeat(64),
      updatedAt: "2026-05-01T00:00:00.000Z"
    });
    expect(new AttachmentRepository(connection).getById("attachment_known"))
      .toMatchObject({
        checksum: "b".repeat(64)
      });
    expect(
      new ActivityLogRepository(connection).listForTarget(
        "attachment",
        "attachment_known"
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "file_version_restored" }),
        expect.objectContaining({ action: "file_version_created" }),
        expect.objectContaining({ action: "file_attached" })
      ])
    );
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "attachment",
        targetId: "attachment_known"
      })
    ).toMatchObject({
      body: expect.stringContaining("bbbbbbbbbbbb")
    });
  });

  it("rejects version files outside attachment version storage", async () => {
    await attachFile();

    await expect(
      createService().createFileSnapshot({
        attachmentId: "attachment_known",
        versionFile: {
          originalName: "Proposal.pdf",
          storedName: "Proposal.pdf",
          storagePath: "attachments/2026/05/attachment_known/Proposal.pdf",
          sizeBytes: 42,
          checksum: "b".repeat(64)
        }
      })
    ).rejects.toThrow("storagePath must point to an attachment version path.");
  });
});

async function attachFile(): Promise<void> {
  await new FileAttachmentService({
    connection,
    idFactory: (prefix) =>
      prefix === "item" ? "item_1" : createSeedId(prefix),
    now: () => new Date("2026-05-01T00:00:00.000Z")
  }).attachFileToContainer({
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    copiedFile: {
      attachmentId: "attachment_known",
      originalName: "Proposal.pdf",
      storedName: "Proposal.pdf",
      storagePath: "attachments/2026/05/attachment_known/Proposal.pdf",
      sizeBytes: 44,
      checksum: "a".repeat(64),
      mimeType: "application/pdf"
    }
  });
}

function createService(): FileVersionService {
  return new FileVersionService({
    connection,
    idFactory: createId,
    now: () => new Date("2026-05-01T00:00:00.000Z")
  });
}

function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function createSeedId(prefix: string): string {
  seedIdCounter += 1;
  return `${prefix}_seed_${seedIdCounter}`;
}
