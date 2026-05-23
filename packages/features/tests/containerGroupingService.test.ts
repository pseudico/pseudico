import { ActivityAction } from "@local-work-os/core";
import {
  ActivityLogRepository,
  AppSettingsRepository,
  CategoryRepository,
  ContainerGroupingRepository,
  MigrationService,
  TagRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerGroupingService,
  ProjectService,
  ContactService,
  createContainerGroupingSettingKey
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("ContainerGroupingService", () => {
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
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("groups projects by status, category, tag, favorite, and stale facets", async () => {
    seedCategory("category_ops", "Operations");
    seedTag("tag_launch", "Launch", "launch");
    const projects = createProjectService();
    const launch = await projects.createProject({
      workspaceId: "workspace_1",
      name: "Launch Plan",
      categoryId: "category_ops",
      isFavorite: true
    });
    await projects.createProject({
      workspaceId: "workspace_1",
      name: "Old Backlog"
    });
    await projects.updateProject({
      projectId: launch.project.id,
      status: "waiting"
    });
    tagContainer(launch.project.id, "tag_launch");

    const service = createGroupingService();

    expect(
      service.getViewModel({
        workspaceId: "workspace_1",
        containerType: "project",
        mode: "status"
      }).groups.map((group) => [group.key, group.count])
    ).toEqual([
      ["status:active", 1],
      ["status:waiting", 1]
    ]);
    expect(
      service.getViewModel({
        workspaceId: "workspace_1",
        containerType: "project",
        mode: "category"
      }).groups.map((group) => group.label)
    ).toEqual(["Operations", "Uncategorized"]);
    expect(
      service.getViewModel({
        workspaceId: "workspace_1",
        containerType: "project",
        mode: "tag"
      }).groups.map((group) => group.label)
    ).toEqual(["#Launch", "Untagged"]);
    expect(
      service.getViewModel({
        workspaceId: "workspace_1",
        containerType: "project",
        mode: "favorite"
      }).groups.map((group) => group.label)
    ).toEqual(["Favourites", "Not pinned"]);
    expect(
      service.getViewModel({
        workspaceId: "workspace_1",
        containerType: "project",
        mode: "stale",
        staleAfterDays: 1
      }).groups.map((group) => group.label)
    ).toEqual(["Stale (1+ days)"]);
  });

  it("groups contacts by company, labels, tags, and categories", async () => {
    seedCategory("category_client", "Clients");
    seedTag("tag_vip", "VIP", "vip");
    const contacts = createContactService();
    const alex = await contacts.createContact({
      workspaceId: "workspace_1",
      name: "Alex Chen",
      categoryId: "category_client",
      fields: [
        { label: "Company", value: "Acme" },
        { label: "Role", value: "Sponsor" }
      ]
    });
    await contacts.createContact({
      workspaceId: "workspace_1",
      name: "No Company"
    });
    tagContainer(alex.contact.id, "tag_vip");

    const service = createGroupingService();

    expect(
      service.getViewModel({
        workspaceId: "workspace_1",
        containerType: "contact",
        mode: "company"
      }).groups.map((group) => [group.label, group.count])
    ).toEqual([
      ["Acme", 1],
      ["No company", 1]
    ]);
    expect(
      service.getViewModel({
        workspaceId: "workspace_1",
        containerType: "contact",
        mode: "label"
      }).groups.map((group) => group.label)
    ).toEqual(["Company: Acme", "Role: Sponsor", "No labels"]);
    expect(
      service.getViewModel({
        workspaceId: "workspace_1",
        containerType: "contact",
        mode: "tag"
      }).groups.map((group) => group.label)
    ).toEqual(["#VIP", "Untagged"]);
    expect(
      service.getViewModel({
        workspaceId: "workspace_1",
        containerType: "contact",
        mode: "category"
      }).groups.map((group) => group.label)
    ).toEqual(["Clients", "Uncategorized"]);
  });

  it("persists grouping mode and collapsed groups with activity coverage", async () => {
    const service = createGroupingService();

    const saved = await service.updatePreferences({
      workspaceId: "workspace_1",
      containerType: "project",
      mode: "tag",
      collapsedGroupKeys: ["tag:vip", "tag:vip", " "]
    });

    expect(saved).toMatchObject({
      mode: "tag",
      collapsedGroupKeys: ["tag:vip"]
    });
    expect(
      new AppSettingsRepository(connection).findByKey({
        workspaceId: "workspace_1",
        settingKey: createContainerGroupingSettingKey("project")
      })
    ).toBeTruthy();
    expect(new ActivityLogRepository(connection).listRecent("workspace_1", 5)[0]).toMatchObject({
      action: ActivityAction.workspacePreferencesUpdated,
      targetType: "workspace"
    });
  });

  it("uses batched facet reads for a large seeded project library", async () => {
    const projects = createProjectService();

    for (let index = 0; index < 750; index += 1) {
      await projects.createProject({
        workspaceId: "workspace_1",
        name: `Seed Project ${String(index).padStart(3, "0")}`,
        isFavorite: index % 10 === 0
      });
    }

    const startedAt = performance.now();
    const viewModel = createGroupingService().getViewModel({
      workspaceId: "workspace_1",
      containerType: "project",
      mode: "favorite"
    });

    expect(viewModel.totalCount).toBe(750);
    expect(viewModel.groups.map((group) => group.count)).toEqual([75, 675]);
    expect(performance.now() - startedAt).toBeLessThan(250);
    expect(
      new ContainerGroupingRepository(connection).listTargets({
        workspaceId: "workspace_1",
        containerType: "project"
      })
    ).toHaveLength(750);
  }, 60_000);
});

function createProjectService(): ProjectService {
  return new ProjectService({
    connection,
    idFactory: nextId,
    now: () => new Date("2026-05-01T00:00:00.000Z")
  });
}

function createContactService(): ContactService {
  return new ContactService({
    connection,
    idFactory: nextId,
    now: () => new Date("2026-05-01T00:00:00.000Z")
  });
}

function createGroupingService(): ContainerGroupingService {
  return new ContainerGroupingService({
    connection,
    idFactory: nextId,
    now: () => new Date("2026-06-15T00:00:00.000Z")
  });
}

function seedCategory(id: string, name: string): void {
  new CategoryRepository(connection).create({
    id,
    workspaceId: "workspace_1",
    name,
    slug: name.toLowerCase(),
    color: "#335c67",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
}

function seedTag(id: string, name: string, slug: string): void {
  new TagRepository(connection).create({
    id,
    workspaceId: "workspace_1",
    name,
    slug,
    timestamp: "2026-05-01T00:00:00.000Z"
  });
}

function tagContainer(containerId: string, tagId: string): void {
  new TagRepository(connection).createTagging({
    id: nextId("tagging"),
    workspaceId: "workspace_1",
    tagId,
    targetType: "container",
    targetId: containerId,
    source: "manual",
    timestamp: "2026-05-01T00:00:00.000Z"
  });
}

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
