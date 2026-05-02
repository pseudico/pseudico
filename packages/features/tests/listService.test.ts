import {
  ActivityLogRepository,
  ContainerRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ListService, parseBulkListItems } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("parseBulkListItems", () => {
  it("parses bullets, checkbox state, numbering, and indentation", () => {
    expect(
      parseBulkListItems("- Book venue\n  [x] Confirm caterer\n2. Send invites")
    ).toEqual([
      { title: "Book venue", status: "open", depth: 0 },
      { title: "Confirm caterer", status: "done", depth: 1 },
      { title: "Send invites", status: "open", depth: 0 }
    ]);
  });
});

describe("ListService", () => {
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

  it("creates a list item and list details with activity and search records", async () => {
    const result = await createService().createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: " Launch checklist ",
      body: "Public launch steps",
      showCompleted: false
    });

    expect(result.item).toMatchObject({
      id: "item_1",
      type: "list",
      title: "Launch checklist",
      body: "Public launch steps",
      sortOrder: 1024
    });
    expect(result.list).toMatchObject({
      itemId: "item_1",
      displayMode: "checklist",
      showCompleted: false,
      progressMode: "count"
    });
    expect(result.searchRecord).toMatchObject({
      targetType: "item",
      targetId: "item_1",
      title: "Launch checklist",
      body: "Public launch steps"
    });
    expect(JSON.parse(result.searchRecord.metadataJson)).toMatchObject({
      displayMode: "checklist",
      showCompleted: false,
      progressMode: "count"
    });
    expect(
      new ActivityLogRepository(connection).listForTarget("item", "item_1")
    ).toMatchObject([{ action: "list_created" }]);
  });

  it("adds, completes, and reopens list rows with activity and search alignment", async () => {
    const service = createService();
    const list = await service.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist"
    });

    const created = await service.addListItem({
      listId: list.item.id,
      title: " Book venue ",
      body: "Needs capacity check",
      dueAt: "2026-05-03",
      status: "open"
    });
    const completed = await service.completeListItem(created.listItem.id);
    const reopened = await service.reopenListItem(created.listItem.id);

    expect(created.listItem).toMatchObject({
      title: "Book venue",
      body: "Needs capacity check",
      status: "open",
      depth: 0,
      sortOrder: 1024,
      dueAt: "2026-05-03T00:00:00.000Z"
    });
    expect(completed.listItem).toMatchObject({
      status: "done",
      completedAt: "2026-05-02T01:02:03.000Z"
    });
    expect(reopened.listItem).toMatchObject({
      status: "open",
      completedAt: null
    });
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "list_item",
        targetId: created.listItem.id
      })
    ).toMatchObject({
      title: "Book venue",
      body: "Needs capacity check"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("list_item", created.listItem.id)
        .map((event) => event.action)
    ).toEqual([
      "list_item_created",
      "list_item_completed",
      "list_item_reopened"
    ]);
  });

  it("updates list row fields with activity and search alignment", async () => {
    const service = createService();
    const list = await service.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist"
    });
    const created = await service.addListItem({
      listId: list.item.id,
      title: "Draft row",
      body: "Initial notes",
      dueAt: "2026-05-03"
    });

    const updated = await service.updateListItem({
      listItemId: created.listItem.id,
      title: "Final row",
      body: "Confirmed notes",
      status: "waiting",
      dueAt: null
    });

    expect(updated.listItem).toMatchObject({
      title: "Final row",
      body: "Confirmed notes",
      status: "waiting",
      dueAt: null
    });
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "list_item",
        targetId: created.listItem.id
      })
    ).toMatchObject({
      title: "Final row",
      body: "Confirmed notes"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("list_item", created.listItem.id)
        .map((event) => event.action)
    ).toEqual(["list_item_created", "list_item_updated"]);
  });

  it("reorders rows and updates indentation metadata", async () => {
    const service = createService();
    const list = await service.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist"
    });
    const parent = await service.addListItem({
      listId: list.item.id,
      title: "Travel"
    });
    const child = await service.addListItem({
      listId: list.item.id,
      title: "Book hotel"
    });

    const [reorderedChild, reorderedParent] = await service.reorderListItems({
      listId: list.item.id,
      items: [
        {
          id: child.listItem.id,
          sortOrder: 1024,
          depth: 1,
          listItemParentId: parent.listItem.id
        },
        {
          id: parent.listItem.id,
          sortOrder: 2048,
          depth: 0,
          listItemParentId: null
        }
      ]
    });

    expect(reorderedChild?.listItem).toMatchObject({
      id: child.listItem.id,
      sortOrder: 1024,
      depth: 1,
      listItemParentId: parent.listItem.id
    });
    expect(reorderedParent?.listItem).toMatchObject({
      id: parent.listItem.id,
      sortOrder: 2048,
      depth: 0,
      listItemParentId: null
    });
    expect(service.listItems(list.item.id).map((item) => item.id)).toEqual([
      child.listItem.id,
      parent.listItem.id
    ]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("list_item", child.listItem.id)
        .map((event) => event.action)
    ).toContain("list_item_reordered");
  });

  it("bulk creates parsed rows with parent links, activity, and search records", async () => {
    const service = createService();
    const list = await service.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist"
    });

    const results = await service.bulkCreateListItems({
      listId: list.item.id,
      text: "- Launch prep\n  [x] Confirm copy\n  - Confirm visuals\n- Follow up"
    });

    expect(results.map((result) => ({
      title: result.listItem.title,
      status: result.listItem.status,
      depth: result.listItem.depth,
      parentId: result.listItem.listItemParentId,
      sortOrder: result.listItem.sortOrder
    }))).toEqual([
      {
        title: "Launch prep",
        status: "open",
        depth: 0,
        parentId: null,
        sortOrder: 1024
      },
      {
        title: "Confirm copy",
        status: "done",
        depth: 1,
        parentId: results[0]?.listItem.id,
        sortOrder: 2048
      },
      {
        title: "Confirm visuals",
        status: "open",
        depth: 1,
        parentId: results[0]?.listItem.id,
        sortOrder: 3072
      },
      {
        title: "Follow up",
        status: "open",
        depth: 0,
        parentId: null,
        sortOrder: 4096
      }
    ]);
    expect(
      new SearchIndexRepository(connection).search("workspace_1", "visuals", {
        targetTypes: ["list_item"]
      })
    ).toHaveLength(1);
    expect(
      new ActivityLogRepository(connection).listRecent("workspace_1", 20)
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "list_item_created",
          targetId: results[2]?.listItem.id
        })
      ])
    );
  });
});

function createService(): ListService {
  return new ListService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}
