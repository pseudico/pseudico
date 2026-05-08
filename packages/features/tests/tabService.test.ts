import {
  ActivityLogRepository,
  ContainerRepository,
  ContainerTabRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TabService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = "2026-05-01T00:00:00.000Z";

describe("TabService", () => {
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
      schemaVersion: 2,
      timestamp: NOW
    });
    new ContainerRepository(connection).create({
      id: "project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: NOW
    });
    new ContainerTabRepository(connection).createDefaultTab({
      id: "tab_main",
      workspaceId: "workspace_1",
      containerId: "project_1",
      timestamp: NOW
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("creates, renames, reorders, and soft-deletes project/contact tabs through the service layer", async () => {
    const service = createService();

    const research = await service.createTab({
      containerId: "project_1",
      name: "Research"
    });
    const delivery = await service.createTab({
      containerId: "project_1",
      name: "Delivery"
    });
    const renamed = await service.renameTab({
      tabId: research.id,
      name: "Discovery"
    });
    const reordered = await service.reorderTabs({
      containerId: "project_1",
      tabIds: [delivery.id, "tab_main", research.id]
    });
    const deleted = await service.deleteTab({ tabId: delivery.id });

    expect(renamed).toMatchObject({
      id: research.id,
      name: "Discovery",
      updatedAt: NOW
    });
    expect(reordered.map((tab) => [tab.id, tab.sortOrder])).toEqual([
      [delivery.id, 0],
      ["tab_main", 1],
      [research.id, 2]
    ]);
    expect(deleted).toMatchObject({
      id: delivery.id,
      deletedAt: NOW
    });
    expect(service.listTabs("project_1").map((tab) => tab.id)).toEqual([
      "tab_main",
      research.id
    ]);
    expect(
      new ActivityLogRepository(connection).listRecent("workspace_1", 10).map((event) => event.action)
    ).toEqual([
      "container_tab_deleted",
      "container_tab_reordered",
      "container_tab_updated",
      "container_tab_created",
      "container_tab_created"
    ]);
  });

  it("rejects tab operations outside editable project/contact containers", async () => {
    const repository = new ContainerRepository(connection);
    repository.createSystemInbox({
      id: "inbox_1",
      workspaceId: "workspace_1",
      timestamp: NOW
    });
    const service = createService();

    await expect(service.createTab({
      containerId: "inbox_1",
      name: "Inbox Tab"
    })).rejects.toThrow("Tabs can only be managed for projects and contacts.");
    await expect(service.deleteTab({ tabId: "tab_main" })).rejects.toThrow(
      "Default tabs cannot be deleted."
    );
  });
});

function createService(): TabService {
  return new TabService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date(NOW)
  });
}
