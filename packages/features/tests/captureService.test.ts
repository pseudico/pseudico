import {
  ActivityLogRepository,
  ContainerRepository,
  LinkRepository,
  MigrationService,
  SearchIndexRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CaptureService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const timestamp = "2026-05-09T00:00:00.000Z";

describe("CaptureService", () => {
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
      timestamp
    });
    new ContainerRepository(connection).createSystemInbox({
      id: "container_inbox_1",
      workspaceId: "workspace_1",
      timestamp
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("normalizes and bounds local browser capture payloads", () => {
    const service = createService();
    const capture = service.captureWebPage({
      workspaceId: "workspace_1",
      sourceUrl: "Example.com/brief",
      pageTitle: " Launch brief ",
      description: "  Supplier reference  ",
      selectionText: "Important paragraph"
    });

    expect(capture).toEqual({
      workspaceId: "workspace_1",
      sourceUrl: "Example.com/brief",
      normalizedUrl: "https://example.com/brief",
      domain: "example.com",
      title: "Launch brief",
      description: "Supplier reference",
      selectionText: "Important paragraph",
      note: null,
      capturedAt: null
    });
    expect(() =>
      service.captureWebPage({
        workspaceId: "workspace_1",
        sourceUrl: "file:///C:/secret.txt"
      })
    ).toThrow("url must use HTTP or HTTPS.");
  });

  it("creates an Inbox link through existing link service writes", async () => {
    const result = await createService().createInboxLinkFromCapture({
      workspaceId: "workspace_1",
      sourceUrl: "example.com/brief",
      title: "Launch brief",
      description: "Supplier reference",
      selectionText: "Selected source text",
      note: "Follow up"
    });

    expect(result.link.item).toMatchObject({
      id: "item_1",
      containerId: "container_inbox_1",
      type: "link",
      title: "Launch brief",
      body: "Supplier reference\n\nSelected source text\n\nFollow up"
    });
    expect(
      new LinkRepository(connection).getByItemId(result.link.item.id)
    ).toMatchObject({
      link: {
        normalizedUrl: "https://example.com/brief",
        domain: "example.com"
      }
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", result.link.item.id)
        .map((event) => event.action)
    ).toEqual(["link_created"]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: result.link.item.id
      })
    ).toMatchObject({
      title: "Launch brief",
      body: expect.stringContaining("Selected source text")
    });
  });

  it("creates an Inbox task through existing task service writes", async () => {
    const result = await createService().createInboxTaskFromCapture({
      workspaceId: "workspace_1",
      sourceUrl: "https://example.com/brief",
      title: "Launch brief",
      taskTitle: "Read launch brief",
      selectionText: "Selected source text",
      dueAt: "2026-05-10",
      priority: 2
    });

    expect(result.task.item).toMatchObject({
      id: "item_1",
      containerId: "container_inbox_1",
      type: "task",
      title: "Read launch brief",
      body: expect.stringContaining("Source: https://example.com/brief")
    });
    expect(new TaskRepository(connection).getByItemId(result.task.item.id)).toMatchObject({
      task: {
        dueAt: "2026-05-10T00:00:00.000Z",
        priority: 2
      }
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", result.task.item.id)
        .map((event) => event.action)
    ).toEqual(["task_created"]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: result.task.item.id
      })
    ).toMatchObject({
      title: "Read launch brief",
      body: expect.stringContaining("Selected source text")
    });
  });
});

function createService(): CaptureService {
  return new CaptureService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-09T01:02:03.000Z")
  });
}
