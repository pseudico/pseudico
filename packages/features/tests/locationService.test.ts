import {
  ActivityLogRepository,
  ContainerRepository,
  LocationRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocationService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("LocationService", () => {
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

  it("creates a location item, details row, activity, and searchable address", async () => {
    const result = await createService().createLocation({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      address: "Sydney Opera House",
      latitude: -33.8568,
      longitude: 151.2153,
      viewportZoom: 15
    });

    expect(result.item).toMatchObject({
      id: "item_1",
      type: "location",
      title: "Sydney Opera House",
      body: expect.stringContaining("Sydney Opera House"),
      sortOrder: 1024
    });
    expect(result.location).toMatchObject({
      itemId: "item_1",
      address: "Sydney Opera House",
      latitude: -33.8568,
      longitude: 151.2153,
      viewportCenterLat: -33.8568,
      viewportCenterLng: 151.2153,
      viewportZoom: 15
    });
    expect(new LocationRepository(connection).getByItemId("item_1")).toMatchObject({
      location: { address: "Sydney Opera House" }
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", "item_1")
        .map((event) => event.action)
    ).toEqual(["location_created"]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: "item_1"
      })
    ).toMatchObject({
      title: "Sydney Opera House",
      body: expect.stringContaining("151.2153")
    });
    expect(JSON.parse(result.searchRecord.metadataJson)).toMatchObject({
      type: "location",
      address: "Sydney Opera House",
      viewportZoom: 15
    });
  });

  it("updates location details and builds an external map URL", async () => {
    const service = createService();
    const created = await service.createLocation({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      address: "Old venue"
    });

    const updated = await service.updateLocation({
      itemId: created.item.id,
      address: "New venue",
      latitude: -33.86,
      longitude: 151.2,
      viewportZoom: 12
    });

    expect(updated.item.title).toBe("New venue");
    expect(updated.location).toMatchObject({
      address: "New venue",
      latitude: -33.86,
      longitude: 151.2,
      viewportZoom: 12
    });
    expect(service.buildExternalMapUrl(updated.location)).toBe(
      "https://www.openstreetmap.org/?mlat=-33.86&mlon=151.2#map=12/-33.86/151.2"
    );
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", created.item.id)
        .map((event) => event.action)
    ).toEqual(expect.arrayContaining(["location_created", "location_updated"]));
  });

  it("rejects partial coordinates", async () => {
    await expect(
      createService().createLocation({
        workspaceId: "workspace_1",
        containerId: "container_project_1",
        latitude: -33.86
      })
    ).rejects.toThrow("latitude and longitude must be provided together");
  });
});

function createService(): LocationService {
  return new LocationService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}
