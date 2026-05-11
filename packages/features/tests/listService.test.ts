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
import { BulkListInsertParser, ListService, parseBulkListItems } from "../src";

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
    expect(BulkListInsertParser.parse("\t- Nested")).toEqual([
      { title: "Nested", status: "open", depth: 1 }
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
    expect(createService().listListsByContainer("container_project_1")).toMatchObject([
      {
        item: {
          id: "item_1",
          type: "list"
        },
        list: {
          itemId: "item_1"
        }
      }
    ]);
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

  it("updates list row dates from a single range input with activity and search alignment", async () => {
    const service = createService();
    const list = await service.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist"
    });
    const created = await service.addListItem({
      listId: list.item.id,
      title: "Book venue"
    });

    const updated = await service.updateListItemDateRange({
      listItemId: created.listItem.id,
      dateRange: "May 1 9am - May 3 5pm"
    });

    expect(updated.listItem).toMatchObject({
      startAt: new Date(2026, 4, 1, 9, 0, 0, 0).toISOString(),
      dueAt: new Date(2026, 4, 3, 17, 0, 0, 0).toISOString()
    });
    expect(JSON.parse(updated.searchRecord.metadataJson)).toMatchObject({
      startAt: new Date(2026, 4, 1, 9, 0, 0, 0).toISOString(),
      dueAt: new Date(2026, 4, 3, 17, 0, 0, 0).toISOString()
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

  it("indents, outdents, and moves rows with keyboard-oriented service commands", async () => {
    const service = createService();
    const list = await service.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist"
    });
    const first = await service.addListItem({
      listId: list.item.id,
      title: "Plan launch"
    });
    const second = await service.addListItem({
      listId: list.item.id,
      title: "Book venue"
    });
    const third = await service.addListItem({
      listId: list.item.id,
      title: "Send update"
    });

    const indented = await service.indentListItem({
      listItemId: second.listItem.id
    });
    const moved = await service.moveListItem({
      listItemId: second.listItem.id,
      direction: "down"
    });
    const outdented = await service.outdentListItem({
      listItemId: second.listItem.id
    });

    expect(indented.listItem).toMatchObject({
      id: second.listItem.id,
      depth: 1,
      listItemParentId: first.listItem.id
    });
    expect(moved.listItem.sortOrder).toBe(third.listItem.sortOrder);
    expect(outdented.listItem).toMatchObject({
      id: second.listItem.id,
      depth: 0,
      listItemParentId: null
    });
    expect(service.listItems(list.item.id).map((item) => item.id)).toEqual([
      first.listItem.id,
      third.listItem.id,
      second.listItem.id
    ]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("list_item", second.listItem.id)
        .map((event) => event.action)
    ).toEqual([
      "list_item_created",
      "list_item_reordered",
      "list_item_reordered",
      "list_item_reordered"
    ]);
  });

  it("moves a list row subtree across lists while preserving row metadata and repairing order", async () => {
    const service = createService();
    const source = await service.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Source checklist"
    });
    const target = await service.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Target checklist"
    });
    const sourceFirst = await service.addListItem({
      listId: source.item.id,
      title: "Source first"
    });
    const parent = await service.addListItem({
      listId: source.item.id,
      title: "Move me",
      body: "Keep this note",
      status: "waiting",
      dueAt: "2026-05-04"
    });
    const child = await service.addListItem({
      listId: source.item.id,
      title: "Move child",
      listItemParentId: parent.listItem.id
    });
    const sourceLast = await service.addListItem({
      listId: source.item.id,
      title: "Source last"
    });
    const targetFirst = await service.addListItem({
      listId: target.item.id,
      title: "Target first"
    });
    const targetLast = await service.addListItem({
      listId: target.item.id,
      title: "Target last"
    });

    const moved = await service.moveListItemToList({
      listItemId: parent.listItem.id,
      targetListId: target.item.id,
      beforeListItemId: targetLast.listItem.id
    });

    expect(moved.map((result) => result.listItem.id)).toEqual([
      parent.listItem.id,
      child.listItem.id,
      sourceLast.listItem.id,
      targetLast.listItem.id
    ]);
    expect(moved[0]?.listItem).toMatchObject({
      id: parent.listItem.id,
      listId: target.item.id,
      listItemParentId: null,
      title: "Move me",
      body: "Keep this note",
      status: "waiting",
      dueAt: "2026-05-04T00:00:00.000Z",
      depth: 0
    });
    expect(moved[1]?.listItem).toMatchObject({
      id: child.listItem.id,
      listId: target.item.id,
      listItemParentId: parent.listItem.id,
      depth: 1
    });
    expect(service.listItems(source.item.id).map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder
    }))).toEqual([
      { id: sourceFirst.listItem.id, sortOrder: 1024 },
      { id: sourceLast.listItem.id, sortOrder: 2048 }
    ]);
    expect(service.listItems(target.item.id).map((item) => ({
      id: item.id,
      parentId: item.listItemParentId,
      sortOrder: item.sortOrder
    }))).toEqual([
      { id: targetFirst.listItem.id, parentId: null, sortOrder: 1024 },
      { id: parent.listItem.id, parentId: null, sortOrder: 2048 },
      { id: child.listItem.id, parentId: parent.listItem.id, sortOrder: 3072 },
      { id: targetLast.listItem.id, parentId: null, sortOrder: 4096 }
    ]);
    expect(
      JSON.parse(
        new SearchIndexRepository(connection).getByTarget({
          workspaceId: "workspace_1",
          targetType: "list_item",
          targetId: parent.listItem.id
        })?.metadataJson ?? "{}"
      )
    ).toMatchObject({
      listId: target.item.id,
      parentId: null,
      status: "waiting"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("list_item", parent.listItem.id)
        .map((event) => event.action)
    ).toEqual(["list_item_created", "list_item_reordered"]);
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

  it("bulk updates selected list rows with grouped activity and search alignment", async () => {
    const service = createService();
    const list = await service.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch checklist"
    });
    const first = await service.addListItem({
      listId: list.item.id,
      title: "Plan launch"
    });
    const second = await service.addListItem({
      listId: list.item.id,
      title: "Book venue"
    });
    const third = await service.addListItem({
      listId: list.item.id,
      title: "Send update"
    });

    const indented = await service.bulkUpdateListItems({
      listId: list.item.id,
      listItemIds: [second.listItem.id, third.listItem.id],
      operation: "indent"
    });
    const completed = await service.bulkUpdateListItems({
      listId: list.item.id,
      listItemIds: [second.listItem.id, third.listItem.id],
      operation: "complete"
    });
    const moved = await service.bulkUpdateListItems({
      listId: list.item.id,
      listItemIds: [second.listItem.id, third.listItem.id],
      operation: "move_up"
    });
    const deleted = await service.bulkUpdateListItems({
      listId: list.item.id,
      listItemIds: [third.listItem.id],
      operation: "delete"
    });

    expect(indented).toMatchObject({
      operation: "indent",
      requestedCount: 2,
      changedCount: 2,
      skippedCount: 0
    });
    expect(indented.items.map((item) => item.listItem?.listItemParentId)).toEqual([
      first.listItem.id,
      second.listItem.id
    ]);
    expect(completed).toMatchObject({
      operation: "complete",
      changedCount: 2
    });
    expect(moved).toMatchObject({
      operation: "move_up",
      changedCount: 2,
      skippedCount: 0
    });
    expect(deleted).toMatchObject({
      operation: "delete",
      changedCount: 1
    });
    expect(service.listItems(list.item.id).map((item) => item.id)).toEqual([
      second.listItem.id,
      first.listItem.id
    ]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "list_item",
        targetId: third.listItem.id
      })
    ).toMatchObject({
      targetId: third.listItem.id,
      isDeleted: true
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", list.item.id, 10)
        .map((event) => event.action)
    ).toEqual(
      expect.arrayContaining([
        "bulk_list_items_indented",
        "bulk_list_items_completed",
        "bulk_list_items_moved",
        "bulk_list_items_deleted"
      ])
    );
  });

  it("toggles pipeline mode, projects stages/cards, and moves cards with activity", async () => {
    const service = createService();
    const list = await service.createList({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Publishing pipeline"
    });
    const idea = await service.addListItem({
      listId: list.item.id,
      title: "Idea"
    });
    const review = await service.addListItem({
      listId: list.item.id,
      title: "Review"
    });
    const draft = await service.addListItem({
      listId: list.item.id,
      title: "Draft article",
      listItemParentId: idea.listItem.id
    });

    const enabled = await service.enablePipelineMode(list.item.id);
    const moved = await service.movePipelineCard({
      listId: list.item.id,
      cardId: draft.listItem.id,
      targetStageId: review.listItem.id,
      sortOrder: 4096
    });
    const viewModel = service.getPipelineViewModel(list.item.id);
    const disabled = await service.disablePipelineMode(list.item.id);

    expect(enabled.list.displayMode).toBe("pipeline");
    expect(JSON.parse(enabled.searchRecord.metadataJson)).toMatchObject({
      displayMode: "pipeline"
    });
    expect(moved.card).toMatchObject({
      id: draft.listItem.id,
      listItemParentId: review.listItem.id,
      depth: 1,
      sortOrder: 4096
    });
    expect(viewModel.stages.map((stage) => ({
      title: stage.stage.title,
      cards: stage.cards.map((card) => card.title)
    }))).toEqual([
      { title: "Idea", cards: [] },
      { title: "Review", cards: ["Draft article"] }
    ]);
    expect(disabled.list.displayMode).toBe("checklist");
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", list.item.id)
        .map((event) => event.action)
    ).toEqual(["list_created", "list_updated", "list_updated"]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("list_item", draft.listItem.id)
        .map((event) => event.action)
    ).toEqual(["list_item_created", "list_item_reordered"]);
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
