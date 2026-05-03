import {
  ContainerRepository,
  ItemRepository,
  ListRepository,
  MigrationService,
  NoteRepository,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SearchIndexOrchestrator, SearchService } from "../src";

const TEST_TIMESTAMP = "2026-05-02T01:02:03.000Z";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("SearchIndexOrchestrator", () => {
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
      timestamp: TEST_TIMESTAMP
    });
    seedSearchableObjects();
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("upserts container, note, list, and list row projections from source IDs", () => {
    const orchestrator = createOrchestrator();

    expect(orchestrator.getSearchIndexHealth("workspace_1")).toMatchObject({
      status: "degraded",
      missingRecordCount: 4
    });

    const containerRecord = orchestrator.upsertContainerIndex("container_1");
    const noteRecord = orchestrator.upsertItemIndex("item_note_1");
    const listResult = orchestrator.upsertListIndex("item_list_1");

    expect(containerRecord).toMatchObject({
      targetType: "container",
      targetId: "container_1",
      title: "Launch Plan"
    });
    expect(noteRecord).toMatchObject({
      targetType: "item",
      targetId: "item_note_1",
      body: "Detailed launch memo\nLaunch preview"
    });
    expect(JSON.parse(listResult.listRecord.metadataJson)).toMatchObject({
      displayMode: "checklist",
      showCompleted: true,
      progressMode: "count"
    });
    expect(listResult.listItemRecords).toMatchObject([
      {
        targetType: "list_item",
        targetId: "list_item_1",
        title: "Order signage"
      }
    ]);
    expect(orchestrator.getSearchIndexHealth("workspace_1")).toMatchObject({
      status: "healthy",
      missingRecordCount: 0,
      orphanedRecordCount: 0,
      deletedFlagMismatchCount: 0
    });
  });

  it("exposes rebuild and health through the feature search service", () => {
    const service = createSearchService();

    new SearchIndexRepository(connection).upsert({
      id: "search_orphaned",
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "missing_item",
      title: "Stale row",
      timestamp: TEST_TIMESTAMP
    });

    expect(service.getSearchIndexHealth("workspace_1")).toMatchObject({
      status: "degraded",
      missingRecordCount: 4,
      orphanedRecordCount: 1
    });

    expect(service.rebuildWorkspaceIndex("workspace_1")).toEqual({
      indexedContainerCount: 1,
      indexedItemCount: 2,
      indexedListItemCount: 1
    });
    expect(service.getSearchIndexHealth("workspace_1")).toMatchObject({
      status: "healthy",
      missingRecordCount: 0,
      orphanedRecordCount: 0
    });
    expect(
      service.searchWorkspace({
        workspaceId: "workspace_1",
        query: "memo"
      })
    ).toMatchObject([
      {
        targetType: "item",
        targetId: "item_note_1"
      }
    ]);
  });
});

function seedSearchableObjects(): void {
  new ContainerRepository(connection).create({
    id: "container_1",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    description: "Supplier planning",
    timestamp: TEST_TIMESTAMP
  });
  new ItemRepository(connection).create({
    id: "item_note_1",
    workspaceId: "workspace_1",
    containerId: "container_1",
    type: "note",
    title: "Launch memo",
    body: "Launch preview",
    timestamp: TEST_TIMESTAMP
  });
  new NoteRepository(connection).createDetails({
    itemId: "item_note_1",
    workspaceId: "workspace_1",
    content: "Detailed launch memo",
    preview: "Launch preview",
    timestamp: TEST_TIMESTAMP
  });
  new ItemRepository(connection).create({
    id: "item_list_1",
    workspaceId: "workspace_1",
    containerId: "container_1",
    type: "list",
    title: "Launch checklist",
    timestamp: TEST_TIMESTAMP
  });
  new ListRepository(connection).createDetails({
    itemId: "item_list_1",
    workspaceId: "workspace_1",
    timestamp: TEST_TIMESTAMP
  });
  new ListRepository(connection).createListItem({
    id: "list_item_1",
    workspaceId: "workspace_1",
    listId: "item_list_1",
    title: "Order signage",
    timestamp: TEST_TIMESTAMP
  });
}

function createOrchestrator(): SearchIndexOrchestrator {
  return new SearchIndexOrchestrator(createServiceInput());
}

function createSearchService(): SearchService {
  return new SearchService(createServiceInput());
}

function createServiceInput() {
  return {
    connection,
    idFactory: (prefix: string) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date(TEST_TIMESTAMP)
  };
}
