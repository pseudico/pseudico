import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  RelationshipRepository,
  SearchIndexService,
  TagRepository,
  WorkspaceSeedService,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IntegrityCheckService } from "../src";

const TEST_TIMESTAMP = "2026-05-02T01:02:03.000Z";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("IntegrityCheckService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    new MigrationService({ connection }).runPendingMigrations();
    idCounter = 0;
    seedWorkspace();
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("reports a healthy workspace after source rows are indexed", async () => {
    new SearchIndexService({
      connection,
      idFactory,
      now
    }).rebuildWorkspaceIndex("workspace_1");

    const report = await createService({
      existingPaths: new Set<string>()
    }).runWorkspaceIntegrityCheck("workspace_1");

    expect(report).toMatchObject({
      workspaceId: "workspace_1",
      status: "healthy",
      issueCount: 0,
      sections: expect.arrayContaining([
        expect.objectContaining({
          kind: "system_rows",
          status: "healthy"
        }),
        expect.objectContaining({
          kind: "search_index",
          status: "healthy"
        })
      ])
    });
  });

  it("reports broken details, graph links, attachments, and stale search", async () => {
    const project = new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: TEST_TIMESTAMP
    });
    const task = new ItemRepository(connection).create({
      id: "item_task_missing_details",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "task",
      title: "Call supplier",
      timestamp: TEST_TIMESTAMP
    });
    const file = new ItemRepository(connection).create({
      id: "item_file_1",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "file",
      title: "Brief.pdf",
      timestamp: TEST_TIMESTAMP
    });

    new AttachmentRepository(connection).create({
      id: "attachment_1",
      workspaceId: "workspace_1",
      itemId: file.id,
      originalName: "Brief.pdf",
      storedName: "Brief.pdf",
      sizeBytes: 42,
      checksum: "a".repeat(64),
      storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
      timestamp: TEST_TIMESTAMP
    });
    const tag = new TagRepository(connection).create({
      id: "tag_1",
      workspaceId: "workspace_1",
      name: "Finance",
      slug: "finance",
      timestamp: TEST_TIMESTAMP
    });
    new TagRepository(connection).createTagging({
      id: "tagging_missing_target",
      workspaceId: "workspace_1",
      tagId: tag.id,
      targetType: "item",
      targetId: "item_missing",
      source: "manual",
      timestamp: TEST_TIMESTAMP
    });
    new RelationshipRepository(connection).create({
      id: "relationship_missing_target",
      workspaceId: "workspace_1",
      sourceType: "item",
      sourceId: task.id,
      targetType: "item",
      targetId: "item_missing",
      relationType: "related",
      timestamp: TEST_TIMESTAMP
    });

    const report = await createService({
      existingPaths: new Set<string>()
    }).runWorkspaceIntegrityCheck("workspace_1");
    const issueCodes = report.sections.flatMap((section) =>
      section.issues.map((issue) => issue.code)
    );

    expect(report.status).toBe("degraded");
    expect(issueCodes).toContain("task_details_missing");
    expect(issueCodes).toContain("tagging_target_missing");
    expect(issueCodes).toContain("relationship_target_missing");
    expect(issueCodes).toContain("attachment_file_missing");
    expect(issueCodes).toContain("search_record_missing");
  });

  it("reports duplicate attachment checksums and checksum mismatches", async () => {
    const project = new ContainerRepository(connection).create({
      id: "container_project_duplicates",
      workspaceId: "workspace_1",
      type: "project",
      name: "Duplicates",
      slug: "duplicates",
      timestamp: TEST_TIMESTAMP
    });
    const firstFile = new ItemRepository(connection).create({
      id: "item_file_duplicate_1",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "file",
      title: "One.pdf",
      timestamp: TEST_TIMESTAMP
    });
    const secondFile = new ItemRepository(connection).create({
      id: "item_file_duplicate_2",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "file",
      title: "Two.pdf",
      timestamp: TEST_TIMESTAMP
    });

    for (const [id, itemId, path] of [
      ["attachment_duplicate_1", firstFile.id, "attachments/2026/05/attachment_duplicate_1/One.pdf"],
      ["attachment_duplicate_2", secondFile.id, "attachments/2026/05/attachment_duplicate_2/Two.pdf"]
    ] as const) {
      new AttachmentRepository(connection).create({
        id,
        workspaceId: "workspace_1",
        itemId,
        originalName: `${id}.pdf`,
        storedName: `${id}.pdf`,
        sizeBytes: 42,
        checksum: "b".repeat(64),
        storagePath: path,
        timestamp: TEST_TIMESTAMP
      });
    }

    const report = await createService({
      existingPaths: new Set([
        "attachments/2026/05/attachment_duplicate_1/One.pdf",
        "attachments/2026/05/attachment_duplicate_2/Two.pdf"
      ]),
      checksums: new Map([
        ["attachments/2026/05/attachment_duplicate_1/One.pdf", "c".repeat(64)],
        ["attachments/2026/05/attachment_duplicate_2/Two.pdf", "b".repeat(64)]
      ])
    }).runWorkspaceIntegrityCheck("workspace_1");
    const issueCodes = report.sections.flatMap((section) =>
      section.issues.map((issue) => issue.code)
    );

    expect(issueCodes).toContain("attachment_checksum_duplicate");
    expect(issueCodes).toContain("attachment_checksum_mismatch");
  });

  it("repairs missing system rows through the seed service and logs the write", () => {
    connection.sqlite
      .prepare("update dashboards set deleted_at = ? where workspace_id = ?")
      .run(TEST_TIMESTAMP, "workspace_1");

    const result = createService().repairSystemRows("workspace_1");

    expect(result).toMatchObject({
      workspaceId: "workspace_1",
      repaired: true,
      created: {
        defaultDashboard: true,
        defaultDashboardWidgetCount: 6
      }
    });
    expect(
      new ActivityLogRepository(connection).listForTarget(
        "workspace",
        "workspace_1"
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "system_rows_repaired"
        })
      ])
    );
  });
});

function seedWorkspace(): void {
  new WorkspaceSeedService({
    connection,
    idFactory,
    now
  }).ensureWorkspaceSeed({
    workspaceId: "workspace_1",
    workspaceName: "Personal",
    schemaVersion: 1
  });
}

function createService(input: { existingPaths?: Set<string>; checksums?: Map<string, string> } = {}) {
  return new IntegrityCheckService({
    connection,
    idFactory,
    now,
    fileSystem: {
      workspacePathExists: async (workspaceRelativePath) =>
        input.existingPaths?.has(workspaceRelativePath) ?? true,
      workspaceFileChecksum: async (workspaceRelativePath) =>
        input.checksums?.get(workspaceRelativePath) ?? "a".repeat(64)
    }
  });
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function now(): Date {
  return new Date(TEST_TIMESTAMP);
}
