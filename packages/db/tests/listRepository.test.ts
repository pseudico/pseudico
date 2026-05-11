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

  it("updates list display preferences without a schema change", () => {
    const listItem = createListItem();
    const repository = new ListRepository(connection);
    repository.createDetails({
      itemId: listItem.id,
      workspaceId: "workspace_1",
      timestamp: TEST_TIMESTAMP
    });

    const updated = repository.updateDetails(listItem.id, {
      displayMode: "pipeline",
      showCompleted: false,
      progressMode: "manual",
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(updated).toMatchObject({
      itemId: listItem.id,
      displayMode: "pipeline",
      showCompleted: false,
      progressMode: "manual",
      updatedAt: TEST_TIMESTAMP_LATER
    });
    expect(repository.getByItemId(listItem.id)?.list).toMatchObject({
      displayMode: "pipeline",
      showCompleted: false,
      progressMode: "manual"
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
    expect(repository.listByContainer("container_1")).toMatchObject([
      {
        item: {
          id: "item_list_1",
          type: "list"
        },
        list: {
          itemId: "item_list_1"
        }
      }
    ]);
    expect(repository.getMaxListItemSortOrder("item_list_1")).toBe(3072);
  });

  it("persists row depth, parent links, and manual sort order changes", () => {
    createPersistedList();
    const repository = new ListRepository(connection);
    const parent = repository.createListItem({
      id: "list_item_parent",
      workspaceId: "workspace_1",
      listId: "item_list_1",
      title: "Parent row",
      sortOrder: 1024,
      timestamp: TEST_TIMESTAMP
    });
    const child = repository.createListItem({
      id: "list_item_child",
      workspaceId: "workspace_1",
      listId: "item_list_1",
      title: "Child row",
      sortOrder: 2048,
      timestamp: TEST_TIMESTAMP
    });

    repository.updateListItem(child.id, {
      depth: 1,
      listItemParentId: parent.id,
      sortOrder: 512,
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(repository.getListItemById(child.id)).toMatchObject({
      id: child.id,
      depth: 1,
      listItemParentId: parent.id,
      sortOrder: 512,
      updatedAt: TEST_TIMESTAMP_LATER
    });
    expect(repository.listItems("item_list_1").map((item) => item.id)).toEqual([
      child.id,
      parent.id
    ]);
  });

  it("lists dated checklist rows in a bounded range", () => {
    createPersistedList();
    const repository = new ListRepository(connection);
    repository.createListItem({
      id: "list_item_1",
      workspaceId: "workspace_1",
      listId: "item_list_1",
      title: "Book venue",
      dueAt: "2026-05-15T12:00:00.000Z",
      timestamp: TEST_TIMESTAMP
    });
    repository.createListItem({
      id: "list_item_2",
      workspaceId: "workspace_1",
      listId: "item_list_1",
      title: "Completed prep",
      dueAt: "2026-05-15T13:00:00.000Z",
      status: "done",
      completedAt: TEST_TIMESTAMP_LATER,
      timestamp: TEST_TIMESTAMP
    });
    repository.createListItem({
      id: "list_item_3",
      workspaceId: "workspace_1",
      listId: "item_list_1",
      title: "Outside month",
      dueAt: "2026-06-15T12:00:00.000Z",
      timestamp: TEST_TIMESTAMP
    });

    const activeRows = repository.listDatedItemsBetween({
      workspaceId: "workspace_1",
      range: {
        startInclusive: "2026-05-01T00:00:00.000Z",
        endExclusive: "2026-06-01T00:00:00.000Z"
      }
    });
    const allRows = repository.listDatedItemsBetween({
      workspaceId: "workspace_1",
      includeCompleted: true,
      range: {
        startInclusive: "2026-05-01T00:00:00.000Z",
        endExclusive: "2026-06-01T00:00:00.000Z"
      }
    });

    expect(activeRows.map((row) => row.listItem.title)).toEqual(["Book venue"]);
    expect(allRows.map((row) => row.listItem.title)).toEqual([
      "Book venue",
      "Completed prep"
    ]);
    expect(activeRows[0]).toMatchObject({
      list: {
        item: {
          id: "item_list_1",
          containerId: "container_1"
        }
      }
    });
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
