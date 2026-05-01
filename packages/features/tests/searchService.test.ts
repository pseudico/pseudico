import {
  ContainerRepository,
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
