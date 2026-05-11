import {
  ActivityLogRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_TODAY_PREFERENCES,
  TodayPreferencesService,
  normalizeTodayPreferencesValue
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = new Date("2026-05-15T09:30:00.000Z");

describe("TodayPreferencesService", () => {
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
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("returns default Top Six-ready Today preferences", () => {
    const service = createService();

    expect(service.getPreferences("workspace_1")).toMatchObject({
      workspaceId: "workspace_1",
      updatedAt: null,
      ...DEFAULT_TODAY_PREFERENCES
    });
  });

  it("persists preferences and records a workspace preference activity event", async () => {
    const service = createService();

    const preferences = await service.updatePreferences({
      workspaceId: "workspace_1",
      planningMode: "ivy_lee",
      maxFocusTasks: 6,
      backlogDays: 21,
      showWaiting: true,
      showDeferred: true,
      showDailyCompletionSummary: false
    });

    expect(preferences).toMatchObject({
      planningMode: "ivy_lee",
      maxFocusTasks: 6,
      backlogDays: 21,
      showWaiting: true,
      showDeferred: true,
      showDailyCompletionSummary: false,
      updatedAt: NOW.toISOString()
    });
    expect(service.getPreferences("workspace_1")).toMatchObject(preferences);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("workspace", "workspace_1")
        .map((event) => event.action)
    ).toContain("workspace_preferences_updated");
  });

  it("caps Top Six and Ivy Lee focus limits at six tasks", async () => {
    const service = createService();

    const topSix = await service.updatePreferences({
      workspaceId: "workspace_1",
      planningMode: "top_six",
      maxFocusTasks: 12
    });

    expect(topSix.maxFocusTasks).toBe(6);
    expect(normalizeTodayPreferencesValue({ planningMode: "ivy_lee", maxFocusTasks: 20 }).maxFocusTasks).toBe(6);
  });

  it("rejects invalid preference values", async () => {
    const service = createService();

    await expect(service.updatePreferences({
      workspaceId: "workspace_1",
      maxFocusTasks: 0
    })).rejects.toThrow("maxFocusTasks must be an integer between 1 and 24.");
    await expect(service.updatePreferences({
      workspaceId: "workspace_1",
      backlogDays: 0
    })).rejects.toThrow("backlogDays must be an integer between 1 and 365.");
  });
});

function createService(): TodayPreferencesService {
  return new TodayPreferencesService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => NOW
  });
}
