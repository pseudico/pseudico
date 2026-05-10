import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContactFieldRepository,
  ContainerRepository,
  ContainerTabRepository,
  ItemRepository,
  MigrationService,
  NoteRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { ContactSummaryService } from "../src";

const TEST_TIMESTAMP = "2026-05-01T00:00:00.000Z";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;

describe("ContactSummaryService", () => {
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
      timestamp: TEST_TIMESTAMP
    });

    new ContainerRepository(connection).create({
      id: "contact_1",
      workspaceId: "workspace_1",
      type: "contact",
      name: "Ada Lovelace",
      slug: "ada-lovelace",
      timestamp: TEST_TIMESTAMP
    });
    new ContainerTabRepository(connection).create({
      id: "tab_main",
      workspaceId: "workspace_1",
      containerId: "contact_1",
      name: "Main",
      isDefault: true,
      timestamp: TEST_TIMESTAMP
    });
    new ContactFieldRepository(connection).create({
      id: "field_1",
      workspaceId: "workspace_1",
      containerId: "contact_1",
      label: "Email",
      value: "ada@example.com",
      type: "email",
      timestamp: TEST_TIMESTAMP
    });
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("returns contact fields and tab summaries for the local contact container", () => {
    new ItemRepository(connection).create({
      id: "note_1",
      workspaceId: "workspace_1",
      containerId: "contact_1",
      containerTabId: "tab_main",
      type: "note",
      title: "Call notes",
      timestamp: TEST_TIMESTAMP
    });
    new NoteRepository(connection).createDetails({
      itemId: "note_1",
      workspaceId: "workspace_1",
      content: "Discuss local-only rollout",
      preview: "Discuss local-only rollout",
      timestamp: TEST_TIMESTAMP
    });

    const summary = new ContactSummaryService({
      connection,
      now: () => new Date("2026-05-10T12:00:00.000Z")
    }).getContactSummary("contact_1");

    expect(summary.contact.name).toBe("Ada Lovelace");
    expect(summary.fields.map((field) => field.label)).toEqual(["Email"]);
    expect(summary.tabSummaries[0]).toMatchObject({
      totalItemCount: 1,
      noteCount: 1
    });
  });
});
