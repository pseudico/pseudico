import {
  ActivityLogRepository,
  AttachmentRepository,
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  SavedViewRepository,
  SearchIndexRepository,
  WorkspaceSeedService,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DemoWorkspaceService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("DemoWorkspaceService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    new MigrationService({ connection }).runPendingMigrations();
    idCounter = 0;
    new WorkspaceSeedService({
      connection,
      idFactory,
      now: () => new Date("2026-05-14T00:00:00.000Z")
    }).ensureWorkspaceSeed({
      workspaceId: "workspace_1",
      workspaceName: "Demo Workspace",
      schemaVersion: 1
    });
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("generates reference demo data with activity and search coverage", async () => {
    const result = await createService().seedDemoWorkspace({
      workspaceId: "workspace_1",
      sampleFile: {
        originalName: "Demo Workspace Brief.md",
        storedName: "demo-workspace-brief.md",
        storagePath: "attachments/2026/05/demo-workspace/demo-workspace-brief.md",
        mimeType: "text/markdown",
        sizeBytes: 42,
        checksum: "abc123"
      }
    });

    expect(result).toMatchObject({
      workspaceId: "workspace_1",
      categoryIds: expect.arrayContaining([expect.any(String), expect.any(String)]),
      projectIds: expect.arrayContaining([expect.any(String), expect.any(String)]),
      contactIds: expect.arrayContaining([expect.any(String), expect.any(String)]),
      taskItemIds: expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String)
      ]),
      noteItemIds: expect.arrayContaining([expect.any(String), expect.any(String)]),
      listItemIds: expect.arrayContaining([expect.any(String)]),
      linkItemIds: expect.arrayContaining([expect.any(String)]),
      fileItemIds: expect.arrayContaining([expect.any(String)]),
      savedViewIds: expect.arrayContaining([expect.any(String), expect.any(String)]),
      relationshipIds: expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String)
      ])
    });

    expect(new CategoryRepository(connection).listByWorkspace("workspace_1"))
      .toHaveLength(2);
    expect(
      new ContainerRepository(connection).listByWorkspace("workspace_1", {
        type: "project"
      })
    ).toHaveLength(2);
    expect(
      new ContainerRepository(connection).listByWorkspace("workspace_1", {
        type: "contact"
      })
    ).toHaveLength(2);

    const items = new ItemRepository(connection).listByWorkspace("workspace_1");
    expect(items.map((item) => item.type).sort()).toEqual([
      "file",
      "link",
      "list",
      "note",
      "note",
      "task",
      "task",
      "task"
    ]);
    expect(new AttachmentRepository(connection).listByWorkspace({
      workspaceId: "workspace_1"
    }))
      .toMatchObject([
        {
          originalName: "Demo Workspace Brief.md",
          storagePath: "attachments/2026/05/demo-workspace/demo-workspace-brief.md"
        }
      ]);
    expect(new SavedViewRepository(connection).listByWorkspace("workspace_1"))
      .toHaveLength(3);
    expect(
      new ActivityLogRepository(connection)
        .listRecent("workspace_1", 100)
        .some((event) => event.summary === "Generated optional demo workspace sample data.")
    ).toBe(true);
    expect(
      new SearchIndexRepository(connection).search("workspace_1", "demo", {
        limit: 20
      }).length
    ).toBeGreaterThan(0);
  });
});

function createService(): DemoWorkspaceService {
  return new DemoWorkspaceService({
    connection,
    idFactory,
    now: () => new Date("2026-05-14T12:00:00.000Z")
  });
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
