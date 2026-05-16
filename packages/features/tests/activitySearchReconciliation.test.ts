import { afterEach, describe, expect, it } from "vitest";
import {
  ActivityLogRepository,
  AttachmentRepository,
  DatabaseBootstrapService,
  SearchIndexRepository,
  SearchIndexService,
  createDatabaseConnection,
  type ActivityLogRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  CategoryService,
  CollectionService,
  ContactService,
  DailyPlanService,
  FileAttachmentService,
  ItemService,
  LinkService,
  ListService,
  MaintenanceService,
  NoteService,
  ProjectService,
  RelationshipService,
  SavedViewService,
  SearchService,
  TagService,
  TaskService
} from "../src";
import { createTestDatabase, makeTestIds } from "@local-work-os/test-utils";

const WORKSPACE_ID = "workspace_activity_search";
const WORKSPACE_NAME = "Activity Search Reconciliation";
const STARTED_AT = "2026-05-15T02:00:00.000Z";
const UPDATED_AT = "2026-05-15T03:00:00.000Z";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection | null = null;

describe("activity/search reconciliation", () => {
  afterEach(async () => {
    connection?.close();
    connection = null;
    await cleanup?.();
    cleanup = undefined;
  });

  it("keeps activity rows and search projections aligned across operator-facing mutations", async () => {
    const testDb = await createTestDatabase({
      id: WORKSPACE_ID,
      name: WORKSPACE_NAME,
      timestamp: STARTED_AT
    });
    cleanup = testDb.cleanup;
    const ids = makeTestIds();

    await new DatabaseBootstrapService({
      idFactory: ids.nextId,
      now: () => new Date(STARTED_AT)
    }).bootstrapWorkspaceDatabase({
      databasePath: testDb.databasePath,
      workspaceId: WORKSPACE_ID,
      workspaceName: WORKSPACE_NAME
    });

    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath,
      fileMustExist: true
    });

    const services = createServices({
      connection,
      idFactory: ids.nextId,
      now: () => new Date(UPDATED_AT)
    });

    const category = await services.category.createCategory({
      workspaceId: WORKSPACE_ID,
      name: "Operator Risk",
      color: "#b197fc"
    });
    const project = await services.project.createProject({
      workspaceId: WORKSPACE_ID,
      name: "Reconciliation Project",
      description: "Original reconciliation description."
    });
    const contact = await services.contact.createContact({
      workspaceId: WORKSPACE_ID,
      name: "Sam Operator",
      description: "Original operator contact.",
      fields: [
        {
          label: "Email",
          value: "sam.operator@example.test",
          type: "email",
          sortOrder: 10
        }
      ]
    });

    await services.category.assignCategoryToContainer({
      workspaceId: WORKSPACE_ID,
      containerId: project.project.id,
      categoryId: category.id
    });

    const task = await services.task.createTask({
      workspaceId: WORKSPACE_ID,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      title: "Reconcile operator task @handoff",
      body: "Original task body.",
      dueAt: "2026-05-15T12:00:00.000Z",
      priority: 1
    });
    const note = await services.note.createNote({
      workspaceId: WORKSPACE_ID,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      title: "Reconciliation note",
      content: "Original note content."
    });
    const list = await services.list.createList({
      workspaceId: WORKSPACE_ID,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      title: "Reconciliation checklist",
      body: "Original checklist body."
    });
    const listRow = await services.list.addListItem({
      listId: list.item.id,
      title: "Original row",
      body: "Original row body."
    });
    const link = await services.link.createLink({
      workspaceId: WORKSPACE_ID,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      title: "Reconciliation link",
      description: "Original link description.",
      url: "https://example.com/reconciliation"
    });
    const file = await services.file.attachFileToContainer({
      workspaceId: WORKSPACE_ID,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      description: "Original attachment description.",
      copiedFile: {
        attachmentId: "attachment_reconciliation",
        originalName: "reconciliation.txt",
        storedName: "reconciliation.txt",
        storagePath: "attachments/2026/05/reconciliation/reconciliation.txt",
        sizeBytes: 42,
        checksum: "a".repeat(64),
        mimeType: "text/plain"
      }
    });

    await services.tag.addTagToTarget({
      workspaceId: WORKSPACE_ID,
      targetType: "item",
      targetId: task.item.id,
      name: "handoff-review"
    });
    await services.category.assignCategoryToItem({
      workspaceId: WORKSPACE_ID,
      itemId: task.item.id,
      categoryId: category.id
    });
    await services.relationship.createRelationship({
      workspaceId: WORKSPACE_ID,
      source: { type: "container", id: contact.contact.id },
      target: { type: "container", id: project.project.id },
      relationType: "related",
      label: "Operator stakeholder"
    });
    const savedView = await services.savedView.createSavedView({
      workspaceId: WORKSPACE_ID,
      type: "smart_list",
      name: "Handoff risks",
      description: "Risk tasks for handoff.",
      query: {
        version: 1,
        match: "all",
        targets: ["item"],
        conditions: [
          { field: "itemType", operator: "is", value: "task" },
          { field: "tag", operator: "has", value: "handoff-review" }
        ],
        sort: [{ field: "dueAt", direction: "asc" }]
      }
    });
    await services.collection.createTagCollection({
      workspaceId: WORKSPACE_ID,
      tagSlug: "handoff-review",
      name: "Handoff review collection"
    });
    await services.dailyPlan.planTask({
      workspaceId: WORKSPACE_ID,
      itemId: task.item.id,
      lane: "today",
      date: new Date("2026-05-15T08:00:00.000Z")
    });

    const updatedProject = await services.project.updateProject({
      projectId: project.project.id,
      name: "Reconciled Project",
      description: "Updated project reconciliation evidence."
    });
    const updatedContact = await services.contact.updateContact({
      contactId: contact.contact.id,
      name: "Sam Reconciled",
      description: "Updated operator contact."
    });
    const updatedTask = await services.task.updateTask({
      itemId: task.item.id,
      title: "Reconciled operator task @handoff",
      body: "Updated task body includes searchable reconciliation-evidence.",
      status: "waiting",
      priority: 2
    });
    const updatedNote = await services.note.updateNote({
      itemId: note.item.id,
      title: "Reconciled note",
      content: "Updated note content contains reconciliation-evidence."
    });
    const updatedList = await services.list.updateList({
      itemId: list.item.id,
      title: "Reconciled checklist",
      body: "Updated checklist body."
    });
    const updatedListRow = await services.list.updateListItem({
      listItemId: listRow.listItem.id,
      title: "Reconciled row",
      body: "Updated row body contains reconciliation-evidence."
    });
    const updatedLink = await services.link.updateLink({
      itemId: link.item.id,
      title: "Reconciled link",
      description: "Updated link description contains reconciliation-evidence.",
      url: "https://example.com/reconciled"
    });
    const updatedFile = await services.file.updateMetadata({
      attachmentId: file.attachment.id,
      title: "Reconciled file",
      description: "Updated attachment description contains reconciliation-evidence."
    });

    await services.item.softDeleteItem(updatedFile.item.id);

    expectActivity(connection, "container", updatedProject.id, [
      "container_created",
      "category_assigned",
      "container_updated"
    ]);
    expectActivity(connection, "container", updatedContact.id, [
      "container_created",
      "container_updated"
    ]);
    expectActivity(connection, "item", updatedTask.item.id, [
      "task_created",
      "tag_added",
      "category_assigned",
      "task_updated",
      "task_planned"
    ]);
    expectActivity(connection, "item", updatedNote.item.id, [
      "note_created",
      "note_updated"
    ]);
    expectActivity(connection, "item", updatedList.item.id, [
      "list_created",
      "list_updated"
    ]);
    expectActivity(connection, "list_item", updatedListRow.listItem.id, [
      "list_item_created",
      "list_item_updated"
    ]);
    expectActivity(connection, "item", updatedLink.item.id, [
      "link_created",
      "link_updated"
    ]);
    expectActivity(connection, "attachment", updatedFile.attachment.id, [
      "file_attached"
    ]);
    expectActivity(connection, "item", updatedFile.item.id, [
      "item_updated",
      "item_deleted"
    ]);
    expectActivity(connection, "saved_view", savedView.savedView.id, [
      "saved_view_created"
    ]);

    expectSearch(connection, "container", updatedProject.id).toMatchObject({
      title: "Reconciled Project",
      body: expect.stringContaining("Updated project reconciliation evidence"),
      category: "Operator Risk",
      isDeleted: false
    });
    expectSearch(connection, "container", updatedContact.id).toMatchObject({
      title: "Sam Reconciled",
      body: expect.stringContaining("sam.operator@example.test"),
      isDeleted: false
    });
    expectSearch(connection, "item", updatedTask.item.id).toMatchObject({
      title: "Reconciled operator task @handoff",
      body: expect.stringContaining("reconciliation-evidence"),
      tags: "handoff handoff-review",
      category: "Operator Risk",
      isDeleted: false
    });
    expectSearch(connection, "item", updatedNote.item.id).toMatchObject({
      title: "Reconciled note",
      body: expect.stringContaining("reconciliation-evidence"),
      isDeleted: false
    });
    expectSearch(connection, "item", updatedList.item.id).toMatchObject({
      title: "Reconciled checklist",
      body: "Updated checklist body.",
      isDeleted: false
    });
    expectSearch(connection, "list_item", updatedListRow.listItem.id).toMatchObject({
      title: "Reconciled row",
      body: expect.stringContaining("reconciliation-evidence"),
      isDeleted: false
    });
    expectSearch(connection, "item", updatedLink.item.id).toMatchObject({
      title: "Reconciled link",
      body: expect.stringContaining("https://example.com/reconciled"),
      isDeleted: false
    });
    expectSearch(connection, "item", updatedFile.item.id).toMatchObject({
      title: "Reconciled file",
      isDeleted: true
    });
    expectSearch(connection, "attachment", updatedFile.attachment.id).toMatchObject({
      title: "reconciliation.txt",
      body: expect.stringContaining("Updated attachment description"),
      isDeleted: true
    });
    expectSearch(connection, "saved_view", savedView.savedView.id).toMatchObject({
      title: "Handoff risks",
      body: expect.stringContaining("smart_list"),
      isDeleted: false
    });

    expect(new SearchIndexService({ connection }).getSearchIndexHealth(WORKSPACE_ID))
      .toMatchObject({
        status: "healthy",
        missingRecordCount: 0,
        orphanedRecordCount: 0,
        deletedFlagMismatchCount: 0
      });
    expect(new SearchService({ connection }).search({
      workspaceId: WORKSPACE_ID,
      query: "reconciliation-evidence",
      limit: 10
    }).map((result) => result.targetId)).toEqual(
      expect.arrayContaining([
        updatedTask.item.id,
        updatedNote.item.id,
        updatedListRow.listItem.id,
        updatedLink.item.id
      ])
    );
    expect(new SearchIndexRepository(connection).search(
      WORKSPACE_ID,
      "Updated attachment description"
    )).toEqual([]);
    expect(new AttachmentRepository(connection).getById(file.attachment.id))
      .toMatchObject({ itemId: updatedFile.item.id });
  });

  it("detects and repairs missing, orphaned, and stale deleted search rows", async () => {
    const testDb = await createTestDatabase({
      id: WORKSPACE_ID,
      name: WORKSPACE_NAME,
      timestamp: STARTED_AT
    });
    cleanup = testDb.cleanup;
    const ids = makeTestIds();

    await new DatabaseBootstrapService({
      idFactory: ids.nextId,
      now: () => new Date(STARTED_AT)
    }).bootstrapWorkspaceDatabase({
      databasePath: testDb.databasePath,
      workspaceId: WORKSPACE_ID,
      workspaceName: WORKSPACE_NAME
    });
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath,
      fileMustExist: true
    });

    const project = await new ProjectService({
      connection,
      idFactory: ids.nextId,
      now: () => new Date(UPDATED_AT)
    }).createProject({
      workspaceId: WORKSPACE_ID,
      name: "Repair Project"
    });
    const item = await new ItemService({
      connection,
      idFactory: ids.nextId,
      now: () => new Date(UPDATED_AT)
    }).createItem({
      workspaceId: WORKSPACE_ID,
      containerId: project.project.id,
      type: "note",
      title: "Repair note"
    });
    const search = new SearchIndexRepository(connection);

    search.remove({
      workspaceId: WORKSPACE_ID,
      targetType: "container",
      targetId: project.project.id
    });
    search.upsert({
      id: "search_orphan",
      workspaceId: WORKSPACE_ID,
      targetType: "item",
      targetId: "missing_item",
      title: "Orphaned search row",
      timestamp: UPDATED_AT
    });
    search.upsert({
      id: "search_stale_deleted",
      workspaceId: WORKSPACE_ID,
      targetType: "item",
      targetId: item.item.id,
      title: "Repair note",
      isDeleted: true,
      timestamp: UPDATED_AT
    });

    const before = new SearchIndexService({ connection }).getSearchIndexHealth(WORKSPACE_ID);
    expect(before).toMatchObject({
      status: "degraded",
      missingRecordCount: 1,
      orphanedRecordCount: 1,
      deletedFlagMismatchCount: 1
    });
    expect(before.missingTargets).toContainEqual({
      targetType: "container",
      targetId: project.project.id
    });

    const job = await new MaintenanceService({
      connection,
      idFactory: ids.nextId,
      now: () => new Date(UPDATED_AT),
      database: {
        runIntegrityCheck: () => ["ok"],
        vacuum: () => undefined
      }
    }).runMaintenanceJob({
      workspaceId: WORKSPACE_ID,
      operations: ["rebuild_search_index"]
    });

    expect(job.searchReindex).toMatchObject({
      indexedContainerCount: 2,
      indexedItemCount: 1,
      indexedListItemCount: 0,
      indexedAttachmentCount: 0
    });
    expect(new SearchIndexService({ connection }).getSearchIndexHealth(WORKSPACE_ID))
      .toMatchObject({
        status: "healthy",
        missingRecordCount: 0,
        orphanedRecordCount: 0,
        deletedFlagMismatchCount: 0
      });
    expectActivity(connection, "search_index", WORKSPACE_ID, [
      "search_index_rebuilt"
    ]);
    expectActivity(connection, "workspace", WORKSPACE_ID, [
      "database_maintenance_run"
    ]);
  });
});

function createServices(input: {
  connection: DatabaseConnection;
  idFactory: (prefix: string) => string;
  now: () => Date;
}) {
  return {
    category: new CategoryService(input),
    collection: new CollectionService(input),
    contact: new ContactService(input),
    dailyPlan: new DailyPlanService(input),
    file: new FileAttachmentService(input),
    item: new ItemService(input),
    link: new LinkService(input),
    list: new ListService(input),
    note: new NoteService(input),
    project: new ProjectService(input),
    relationship: new RelationshipService(input),
    savedView: new SavedViewService(input),
    tag: new TagService(input),
    task: new TaskService(input)
  };
}

function expectActivity(
  connection: DatabaseConnection,
  targetType: string,
  targetId: string,
  expectedActions: string[]
): ActivityLogRecord[] {
  const events = new ActivityLogRepository(connection).listForTarget(
    targetType,
    targetId,
    40
  );

  expect(events.map((event) => event.action)).toEqual(
    expect.arrayContaining(expectedActions)
  );
  for (const action of expectedActions) {
    const event = events.find((candidate) => candidate.action === action);
    expect(event, `${targetType}:${targetId} missing ${action}`).toBeDefined();
    expect(event?.summary?.trim().length).toBeGreaterThan(0);
  }

  return events;
}

function expectSearch(
  connection: DatabaseConnection,
  targetType: string,
  targetId: string
) {
  const record = new SearchIndexRepository(connection).getByTarget({
    workspaceId: WORKSPACE_ID,
    targetType,
    targetId
  });

  expect(record, `${targetType}:${targetId} missing search record`).not.toBeNull();

  return expect(record!);
}
