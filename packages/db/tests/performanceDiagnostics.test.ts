import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ActivityLogRepository,
  ContainerRepository,
  ItemRepository,
  ListRepository,
  NoteRepository,
  PerformanceFixtureService,
  SearchIndexRepository,
  SlowQueryLogger,
  TaskRepository,
  type DatabaseConnection
} from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("performance diagnostics", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("logs slow query timings to the configured local sink", () => {
    const entries: unknown[] = [];
    let tick = 0;
    const logger = new SlowQueryLogger({
      thresholdMs: 10,
      sink: (entry) => entries.push(entry),
      clock: {
        now: () => new Date("2026-04-30T00:00:00.000Z"),
        monotonicNow: () => {
          tick += 12;
          return tick;
        }
      }
    });

    expect(logger.time("test.slow", () => "ok", { rows: 20 })).toBe("ok");

    expect(entries).toEqual([
      {
        label: "test.slow",
        elapsedMs: 12,
        thresholdMs: 10,
        timestamp: "2026-04-30T00:00:00.000Z",
        metadata: { rows: 20 }
      }
    ]);
  });

  it("seeds a large local workspace fixture for search and activity QA", () => {
    const result = new PerformanceFixtureService({ connection }).seedLargeWorkspace({
      workspaceId: "workspace_1",
      itemCount: 150,
      containerCount: 3,
      idPrefix: "qa",
      timestamp: "2026-04-30T00:00:00.000Z"
    });

    expect(result).toEqual({
      workspaceId: "workspace_1",
      containerCount: 3,
      itemCount: 150,
      taskCount: 120,
      noteCount: 15,
      listCount: 15,
      listItemCount: 45,
      searchRecordCount: 150,
      activityEventCount: 150
    });
    expect(
      new ContainerRepository(connection).listByWorkspace("workspace_1")
    ).toHaveLength(3);
    expect(
      new ItemRepository(connection).listByWorkspace("workspace_1", {
        limit: 200
      })
    ).toHaveLength(150);
    expect(
      new SearchIndexRepository(connection).search("workspace_1", "fixture", {
        limit: 200
      })
    ).toHaveLength(150);
    expect(
      new TaskRepository(connection).listDetailsByWorkspace("workspace_1")
    ).toHaveLength(120);
    expect(
      new NoteRepository(connection).listByWorkspace("workspace_1")
    ).toHaveLength(15);
    expect(
      new ListRepository(connection).listDetailsByWorkspace("workspace_1")
    ).toHaveLength(15);
    expect(
      new ListRepository(connection).listItemsByWorkspace("workspace_1")
    ).toHaveLength(45);
    expect(
      new ActivityLogRepository(connection).listRecentPage("workspace_1", {
        limit: 25
      })
    ).toMatchObject({ events: expect.any(Array), hasMore: true });
  });
});
