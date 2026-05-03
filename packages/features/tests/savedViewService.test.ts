import {
  ActivityLogRepository,
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  SavedViewRepository,
  SearchIndexRepository,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SavedViewService,
  validateSavedViewQuery,
  type SavedViewQuery
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const PHONE_CALL_QUERY = {
  version: 1,
  match: "all",
  targets: ["item"],
  conditions: [
    { field: "itemType", operator: "is", value: "task" },
    { field: "tag", operator: "has", value: "phone-call" },
    { field: "taskStatus", operator: "is", value: "waiting" },
    {
      field: "dueDate",
      operator: "between",
      value: {
        from: "2026-05-01T00:00:00.000Z",
        to: "2026-05-31T23:59:59.999Z"
      }
    },
    { field: "text", operator: "contains", value: "supplier" }
  ],
  groupBy: "container",
  sort: [{ field: "dueAt", direction: "asc" }]
} satisfies SavedViewQuery;

describe("SavedViewService", () => {
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
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("validates saved view query v1 inputs", () => {
    expect(validateSavedViewQuery(PHONE_CALL_QUERY)).toMatchObject({ ok: true });
    expect(
      validateSavedViewQuery({
        version: 2,
        match: "all",
        conditions: [{ field: "itemType", operator: "is", value: "project" }]
      })
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        "query.version must be 1.",
        "conditions[0].value includes unsupported item type: project."
      ])
    });
  });

  it("evaluates item metadata, date, text, group, and sort conditions", () => {
    seedEvaluationData();

    const result = createService().evaluateSavedView({
      workspaceId: "workspace_1",
      query: PHONE_CALL_QUERY
    });

    expect(result.results).toMatchObject([
      {
        targetType: "item",
        targetId: "item_1",
        kind: "task",
        title: "Call supplier",
        containerTitle: "Launch Plan",
        taskStatus: "waiting",
        dueAt: "2026-05-05T00:00:00.000Z",
        tags: ["phone-call"]
      }
    ]);
    expect(result.groups).toMatchObject([
      {
        key: "container_1",
        label: "Launch Plan",
        results: [{ targetId: "item_1" }]
      }
    ]);
  });

  it("supports match any, category, container type, and default archived filtering", () => {
    seedEvaluationData();

    const result = createService().evaluateSavedView({
      workspaceId: "workspace_1",
      query: {
        version: 1,
        match: "any",
        conditions: [
          { field: "containerType", operator: "is", value: "project" },
          { field: "category", operator: "is", value: "work" }
        ],
        sort: [{ field: "title", direction: "asc" }]
      }
    });

    expect(result.results.map((entry) => entry.targetId)).toEqual([
      "item_1",
      "item_2",
      "container_1"
    ]);
  });

  it("creates, updates, deletes, logs activity, and indexes saved views", async () => {
    const service = createService();
    const created = await service.createSavedView({
      workspaceId: "workspace_1",
      type: "collection",
      name: " Phone calls ",
      description: "Call follow-ups",
      query: PHONE_CALL_QUERY,
      isFavorite: true
    });

    expect(created.savedView).toMatchObject({
      id: "saved_view_1",
      name: "Phone calls",
      isFavorite: true
    });
    expect(created.searchRecord).toMatchObject({
      targetType: "saved_view",
      targetId: "saved_view_1",
      title: "Phone calls",
      body: "Call follow-ups\ncollection",
      isDeleted: false
    });

    const updated = await service.updateSavedView({
      savedViewId: "saved_view_1",
      name: "Priority calls",
      query: {
        version: 1,
        match: "all",
        conditions: [{ field: "tag", operator: "has", value: "priority" }]
      }
    });

    expect(updated.savedView.name).toBe("Priority calls");
    expect(JSON.parse(updated.savedView.queryJson)).toMatchObject({
      conditions: [{ field: "tag", value: "priority" }]
    });

    const deleted = await service.deleteSavedView("saved_view_1");

    expect(deleted.savedView.deletedAt).toBe("2026-05-03T00:00:00.000Z");
    expect(
      new SavedViewRepository(connection).listByWorkspace("workspace_1")
    ).toHaveLength(0);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "saved_view",
        targetId: "saved_view_1"
      })
    ).toMatchObject({ isDeleted: true });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("saved_view", "saved_view_1")
        .map((event) => event.action)
    ).toEqual(
      expect.arrayContaining([
        "saved_view_deleted",
        "saved_view_updated",
        "saved_view_created"
      ])
    );
  });

  it("can evaluate a persisted saved view by id", async () => {
    seedEvaluationData();
    const service = createService();

    await service.createSavedView({
      workspaceId: "workspace_1",
      type: "smart_list",
      name: "Waiting calls",
      query: PHONE_CALL_QUERY
    });

    expect(service.evaluateSavedViewById("saved_view_1").results).toMatchObject([
      { targetId: "item_1" }
    ]);
  });
});

function createService(): SavedViewService {
  return new SavedViewService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-03T00:00:00.000Z")
  });
}

function seedEvaluationData(): void {
  const category = new CategoryRepository(connection).create({
    id: "category_1",
    workspaceId: "workspace_1",
    name: "Work",
    slug: "work",
    color: "#245c55",
    timestamp: "2026-04-30T00:00:00.000Z"
  });
  const containerRepository = new ContainerRepository(connection);
  const project = containerRepository.create({
    id: "container_1",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    categoryId: category.id,
    timestamp: "2026-04-30T00:00:00.000Z"
  });
  const archivedProject = containerRepository.create({
    id: "container_2",
    workspaceId: "workspace_1",
    type: "project",
    name: "Archived Plan",
    slug: "archived-plan",
    timestamp: "2026-04-30T00:00:00.000Z"
  });
  containerRepository.archive(archivedProject.id, "2026-05-01T00:00:00.000Z");

  const itemRepository = new ItemRepository(connection);
  const task = itemRepository.create({
    id: "item_1",
    workspaceId: "workspace_1",
    containerId: project.id,
    type: "task",
    title: "Call supplier",
    body: "Confirm launch room and quote",
    categoryId: category.id,
    timestamp: "2026-04-30T00:00:00.000Z"
  });
  const laterTask = itemRepository.create({
    id: "item_2",
    workspaceId: "workspace_1",
    containerId: project.id,
    type: "task",
    title: "Email supplier",
    body: "No phone call needed",
    timestamp: "2026-04-30T00:00:00.000Z"
  });

  const taskRepository = new TaskRepository(connection);
  taskRepository.createDetails({
    itemId: task.id,
    workspaceId: "workspace_1",
    taskStatus: "waiting",
    dueAt: "2026-05-05T00:00:00.000Z",
    timestamp: "2026-04-30T00:00:00.000Z"
  });
  taskRepository.createDetails({
    itemId: laterTask.id,
    workspaceId: "workspace_1",
    taskStatus: "open",
    dueAt: "2026-06-01T00:00:00.000Z",
    timestamp: "2026-04-30T00:00:00.000Z"
  });

  const tagRepository = new TagRepository(connection);
  const phoneCall = tagRepository.create({
    id: "tag_1",
    workspaceId: "workspace_1",
    name: "phone-call",
    slug: "phone-call",
    timestamp: "2026-04-30T00:00:00.000Z"
  });
  tagRepository.createTagging({
    id: "tagging_1",
    workspaceId: "workspace_1",
    tagId: phoneCall.id,
    targetType: "item",
    targetId: task.id,
    source: "manual",
    timestamp: "2026-04-30T00:00:00.000Z"
  });
}
