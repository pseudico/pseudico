import {
  ContainerRepository,
  ItemRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PinnedFavoritesService, SavedViewService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const TIMESTAMP = "2026-05-09T05:00:00.000Z";

describe("PinnedFavoritesService", () => {
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
      timestamp: TIMESTAMP
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("aggregates favorite containers, pinned items, and favorite saved views", async () => {
    const containers = new ContainerRepository(connection);
    const project = containers.create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      isFavorite: true,
      timestamp: TIMESTAMP
    });
    containers.create({
      id: "container_project_2",
      workspaceId: "workspace_1",
      type: "project",
      name: "Unpinned Project",
      slug: "unpinned-project",
      isFavorite: false,
      timestamp: TIMESTAMP
    });
    new ItemRepository(connection).create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "note",
      title: "Pinned launch note",
      pinned: true,
      timestamp: TIMESTAMP
    });
    await new SavedViewService({
      connection,
      idFactory: (prefix) => `${prefix}_${++idCounter}`,
      now: () => new Date(TIMESTAMP)
    }).createSavedView({
      workspaceId: "workspace_1",
      type: "smart_list",
      name: "Favorite waiting list",
      isFavorite: true,
      query: {
        version: 1,
        match: "all",
        targets: ["item"],
        conditions: [],
        sort: [{ field: "updatedAt", direction: "desc" }]
      }
    });

    const favorites = new PinnedFavoritesService({ connection }).listPinnedFavorites({
      workspaceId: "workspace_1"
    });

    expect(favorites.map((favorite) => favorite.title)).toEqual([
      "Pinned launch note",
      "Launch Plan",
      "Favorite waiting list"
    ]);
    expect(favorites).toEqual([
      expect.objectContaining({
        targetType: "item",
        source: "pinned",
        path: "/projects/container_project_1",
        containerTitle: "Launch Plan"
      }),
      expect.objectContaining({
        targetType: "container",
        source: "favorite",
        path: "/projects/container_project_1"
      }),
      expect.objectContaining({
        targetType: "saved_view",
        source: "favorite",
        path: "/collections"
      })
    ]);
  });
});
