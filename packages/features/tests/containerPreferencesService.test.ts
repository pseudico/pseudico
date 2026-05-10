import { ActivityAction } from "@local-work-os/core";
import {
  ActivityLogRepository,
  AppSettingsRepository,
  ContainerRepository,
  ContainerTabRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CONTAINER_PREFERENCES_SETTING_KEY_PREFIX,
  ContainerPreferencesService,
  DEFAULT_CONTAINER_PREFERENCES,
  createContainerPreferencesSettingKey,
  normalizeContainerPreferencesValue
} from "../src/containers";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const NOW = "2026-05-10T10:00:00.000Z";

describe("ContainerPreferencesService", () => {
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
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("returns safe defaults before a project has persisted preferences", () => {
    const project = createContainerWithTab("project_1", "project", "Launch Plan");
    const service = createService();

    expect(service.getPreferences(project.container.id)).toEqual({
      workspaceId: "workspace_1",
      containerId: "project_1",
      updatedAt: null,
      ...DEFAULT_CONTAINER_PREFERENCES
    });
  });

  it("persists per-container display and default-action preferences in app_settings", async () => {
    const project = createContainerWithTab("project_1", "project", "Launch Plan");
    const service = createService();

    const saved = await service.updatePreferences({
      containerId: project.container.id,
      defaultView: "summary",
      defaultTabId: project.tab.id,
      showCompleted: false,
      grouping: "tab",
      defaultQuickAddType: "note",
      summaryFirst: true,
      compactMode: true
    });

    expect(saved).toEqual({
      workspaceId: "workspace_1",
      containerId: "project_1",
      updatedAt: "2026-05-10T10:01:00.000Z",
      defaultView: "summary",
      defaultTabId: "tab_project_1",
      showCompleted: false,
      grouping: "tab",
      defaultQuickAddType: "note",
      summaryFirst: true,
      compactMode: true
    });
    expect(
      new AppSettingsRepository(connection).findByKey({
        workspaceId: "workspace_1",
        settingKey: createContainerPreferencesSettingKey(project.container.id)
      })?.settingKey
    ).toBe(`${CONTAINER_PREFERENCES_SETTING_KEY_PREFIX}:project_1`);
    expect(createService().getPreferences(project.container.id)).toEqual(saved);
  });

  it("rejects unsupported values and tabs from another container", async () => {
    const project = createContainerWithTab("project_1", "project", "Launch Plan");
    const other = createContainerWithTab("contact_1", "contact", "Alex Chen");
    const service = createService();

    await expect(
      service.updatePreferences({
        containerId: project.container.id,
        defaultView: "board" as "feed"
      })
    ).rejects.toThrow("defaultView must be feed, tab, or summary.");
    await expect(
      service.updatePreferences({
        containerId: project.container.id,
        defaultTabId: other.tab.id
      })
    ).rejects.toThrow("Default tab was not found for this container");
  });

  it("writes an activity event when preferences change", async () => {
    const contact = createContainerWithTab("contact_1", "contact", "Alex Chen");

    await createService().updatePreferences({
      containerId: contact.container.id,
      showCompleted: false,
      compactMode: true
    });

    const events = new ActivityLogRepository(connection).listForTarget(
      "container",
      contact.container.id
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: ActivityAction.workspacePreferencesUpdated,
      summary: 'Updated display preferences for contact "Alex Chen".'
    });
    expect(JSON.parse(events[0]?.afterJson ?? "{}")).toMatchObject({
      showCompleted: false,
      compactMode: true
    });
  });

  it("normalizes malformed stored payloads back to defaults", () => {
    expect(
      normalizeContainerPreferencesValue({
        version: 1,
        defaultView: "calendar",
        defaultTabId: "",
        showCompleted: "yes",
        grouping: "owner",
        defaultQuickAddType: "meeting",
        summaryFirst: "true",
        compactMode: "false"
      })
    ).toEqual(DEFAULT_CONTAINER_PREFERENCES);
  });
});

function createService(): ContainerPreferencesService {
  return new ContainerPreferencesService({
    connection,
    idFactory: (prefix) => `${prefix}_${++idCounter}`,
    now: () => new Date("2026-05-10T10:01:00.000Z")
  });
}

function createContainerWithTab(
  containerId: string,
  type: "project" | "contact",
  name: string
) {
  const container = new ContainerRepository(connection).create({
    id: containerId,
    workspaceId: "workspace_1",
    type,
    name,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    timestamp: NOW
  });
  const tab = new ContainerTabRepository(connection).create({
    id: `tab_${containerId}`,
    workspaceId: "workspace_1",
    containerId,
    name: "Main",
    isDefault: true,
    timestamp: NOW
  });

  return { container, tab };
}
