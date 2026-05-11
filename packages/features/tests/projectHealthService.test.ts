import {
  ContainerRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoteService, ProjectHealthService, TaskService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("ProjectHealthService", () => {
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
    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    new ContainerRepository(connection).create({
      id: "container_project_2",
      workspaceId: "workspace_1",
      type: "project",
      name: "Quiet Project",
      slug: "quiet-project",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("computes task counts, next due task, and recent project activity", async () => {
    const taskService = createTaskService();
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Past due",
      dueAt: "2026-05-03"
    });
    const nextDue = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Next due",
      dueAt: "2026-05-05"
    });
    const completed = await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Done task"
    });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Waiting task",
      status: "waiting",
      dueAt: "2026-05-06"
    });
    await taskService.completeTask(completed.item.id);
    await createNoteService().createNote({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Launch note",
      content: "Recent project note."
    });

    const health = createService().getProjectHealth("container_project_1");

    expect(health).toMatchObject({
      projectId: "container_project_1",
      name: "Launch Plan",
      openTaskCount: 3,
      completedTaskCount: 1,
      overdueTaskCount: 1,
      upcomingTaskCount: 2,
      waitingTaskCount: 1,
      totalTaskCount: 4,
      completionRatio: 0.25,
      isStale: false,
      hasRecentActivity: true,
      nextDueTask: {
        itemId: nextDue.item.id,
        title: "Next due",
        dueAt: "2026-05-05T00:00:00.000Z"
      }
    });
    expect(health.nextTask).toMatchObject({
      title: "Past due",
      dueAt: "2026-05-03T00:00:00.000Z"
    });
    expect(health.healthBadges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "overdue", label: "1 overdue" }),
        expect.objectContaining({ kind: "waiting", label: "1 waiting" }),
        expect.objectContaining({ kind: "upcoming", label: "2 upcoming" })
      ])
    );
    expect(health.recentActivity[0]).toMatchObject({
      action: "note_created",
      description: "Created note \"Launch note\"."
    });
  });

  it("flags stale projects with no recent activity using a configurable threshold", async () => {
    const health = createService().getProjectHealth("container_project_2", {
      staleAfterDays: 1
    });

    expect(health).toMatchObject({
      projectId: "container_project_2",
      staleAfterDays: 1,
      isStale: true,
      hasRecentActivity: false,
      lastActivityAt: null
    });
    expect(health.healthBadges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "stale", label: "Stale" }),
        expect.objectContaining({ kind: "no_recent_activity" })
      ])
    );
  });

  it("orders project health summaries by attention and limit", async () => {
    await createTaskService().createTask({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Past due",
      dueAt: "2026-05-03"
    });

    const summaries = createService().listProjectHealthSummaries({
      workspaceId: "workspace_1",
      limit: 1
    });

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      projectId: "container_project_1",
      overdueTaskCount: 1
    });
  });

  it("summarizes many projects within the bounded health limit", async () => {
    const repository = new ContainerRepository(connection);
    for (let index = 0; index < 120; index += 1) {
      repository.create({
        id: `container_project_many_${index}`,
        workspaceId: "workspace_1",
        type: "project",
        name: `Many Project ${index}`,
        slug: `many-project-${index}`,
        timestamp: "2026-05-01T00:00:00.000Z"
      });
    }

    const summaries = createService().listProjectHealthSummaries({
      workspaceId: "workspace_1",
      limit: 250,
      staleAfterDays: 30
    });

    expect(summaries).toHaveLength(100);
    expect(summaries.every((summary) => summary.healthBadges.length >= 0)).toBe(true);
  });
});

function createService(): ProjectHealthService {
  return new ProjectHealthService({
    connection,
    now: () => new Date("2026-05-04T09:30:00.000Z")
  });
}

function createTaskService(): TaskService {
  return new TaskService({
    connection,
    idFactory: nextId,
    now: () => new Date("2026-05-04T09:30:00.000Z")
  });
}

function createNoteService(): NoteService {
  return new NoteService({
    connection,
    idFactory: nextId,
    now: () => new Date("2026-05-04T10:30:00.000Z")
  });
}

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
