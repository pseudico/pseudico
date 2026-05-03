import {
  ContainerRepository,
  ItemRepository,
  ListRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SearchService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("SearchService", () => {
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

  it("indexes and searches containers through the feature-facing service", () => {
    const container = new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      description: "Supplier checklist",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const service = createService();

    service.upsertContainer(container, {
      tags: ["ops"],
      category: "Work"
    });

    expect(
      service.searchWorkspace({
        workspaceId: "workspace_1",
        query: "supplier"
      })
    ).toMatchObject([
      {
        targetType: "container",
        targetId: "container_1",
        title: "Launch Plan",
        tags: "ops",
        category: "Work"
      }
    ]);
  });

  it("hydrates searchable records and excludes archived or deleted sources by default", () => {
    const containerRepository = new ContainerRepository(connection);
    const project = containerRepository.create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      description: "Supplier checklist",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const archivedProject = containerRepository.create({
      id: "container_archived",
      workspaceId: "workspace_1",
      type: "project",
      name: "Archived Launch",
      slug: "archived-launch",
      description: "Old supplier notes",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const itemRepository = new ItemRepository(connection);
    const task = itemRepository.create({
      id: "item_task_1",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "task",
      title: "Call supplier",
      body: "Confirm the launch room",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const archivedTask = itemRepository.create({
      id: "item_task_archived",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "task",
      title: "Archived supplier call",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const deletedTask = itemRepository.create({
      id: "item_task_deleted",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "task",
      title: "Deleted supplier call",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const service = createService();

    service.upsertContainer(project, { tags: ["ops"], category: "Work" });
    service.upsertContainer(
      containerRepository.archive(
        archivedProject.id,
        "2026-04-30T01:00:00.000Z"
      )
    );
    service.upsertItem(task, { tags: ["supplier"], category: "Work" });
    service.upsertItem(
      itemRepository.archive(archivedTask.id, "2026-04-30T01:00:00.000Z")
    );
    service.upsertItem(
      itemRepository.softDelete(deletedTask.id, "2026-04-30T01:00:00.000Z")
    );

    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "supplier"
      })
    ).toMatchObject([
      {
        targetType: "item",
        targetId: "item_task_1",
        kind: "task",
        title: "Call supplier",
        containerTitle: "Launch Plan",
        destinationPath: "/projects/container_1",
        tags: ["supplier"],
        category: "Work"
      },
      {
        targetType: "container",
        targetId: "container_1",
        kind: "project",
        title: "Launch Plan",
        destinationPath: "/projects/container_1"
      }
    ]);
    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "supplier",
        includeArchived: true,
        includeDeleted: true
      })
    ).toHaveLength(4);
    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "archived",
        includeArchived: true
      })
    ).toHaveLength(2);
  });

  it("filters hydrated search results by source kind and hydrates checklist rows", () => {
    const project = new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const itemRepository = new ItemRepository(connection);
    const list = itemRepository.create({
      id: "item_list_1",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "list",
      title: "Supplier checklist",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const listRepository = new ListRepository(connection);
    listRepository.createDetails({
      itemId: list.id,
      workspaceId: "workspace_1",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const listItem = listRepository.createListItem({
      id: "list_item_1",
      workspaceId: "workspace_1",
      listId: list.id,
      title: "Confirm supplier copy",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const service = createService();

    service.upsertItem(list);
    service.upsertListItem(listItem);

    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "supplier",
        kinds: ["list_item"]
      })
    ).toMatchObject([
      {
        targetType: "list_item",
        targetId: "list_item_1",
        kind: "list_item",
        parentItemId: "item_list_1",
        parentItemTitle: "Supplier checklist",
        containerTitle: "Launch Plan",
        destinationPath: "/projects/container_1"
      }
    ]);
  });
});

function createService(): SearchService {
  return new SearchService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-04-30T00:00:00.000Z")
  });
}
