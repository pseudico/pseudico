import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ItemRepository,
  ListRepository,
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

describe("ListRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: TEST_TIMESTAMP
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates list details for a list item record", () => {
    const listItem = createListItem();
    const list = new ListRepository(connection).createDetails({
      itemId: listItem.id,
      workspaceId: "workspace_1",
      showCompleted: false,
      progressMode: "manual",
      timestamp: TEST_TIMESTAMP
    });

    expect(list).toEqual({
      itemId: "item_list_1",
      workspaceId: "workspace_1",
      displayMode: "checklist",
      showCompleted: false,
      progressMode: "manual",
      createdAt: TEST_TIMESTAMP,
      updatedAt: TEST_TIMESTAMP
    });
    expect(new ListRepository(connection).getByItemId(listItem.id)).toMatchObject({
      item: { id: "item_list_1", type: "list" },
      list
    });
  });

  it("creates, lists, and updates checklist rows", () => {
    createPersistedList();
    const repository = new ListRepository(connection);
    const first = repository.createListItem({
      id: "list_item_1",
      workspaceId: "workspace_1",
      listId: "item_list_1",
      title: "Book venue",
      body: "Confirm capacity",
      sortOrder: 2048,
      timestamp: TEST_TIMESTAMP
    });
    const second = repository.createListItem({
      id: "list_item_2",
      workspaceId: "workspace_1",
      listId: "item_list_1",
      listItemParentId: first.id,
      title: "Call supplier",
      status: "waiting",
      depth: 1,
      sortOrder: 1024,
      timestamp: TEST_TIMESTAMP
    });

    const updated = repository.updateListItem(second.id, {
      status: "done",
      completedAt: TEST_TIMESTAMP_LATER,
      sortOrder: 3072,
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(first).toMatchObject({
      id: "list_item_1",
      status: "open",
      sortOrder: 2048
    });
    expect(updated).toMatchObject({
      id: "list_item_2",
      listItemParentId: "list_item_1",
      status: "done",
      depth: 1,
      sortOrder: 3072,
      completedAt: TEST_TIMESTAMP_LATER
    });
    expect(repository.listItems("item_list_1").map((item) => item.id)).toEqual([
      "list_item_1",
      "list_item_2"
    ]);
    expect(repository.getMaxListItemSortOrder("item_list_1")).toBe(3072);
  });
});

function createPersistedList() {
  const item = createListItem();
  new ListRepository(connection).createDetails({
    itemId: item.id,
    workspaceId: "workspace_1",
    timestamp: TEST_TIMESTAMP
  });
  return item;
}

function createListItem() {
  return new ItemRepository(connection).create({
    id: "item_list_1",
    workspaceId: "workspace_1",
    containerId: "container_1",
    type: "list",
    title: "Launch checklist",
    timestamp: TEST_TIMESTAMP
  });
}
