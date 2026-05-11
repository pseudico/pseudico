import {
  ActivityLogRepository,
  ContainerRepository,
  MigrationService,
  SavedViewRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ViewModeService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("ViewModeService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({ databasePath: testDb.databasePath });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("persists saved view mode in display JSON without replacing existing display fields", async () => {
    new SavedViewRepository(connection).create({
      id: "saved_view_1",
      workspaceId: "workspace_1",
      type: "collection",
      name: "Launch calls",
      queryJson: JSON.stringify({ version: 1, match: "all", targets: ["item"], conditions: [] }),
      displayJson: JSON.stringify({ collectionKind: "tag", tagSlug: "launch" }),
      timestamp: "2026-05-01T00:00:00.000Z"
    });

    const result = await createService().setViewMode({
      contextType: "saved_view",
      contextId: "saved_view_1",
      mode: "calendar"
    });

    expect(result.mode).toBe("calendar");
    expect(createService().getViewMode("saved_view", "saved_view_1").mode).toBe("calendar");
    const savedView = new SavedViewRepository(connection).getById("saved_view_1");
    expect(JSON.parse(savedView?.displayJson ?? "{}")).toMatchObject({
      collectionKind: "tag",
      tagSlug: "launch",
      viewMode: "calendar"
    });
  });

  it("persists project/contact container mode as a local setting and logs activity", async () => {
    new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-05-01T00:00:00.000Z"
    });

    expect(createService().getViewMode("container", "container_1").mode).toBe("list");
    await createService().setViewMode({
      contextType: "container",
      contextId: "container_1",
      mode: "timeline"
    });

    expect(createService().getViewMode("container", "container_1").mode).toBe("timeline");
    expect(new ActivityLogRepository(connection).listRecent("workspace_1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "workspace_preferences_updated",
          targetType: "container",
          targetId: "container_1"
        })
      ])
    );
  });
});

function createService(): ViewModeService {
  return new ViewModeService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-03T00:00:00.000Z")
  });
}
