import {
  ActivityLogRepository,
  ContainerRepository,
  MigrationService,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  NoteService,
  extractInlineNoteTags,
  generateNotePreview
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("note preview helpers", () => {
  it("generates concise plain-text previews from Markdown", () => {
    expect(
      generateNotePreview(
        "# Launch notes\n\nDiscuss **supplier** plan.\n- [x] Draft copy"
      )
    ).toBe("Launch notes Discuss supplier plan. Draft copy");
  });

  it("extracts unique inline tags for later metadata integration", () => {
    expect(extractInlineNoteTags("Call @Ops about @launch and @ops")).toEqual([
      "ops",
      "launch"
    ]);
  });
});

describe("NoteService", () => {
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

  it("creates a note item and Markdown details with activity and search records", async () => {
    const result = await createService().createNote({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: " Launch note ",
      content: "# Launch\n\nDiscuss **supplier** plan @Ops."
    });

    expect(result.item).toMatchObject({
      id: "item_1",
      type: "note",
      title: "Launch note",
      body: "Launch Discuss supplier plan @Ops.",
      sortOrder: 1024
    });
    expect(result.note).toMatchObject({
      itemId: "item_1",
      format: "markdown",
      content: "# Launch\n\nDiscuss **supplier** plan @Ops.",
      preview: "Launch Discuss supplier plan @Ops."
    });
    expect(result.inlineTags).toEqual(["ops"]);
    expect(result.searchRecord).toMatchObject({
      targetType: "item",
      targetId: "item_1",
      title: "Launch note",
      tags: "ops"
    });
    expect(result.searchRecord.body).toContain("Discuss **supplier** plan @Ops.");
    expect(JSON.parse(result.searchRecord.metadataJson)).toMatchObject({
      type: "note",
      format: "markdown",
      preview: "Launch Discuss supplier plan @Ops.",
      inlineTags: ["ops"]
    });
    expect(
      new ActivityLogRepository(connection).listForTarget("item", "item_1")
    ).toMatchObject([{ action: "note_created" }]);
  });

  it("updates note content and keeps preview, search, and activity aligned", async () => {
    const service = createService();
    const created = await service.createNote({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Draft note",
      content: "Initial notes @draft"
    });

    const updated = await service.updateNote({
      itemId: created.item.id,
      title: "Final note",
      content: "## Decision log\n\nConfirmed @Launch plan."
    });

    expect(updated.item).toMatchObject({
      title: "Final note",
      body: "Decision log Confirmed @Launch plan."
    });
    expect(updated.note).toMatchObject({
      content: "## Decision log\n\nConfirmed @Launch plan.",
      preview: "Decision log Confirmed @Launch plan."
    });
    expect(updated.inlineTags).toEqual(["launch"]);
    expect(
      new SearchIndexRepository(connection).getByTarget({
        workspaceId: "workspace_1",
        targetType: "item",
        targetId: created.item.id
      })
    ).toMatchObject({
      title: "Final note",
      tags: "launch"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", created.item.id)
        .map((event) => event.action)
    ).toEqual(expect.arrayContaining(["note_created", "note_updated"]));
  });

  it("archives notes with activity and updated search metadata", async () => {
    const service = createService();
    const created = await service.createNote({
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      title: "Archive me",
      content: "Archive notes"
    });

    const archived = await service.archiveNote(created.item.id);

    expect(archived.item).toMatchObject({
      status: "archived",
      archivedAt: "2026-05-02T01:02:03.000Z"
    });
    expect(service.listNotesByContainer("container_project_1")).toEqual([]);
    expect(JSON.parse(archived.searchRecord.metadataJson)).toMatchObject({
      archivedAt: "2026-05-02T01:02:03.000Z"
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("item", created.item.id)
        .map((event) => event.action)
    ).toEqual(expect.arrayContaining(["note_created", "note_archived"]));
  });
});

function createService(): NoteService {
  return new NoteService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-02T01:02:03.000Z")
  });
}
