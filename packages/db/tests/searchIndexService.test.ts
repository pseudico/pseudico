import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ItemRepository,
  SearchIndexRepository,
  SearchIndexService,
  type DatabaseConnection
} from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;
let idCounter = 0;

describe("SearchIndexService", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    seedWorkspace(connection, "workspace_2");
    idCounter = 0;
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("indexes containers and items with searchable projections", () => {
    const container = createContainer("container_1", "workspace_1", "Launch Plan");
    const item = createItem({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: container.id,
      title: "Supplier checklist",
      body: "Confirm banner copy before Monday"
    });
    const service = createService();

    service.upsertContainer(container, {
      tags: ["ops", "planning"],
      category: "Work"
    });
    service.upsertItem(item, {
      tags: "supplier",
      metadata: { source: "test" }
    });

    expect(search("launch")).toMatchObject([
      {
        targetType: "container",
        targetId: "container_1",
        title: "Launch Plan",
        tags: "ops planning",
        category: "Work"
      }
    ]);
    expect(search("banner")).toMatchObject([
      {
        targetType: "item",
        targetId: "item_1",
        title: "Supplier checklist",
        tags: "supplier"
      }
    ]);
  });

  it("updates indexed text for an existing target", () => {
    const container = createContainer("container_1", "workspace_1", "Launch Plan");
    const itemRepository = new ItemRepository(connection);
    const item = createItem({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: container.id,
      title: "Draft note",
      body: "Rough supplier thoughts"
    });
    const service = createService();

    const firstRecord = service.upsertItem(item);
    const updatedItem = itemRepository.update(item.id, {
      title: "Final note",
      body: "Confirmed supplier decision",
      timestamp: TEST_TIMESTAMP_LATER
    });
    const updatedRecord = service.upsertItem(updatedItem, {
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(updatedRecord.id).toBe(firstRecord.id);
    expect(search("rough")).toEqual([]);
    expect(search("confirmed")).toEqual([updatedRecord]);
  });

  it("removes targets and excludes soft-deleted targets by default", () => {
    const containerRepository = new ContainerRepository(connection);
    const container = createContainer("container_1", "workspace_1", "Archive Plan");
    const service = createService();

    service.upsertContainer(container);
    const deletedContainer = containerRepository.softDelete(
      container.id,
      TEST_TIMESTAMP_LATER
    );
    service.upsertContainer(deletedContainer, {
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(search("archive")).toEqual([]);
    expect(
      service.searchWorkspace({
        workspaceId: "workspace_1",
        query: "archive",
        includeDeleted: true
      })
    ).toHaveLength(1);

    service.removeTarget({
      workspaceId: "workspace_1",
      targetType: "container",
      targetId: container.id
    });

    expect(
      service.searchWorkspace({
        workspaceId: "workspace_1",
        query: "archive",
        includeDeleted: true
      })
    ).toEqual([]);
  });

  it("rebuilds container and item records for one workspace", () => {
    const container = createContainer("container_1", "workspace_1", "Launch Plan");
    createItem({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: container.id,
      title: "Supplier checklist"
    });
    createContainer("container_2", "workspace_2", "Launch Plan");
    new SearchIndexRepository(connection).upsert({
      id: "stale_search_1",
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "missing_item",
      title: "Stale indexed row",
      timestamp: TEST_TIMESTAMP
    });
    const service = createService();

    const result = service.rebuildWorkspaceIndex("workspace_1");

    expect(result).toEqual({
      indexedContainerCount: 1,
      indexedItemCount: 1
    });
    expect(search("stale")).toEqual([]);
    expect(search("launch")).toHaveLength(1);
    expect(
      service.searchWorkspace({
        workspaceId: "workspace_2",
        query: "launch"
      })
    ).toEqual([]);
  });
});

function createService(): SearchIndexService {
  return new SearchIndexService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date(TEST_TIMESTAMP)
  });
}

function createContainer(
  id: string,
  workspaceId: string,
  name: string
) {
  return new ContainerRepository(connection).create({
    id,
    workspaceId,
    type: "project",
    name,
    slug: id,
    description: `${name} description`,
    timestamp: TEST_TIMESTAMP
  });
}

function createItem(input: {
  id: string;
  workspaceId: string;
  containerId: string;
  title: string;
  body?: string;
}) {
  return new ItemRepository(connection).create({
    id: input.id,
    workspaceId: input.workspaceId,
    containerId: input.containerId,
    type: "note",
    title: input.title,
    body: input.body,
    timestamp: TEST_TIMESTAMP
  });
}

function search(query: string) {
  return createService().searchWorkspace({
    workspaceId: "workspace_1",
    query
  });
}
