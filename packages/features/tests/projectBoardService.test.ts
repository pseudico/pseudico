import {
  ActivityLogRepository,
  CategoryRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectBoardService, ProjectService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("ProjectBoardService", () => {
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

  it("groups project cards by local status columns", async () => {
    const projects = createProjectService();
    await projects.createProject({
      workspaceId: "workspace_1",
      name: "Launch Plan"
    });
    const waiting = await projects.createProject({
      workspaceId: "workspace_1",
      name: "Supplier Follow-up"
    });
    await projects.updateProject({
      projectId: waiting.project.id,
      status: "waiting"
    });

    const board = createBoardService().getBoard({ workspaceId: "workspace_1" });

    expect(board.grouping).toBe("status");
    expect(board.projectCount).toBe(2);
    expect(board.columns.map((column) => column.id)).toEqual([
      "active",
      "waiting",
      "completed"
    ]);
    expect(board.columns.find((column) => column.id === "active")?.projects)
      .toMatchObject([{ name: "Launch Plan", columnId: "active" }]);
    expect(board.columns.find((column) => column.id === "waiting")?.projects)
      .toMatchObject([{ name: "Supplier Follow-up", columnId: "waiting" }]);
  });

  it("moves a project between status columns with activity and search updates", async () => {
    const created = await createProjectService().createProject({
      workspaceId: "workspace_1",
      name: "Launch Plan"
    });

    const moved = await createBoardService().moveProjectCard({
      projectId: created.project.id,
      targetColumnId: "waiting",
      grouping: "status"
    });

    expect(moved.status).toBe("waiting");
    expect(new ActivityLogRepository(connection).listForTarget(
      "container",
      created.project.id
    )).toMatchObject([
      { action: "container_created" },
      { action: "container_updated" }
    ]);
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "container",
      targetId: created.project.id
    })).toMatchObject({ title: "Launch Plan", isDeleted: false });
  });

  it("groups and moves projects by local category columns", async () => {
    new CategoryRepository(connection).create({
      id: "category_ops",
      workspaceId: "workspace_1",
      name: "Operations",
      slug: "operations",
      color: "#335c67",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    const created = await createProjectService().createProject({
      workspaceId: "workspace_1",
      name: "Launch Plan"
    });

    await createBoardService().moveProjectCard({
      projectId: created.project.id,
      targetColumnId: "category_ops",
      grouping: "category"
    });

    const board = createBoardService().getBoard({
      workspaceId: "workspace_1",
      grouping: "category"
    });

    expect(board.columns.map((column) => column.id)).toEqual([
      "uncategorized",
      "category_ops"
    ]);
    expect(board.columns.find((column) => column.id === "category_ops")?.projects)
      .toMatchObject([
        {
          name: "Launch Plan",
          categoryId: "category_ops",
          categoryName: "Operations",
          columnId: "category_ops"
        }
      ]);
  });
});

function createProjectService(): ProjectService {
  return new ProjectService({
    connection,
    idFactory: nextId,
    now: () => new Date("2026-05-01T00:00:00.000Z")
  });
}

function createBoardService(): ProjectBoardService {
  return new ProjectBoardService({
    connection,
    idFactory: nextId,
    now: () => new Date("2026-05-01T00:00:00.000Z")
  });
}

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
