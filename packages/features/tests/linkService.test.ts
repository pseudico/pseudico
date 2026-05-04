import {
  ActivityLogRepository,
  ContainerRepository,
  LinkRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LinkService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("LinkService", () => {
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
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("normalises HTTP URLs and extracts domains", () => {
    const service = createService();

    expect(service.normaliseUrl("Example.com/brief")).toBe(
      "https://example.com/brief"
    );
    expect(service.extractDomain("https://www.Example.com/brief")).toBe(
      "example.com"
    );
    expect(() => service.normaliseUrl("file:///C:/secret.txt")).toThrow(
      "url must use HTTP or HTTPS."
    );
  });

  it("creates a link item, details row, activity, and search record", async () => {
    const result = await createService().createLink({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      url: "example.com/brief",
      title: " Launch brief ",
      description: "Supplier reference"
    });

    expect(result.item).toMatchObject({
      id: "item_1",
      type: "link",
      title: "Launch brief",
      body: "Supplier reference",
      sortOrder: 1024
    });
    expect(result.link).toMatchObject({
      itemId: "item_1",
      url: "example.com/brief",
      normalizedUrl: "https://example.com/brief",
      domain: "example.com",
      description: "Supplier reference"
    });
    expect(
      new LinkRepository(connection).getByItemId("item_1")
    ).toMatchObject({
      link: {
        normalizedUrl: "https://example.com/brief"
      }
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", "item_1")
        .map((event) => event.action)
    ).toEqual(["link_created"]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: "item_1"
      })
    ).toMatchObject({
      title: "Launch brief",
      body: expect.stringContaining("https://example.com/brief")
    });
    expect(JSON.parse(result.searchRecord.metadataJson)).toMatchObject({
      type: "link",
      normalizedUrl: "https://example.com/brief",
      domain: "example.com"
    });
  });

  it("updates link metadata and keeps search/activity aligned", async () => {
    const service = createService();
    const created = await service.createLink({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      url: "https://example.com/draft",
      title: "Draft brief"
    });

    const updated = await service.updateLink({
      itemId: created.item.id,
      url: "docs.example.com/final",
      title: "Final brief",
      description: "Approved reference"
    });

    expect(updated.item).toMatchObject({
      title: "Final brief",
      body: "Approved reference"
    });
    expect(updated.link).toMatchObject({
      normalizedUrl: "https://docs.example.com/final",
      domain: "docs.example.com",
      description: "Approved reference"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", created.item.id)
        .map((event) => event.action)
    ).toEqual(expect.arrayContaining(["link_created", "link_updated"]));
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: created.item.id
      })
    ).toMatchObject({
      title: "Final brief",
      body: expect.stringContaining("docs.example.com")
    });
  });
});

function createService(): LinkService {
  return new LinkService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}
