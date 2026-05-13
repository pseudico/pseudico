import {
  DatabaseBootstrapService,
  PerformanceFixtureService,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LARGE_WORKSPACE_BENCHMARK_BUDGETS,
  LargeWorkspaceBenchmarkService,
  getLargeWorkspaceBenchmarkBudgets
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;

describe("LargeWorkspaceBenchmarkService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    let seedId = 0;
    new DatabaseBootstrapService({
      now: () => new Date("2026-05-01T00:00:00.000Z"),
      idFactory: (prefix) => `${prefix}_seed_${++seedId}`
    }).bootstrapConnection(connection, {
      workspaceId: "workspace_1",
      workspaceName: "Benchmark Workspace"
    });
    new PerformanceFixtureService({ connection }).seedLargeWorkspace({
      workspaceId: "workspace_1",
      itemCount: 120,
      containerCount: 4,
      idPrefix: "bench",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("defines budgets for the 1k, 10k, and 100k benchmark scales", () => {
    expect(LARGE_WORKSPACE_BENCHMARK_BUDGETS.map((budget) => budget.itemCount)).toEqual([
      1_000,
      10_000,
      100_000
    ]);
    expect(getLargeWorkspaceBenchmarkBudgets(100_000).budgets.export.maxMs).toBeGreaterThan(
      getLargeWorkspaceBenchmarkBudgets(1_000).budgets.export.maxMs
    );
  });

  it("runs a deterministic benchmark smoke pass against seeded local data", () => {
    let tick = 0;
    const result = new LargeWorkspaceBenchmarkService({
      connection,
      now: () => new Date("2026-05-01T00:00:00.000Z"),
      timer: {
        now: () => {
          tick += 5;
          return tick;
        }
      }
    }).run({
      workspaceId: "workspace_1",
      itemCount: 1_000,
      date: "2026-05-01T00:00:00.000Z",
      operations: ["open", "search", "dashboard", "today", "export"]
    });

    expect(result).toMatchObject({
      workspaceId: "workspace_1",
      itemCount: 1_000,
      generatedAt: "2026-05-01T00:00:00.000Z",
      passed: true
    });
    expect(result.operations.map((operation) => operation.operation)).toEqual([
      "open",
      "search",
      "dashboard",
      "today",
      "export"
    ]);
    expect(result.operations.every((operation) => operation.elapsedMs === 5)).toBe(
      true
    );
    expect(result.operations.find((operation) => operation.operation === "search")).toMatchObject({
      rowCount: 25,
      passedBudget: true
    });
    expect(result.operations.find((operation) => operation.operation === "export")?.rowCount).toBeGreaterThan(
      120
    );
  });
});
