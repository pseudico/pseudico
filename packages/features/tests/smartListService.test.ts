import {
  ActivityLogRepository,
  ContainerRepository,
  MigrationService,
  SavedViewRepository,
  SearchIndexRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SmartListService,
  TaskService,
  mapFormToSavedViewQuery
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("SmartListService", () => {
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
      timestamp: "2026-05-03T00:00:00.000Z"
    });
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-05-03T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("maps flat editor criteria to a saved-view query without nested groups", () => {
    expect(
      mapFormToSavedViewQuery(
        {
          itemTypes: ["task"],
          containerTypes: ["project"],
          tagSlugs: ["finance"],
          categoryIds: ["category_1"],
          taskStatuses: ["waiting"],
          dueFilter: "next7Days"
        },
        new Date("2026-05-08T12:00:00.000Z")
      )
    ).toMatchObject({
      version: 1,
      match: "all",
      targets: ["item"],
      conditions: [
        { field: "itemType", operator: "is", value: "task" },
        { field: "containerType", operator: "is", value: "project" },
        { field: "tag", operator: "has", value: "finance" },
        { field: "category", operator: "is", value: "category_1" },
        { field: "taskStatus", operator: "is", value: "waiting" },
        {
          field: "dueDate",
          operator: "between",
          value: {
            from: "2026-05-08T00:00:00.000Z",
            to: "2026-05-14T23:59:59.999Z"
          }
        }
      ]
    });
  });

  it("previews and saves smart lists as smart_list saved views with activity and search", async () => {
    await createTask("Call accountant @finance", "waiting", "2026-05-08T09:00:00.000Z");
    await createTask("Send supplier recap @ops", "open", "2026-05-20T09:00:00.000Z");
    const service = createService();
    const criteria = {
      itemTypes: ["task" as const],
      containerTypes: ["project" as const],
      tagSlugs: ["finance"],
      taskStatuses: ["waiting" as const],
      dueFilter: "today" as const
    };
    const preview = service.previewSmartList({
      workspaceId: "workspace_1",
      criteria
    });

    expect(preview.results).toMatchObject([
      {
        kind: "task",
        title: "Call accountant @finance",
        taskStatus: "waiting",
        tags: ["finance"]
      }
    ]);

    const created = await service.createSmartList({
      workspaceId: "workspace_1",
      name: "Waiting finance today",
      criteria
    });

    expect(created.smartList).toMatchObject({
      name: "Waiting finance today"
    });
    expect(created.smartList.id).toMatch(/^saved_view_/);
    expect(
      new SavedViewRepository(connection).getById(created.smartList.id)
    ).toMatchObject({
      type: "smart_list",
      name: "Waiting finance today"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("saved_view", created.smartList.id)
        .map((event) => event.action)
    ).toEqual(["saved_view_created"]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "saved_view",
        targetId: created.smartList.id
      })
    ).toMatchObject({
      title: "Waiting finance today",
      body: "smart_list"
    });
  });

  it("updates smart-list criteria and preserves the persisted type", async () => {
    const service = createService();
    const created = await service.createSmartList({
      workspaceId: "workspace_1",
      name: "Open tasks",
      criteria: {
        taskStatuses: ["open"]
      }
    });

    const updated = await service.updateSmartList({
      smartListId: created.smartList.id,
      name: "Due soon",
      criteria: {
        dueFilter: "next30Days"
      }
    });

    expect(updated.smartList).toMatchObject({
      id: created.smartList.id,
      name: "Due soon"
    });
    expect(updated.smartList.query.conditions).toMatchObject([
      {
        field: "dueDate",
        operator: "between"
      }
    ]);
    expect(
      new SavedViewRepository(connection).getById(created.smartList.id)
    ).toMatchObject({
      type: "smart_list"
    });
  });
});

function createService(): SmartListService {
  return new SmartListService({
    connection,
    idFactory,
    now: () => new Date("2026-05-08T12:00:00.000Z")
  });
}

async function createTask(
  title: string,
  taskStatus: "open" | "waiting",
  dueAt: string
): Promise<void> {
  const task = await new TaskService({
    connection,
    idFactory,
    now: () => new Date(dueAt)
  }).createTask({
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    title
  });
  new TaskRepository(connection).updateDetails(task.item.id, {
    taskStatus,
    dueAt,
    timestamp: dueAt
  });
}

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
