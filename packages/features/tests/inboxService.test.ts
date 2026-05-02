import {
  ActivityLogRepository,
  ContainerRepository,
  ContainerTabRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InboxService, ItemService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("InboxService", () => {
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
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    connection.sqlite
      .prepare(
        `insert into categories (
          id,
          workspace_id,
          name,
          slug,
          color,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "category_1",
        "workspace_1",
        "Operations",
        "operations",
        "#245c55",
        "2026-05-02T00:00:00.000Z",
        "2026-05-02T00:00:00.000Z"
      );
    new ContainerRepository(connection).createSystemInbox({
      id: "container_inbox",
      workspaceId: "workspace_1",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    new ContainerTabRepository(connection).ensureDefaultTab({
      id: "container_tab_inbox",
      workspaceId: "workspace_1",
      containerId: "container_inbox",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    new ContainerTabRepository(connection).ensureDefaultTab({
      id: "container_tab_project_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("locates the system Inbox and lists active Inbox items", async () => {
    const item = await createItemService().createItem({
      workspaceId: "workspace_1",
      containerId: "container_inbox",
      type: "note",
      title: "Captured note",
      body: "Sort this later"
    });

    const service = createInboxService();

    expect(service.getInbox("workspace_1")).toMatchObject({
      id: "container_inbox",
      type: "inbox",
      isSystem: true
    });
    expect(service.listInboxItems("workspace_1")).toEqual([item.item]);
  });

  it("moves Inbox items to an active project through ItemService", async () => {
    const source = await createItemService().createItem({
      workspaceId: "workspace_1",
      containerId: "container_inbox",
      containerTabId: "container_tab_inbox",
      type: "task",
      title: "Call supplier",
      body: "Preserve the triage notes",
      categoryId: "category_1",
      pinned: true,
      status: "waiting"
    });

    const moved = await createInboxService().moveInboxItemToProject({
      itemId: source.item.id,
      projectId: "container_project_1"
    });

    expect(moved.item).toMatchObject({
      id: source.item.id,
      containerId: "container_project_1",
      containerTabId: "container_tab_project_1",
      title: "Call supplier",
      body: "Preserve the triage notes",
      categoryId: "category_1",
      pinned: true,
      status: "waiting"
    });
    expect(createInboxService().listInboxItems("workspace_1")).toEqual([]);
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: source.item.id
    })).toMatchObject({
      title: "Call supplier",
      body: "Preserve the triage notes"
    });
    expect(
      JSON.parse(
        new SearchIndexRepository(connection).getByTarget({
          workspaceId: "workspace_1",
          targetType: "item",
          targetId: source.item.id
        })!.metadataJson
      )
    ).toMatchObject({
      containerId: "container_project_1",
      containerTabId: "container_tab_project_1"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", source.item.id)
        .map((entry) => entry.action)
    ).toContain("item_moved");
  });

  it("rejects non-Inbox items and archived project targets", async () => {
    const item = await createItemService().createItem({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "task",
      title: "Already filed"
    });

    await expect(
      createInboxService().moveInboxItemToProject({
        itemId: item.item.id,
        projectId: "container_project_1"
      })
    ).rejects.toThrow("Item is not in the Inbox.");

    const inboxItem = await createItemService().createItem({
      workspaceId: "workspace_1",
      containerId: "container_inbox",
      type: "task",
      title: "Move later"
    });
    new ContainerRepository(connection).archive(
      "container_project_1",
      "2026-05-02T01:00:00.000Z"
    );

    await expect(
      createInboxService().moveInboxItemToProject({
        itemId: inboxItem.item.id,
        projectId: "container_project_1"
      })
    ).rejects.toThrow("Inbox items can only be moved to active projects.");
  });
});

function createInboxService(): InboxService {
  return new InboxService({
    connection,
    idFactory: createTestId,
    now: () => new Date("2026-05-02T00:00:00.000Z")
  });
}

function createItemService(): ItemService {
  return new ItemService({
    connection,
    idFactory: createTestId,
    now: () => new Date("2026-05-02T00:00:00.000Z")
  });
}

function createTestId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
