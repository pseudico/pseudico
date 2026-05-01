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
import { ProjectService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("ProjectService", () => {
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

  it("creates an active project with a Main tab, activity event, and search record", async () => {
    const result = await createService().createProject({
      workspaceId: "workspace_1",
      name: "Launch Plan",
      description: "Supplier checklist"
    });

    expect(result.project).toMatchObject({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      description: "Supplier checklist",
      status: "active",
      isSystem: false
    });
    expect(result.defaultTab).toMatchObject({
      id: "container_tab_2",
      containerId: "container_1",
      name: "Main",
      isDefault: true
    });
    expect(result.searchRecord).toMatchObject({
      id: "search_4",
      targetType: "container",
      targetId: "container_1",
      title: "Launch Plan",
      body: "Supplier checklist",
      isDeleted: false
    });
    expect(new ContainerRepository(connection).getById("container_1")).toEqual(
      result.project
    );
    expect(new ContainerTabRepository(connection).findDefaultTab("container_1"))
      .toEqual(result.defaultTab);
    expect(new ActivityLogRepository(connection).listForTarget(
      "container",
      "container_1"
    )).toMatchObject([
      {
        id: "activity_3",
        action: "container_created",
        targetType: "container"
      }
    ]);
  });

  it("updates searchable project fields and records activity", async () => {
    const service = createService();
    const created = await service.createProject({
      workspaceId: "workspace_1",
      name: "Launch Plan",
      description: "Supplier checklist"
    });

    const updated = await service.updateProject({
      projectId: created.project.id,
      name: "Launch Plan Revised",
      description: "Board approval notes",
      status: "waiting"
    });

    expect(updated).toMatchObject({
      name: "Launch Plan Revised",
      description: "Board approval notes",
      status: "waiting"
    });
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "container",
      targetId: created.project.id
    })).toMatchObject({
      title: "Launch Plan Revised",
      body: "Board approval notes"
    });
    expect(new ActivityLogRepository(connection).listForTarget(
      "container",
      created.project.id
    )).toMatchObject([
      { action: "container_created" },
      { action: "container_updated" }
    ]);
  });

  it("archives and soft-deletes projects without returning them in active lists", async () => {
    const service = createService();
    const first = await service.createProject({
      workspaceId: "workspace_1",
      name: "First Project"
    });
    const second = await service.createProject({
      workspaceId: "workspace_1",
      name: "Second Project"
    });

    const archived = await service.archiveProject(first.project.id);
    const deleted = await service.softDeleteProject(second.project.id);

    expect(archived).toMatchObject({
      status: "archived",
      archivedAt: "2026-05-01T00:00:00.000Z"
    });
    expect(deleted.deletedAt).toBe("2026-05-01T00:00:00.000Z");
    expect(service.listProjects("workspace_1")).toEqual([]);
    expect(service.getProject(second.project.id)).toBeNull();
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "container",
      targetId: second.project.id
    })).toMatchObject({
      isDeleted: true
    });
    expect(new ActivityLogRepository(connection).listForTarget(
      "container",
      second.project.id
    )).toMatchObject([
      { action: "container_created" },
      { action: "container_deleted" }
    ]);
  });

  it("generates workspace-unique project slugs", async () => {
    const service = createService();

    const first = await service.createProject({
      workspaceId: "workspace_1",
      name: "Launch Plan"
    });
    const second = await service.createProject({
      workspaceId: "workspace_1",
      name: "Launch Plan"
    });

    expect(first.project.slug).toBe("launch-plan");
    expect(second.project.slug).toBe("launch-plan-2");
  });
});

function createService(): ProjectService {
  return new ProjectService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-01T00:00:00.000Z")
  });
}

