import {
  ActivityLogRepository,
  CommentRepository,
  ContainerRepository,
  ItemRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CommentService, SearchService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("CommentService", () => {
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
    new ItemRepository(connection).create({
      id: "item_1",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      type: "task",
      title: "Draft proposal",
      body: "Client draft",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("adds, updates, and deletes comments with activity and target search", async () => {
    const service = createService();

    const added = await service.addComment({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      body: "Confirm accessibility copy before launch.",
      authorLabel: "Al"
    });

    expect(added.comment).toMatchObject({
      id: "comment_1",
      body: "Confirm accessibility copy before launch.",
      authorLabel: "Al"
    });
    expect(added.searchRecord).toMatchObject({
      targetType: "item",
      targetId: "item_1",
      title: "Draft proposal"
    });
    expect(added.searchRecord.body).toContain("Confirm accessibility copy");
    expect(new SearchService({ connection }).search({
      workspaceId: "workspace_1",
      query: "accessibility"
    }).map((result) => result.title)).toEqual(["Draft proposal"]);
    expect(new ActivityLogRepository(connection)
      .listForTarget("item", "item_1")
      .map((event) => event.action)).toContain("comment_created");

    const updated = await service.updateComment({
      commentId: "comment_1",
      body: "Confirm local-only wording before launch."
    });
    expect(updated.searchRecord.body).toContain("local-only wording");
    expect(updated.searchRecord.body).not.toContain("accessibility copy");

    const deleted = await service.deleteComment({ commentId: "comment_1" });
    expect(deleted.comments).toEqual([]);
    expect(new CommentRepository(connection).getById("comment_1")).toBeNull();
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1"
    })?.body).not.toContain("local-only wording");
    expect(new ActivityLogRepository(connection)
      .listForTarget("item", "item_1")
      .map((event) => event.action)).toEqual(expect.arrayContaining([
        "comment_created",
        "comment_updated",
        "comment_deleted"
      ]));
  });
});

function createService(): CommentService {
  return new CommentService({
    connection,
    idFactory: (prefix) => `${prefix}_${++idCounter}`,
    now: () => new Date("2026-05-02T00:00:00.000Z")
  });
}
