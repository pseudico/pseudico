import {
  ContainerRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SearchQueryParser, SearchService, TaskService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("SearchQueryParser", () => {
  it("parses structured tokens into chips and a saved-view query", () => {
    const parsed = new SearchQueryParser().parse(
      "type:task tag:call due:<+7d status:open has:file in:project:launch supplier",
      new Date("2026-05-01T12:00:00.000Z")
    );

    expect(parsed.textQuery).toBe("supplier");
    expect(parsed.chips).toMatchObject([
      { kind: "type", value: "task" },
      { kind: "tag", value: "call" },
      { kind: "due", value: "<+7d" },
      { kind: "status", value: "open" },
      { kind: "has", value: "file" },
      { kind: "in", value: "launch" },
      { kind: "text", value: "supplier" }
    ]);
    expect(parsed.savedViewQuery).toMatchObject({
      version: 1,
      match: "all",
      targets: ["item"],
      conditions: expect.arrayContaining([
        { field: "itemType", operator: "is", value: "task" },
        { field: "tag", operator: "has", value: "call" },
        { field: "dueDate", operator: "before", value: "2026-05-08T00:00:00.000Z" },
        { field: "taskStatus", operator: "is", value: "open" },
        { field: "attachment", operator: "has" }
      ])
    });
  });

  it("offers structured syntax suggestions", () => {
    expect(new SearchQueryParser().getSuggestions("ty").map((entry) => entry.token)).toContain("type:task");
  });
});

describe("SearchService structured search", () => {
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
      id: "container_launch",
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

  it("filters local search results with type, tag, status, due, and project tokens", async () => {
    const taskService = new TaskService({ connection, idFactory, now: () => new Date("2026-05-01T01:00:00.000Z") });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_launch",
      title: "Call @call supplier",
      dueAt: "2026-05-04T00:00:00.000Z",
      status: "open"
    });
    await taskService.createTask({
      workspaceId: "workspace_1",
      containerId: "container_launch",
      title: "Email supplier",
      dueAt: "2026-06-01T00:00:00.000Z",
      status: "waiting"
    });

    const results = new SearchService({
      connection,
      now: () => new Date("2026-05-01T12:00:00.000Z")
    }).search({
      workspaceId: "workspace_1",
      query: "type:task tag:call due:<+7d status:open in:project:launch supplier"
    });

    expect(results.map((result) => result.title)).toEqual(["Call @call supplier"]);
  });

  it("saves structured searches through the saved-view service", async () => {
    const result = await new SearchService({ connection, idFactory }).saveStructuredSearch({
      workspaceId: "workspace_1",
      query: "type:task tag:call",
      name: "Call tasks"
    });

    expect(result.savedView).toMatchObject({
      type: "search",
      name: "Call tasks"
    });
    expect(JSON.parse(result.savedView.queryJson)).toMatchObject({
      conditions: expect.arrayContaining([
        { field: "itemType", operator: "is", value: "task" },
        { field: "tag", operator: "has", value: "call" }
      ])
    });
  });
});

function idFactory(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
