import {
  ActivityLogRepository,
  MigrationService,
  SearchIndexRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TagService } from "../src";
import { WorkspaceRepository } from "@local-work-os/db";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("TagService", () => {
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
    new SearchIndexRepository(connection).upsert({
      id: "search_existing",
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      title: "Call supplier",
      body: "Project follow-up",
      metadataJson: JSON.stringify({ type: "task" }),
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("finds or creates tags by slug and logs creation once", async () => {
    const service = createService();

    const first = await service.findOrCreateTag("workspace_1", " @Ops ");
    const second = await service.findOrCreateTag("workspace_1", "@ops");

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      id: "tag_1",
      name: "Ops",
      slug: "ops"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("tag", first.id)
        .map((event) => event.action)
    ).toEqual(["tag_created"]);
  });

  it("adds and removes manual tags with activity and search updates", async () => {
    const service = createService();

    const added = await service.addTagToTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      name: "@Phone-Call"
    });
    const duplicate = await service.addTagToTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      name: "phone-call"
    });

    expect(added.changed).toBe(true);
    expect(duplicate.changed).toBe(false);
    expect(service.listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1"
    })).toMatchObject([{ slug: "phone-call", taggingSource: "manual" }]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: "item_1"
      })
    ).toMatchObject({
      title: "Call supplier",
      tags: "phone-call"
    });

    const removed = await service.removeTagFromTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      name: "phone-call"
    });

    expect(removed).toMatchObject({ changed: true });
    expect(service.listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1"
    })).toEqual([]);
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", "item_1")
        .map((event) => event.action)
    ).toEqual(expect.arrayContaining(["tag_added", "tag_removed"]));
  });

  it("syncs inline tags without removing manual-only taggings", async () => {
    const service = createService();
    await service.addTagToTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      name: "manual-only"
    });

    const firstSync = await service.syncInlineTags({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      text: "Call @Ops and @multi-word-with-hyphens"
    });
    const secondSync = await service.syncInlineTags({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1",
      text: "Call @Ops"
    });

    expect(firstSync.inlineTagSlugs).toEqual([
      "ops",
      "multi-word-with-hyphens"
    ]);
    expect(firstSync.added).toHaveLength(2);
    expect(secondSync.removed).toHaveLength(1);
    expect(service.listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: "item_1"
    }).map((tag) => tag.slug)).toEqual(["manual-only", "ops"]);
    expect(secondSync.searchRecord.tags).toBe("manual-only ops");
  });
});

function createService(): TagService {
  return new TagService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}
