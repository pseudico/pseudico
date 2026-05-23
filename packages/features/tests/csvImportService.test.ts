import {
  ActivityLogRepository,
  ContactFieldRepository,
  ContainerRepository,
  MigrationService,
  SearchIndexRepository,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CsvImportService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

const TIMESTAMP = "2026-05-13T00:00:00.000Z";

describe("CsvImportService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({ databasePath: testDb.databasePath });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: TIMESTAMP
    });
    new ContainerRepository(connection).createSystemInbox({
      id: "container_inbox_1",
      workspaceId: "workspace_1",
      timestamp: TIMESTAMP
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("parses quoted CSV cells and infers task field mappings", () => {
    const service = createService();
    const parsed = service.parse({
      contents: 'Project,Task,Due,Tags,Body\nLaunch,"Follow up, confirm",2026-05-20,"client; launch","Line 1\nLine 2"\n'
    });

    expect(parsed).toMatchObject({
      format: "csv",
      headers: ["Project", "Task", "Due", "Tags", "Body"],
      rows: [
        {
          Project: "Launch",
          Task: "Follow up, confirm",
          Due: "2026-05-20",
          Tags: "client; launch",
          Body: "Line 1\nLine 2"
        }
      ]
    });
    expect(service.inferMapping({ headers: parsed.headers, targetType: "task" })).toMatchObject({
      title: "Task",
      container: "Project",
      dueAt: "Due",
      tags: "Tags",
      body: "Body"
    });
  });

  it("previews validation errors, duplicate skip warnings, and required mappings", async () => {
    await createService().executeImport({
      workspaceId: "workspace_1",
      targetType: "project",
      contents: "Name\nLaunch\n",
      conflictStrategy: "create_new"
    });

    const summary = createService().previewImport({
      workspaceId: "workspace_1",
      targetType: "project",
      contents: "Name,Status\nLaunch,paused\n,active\n",
      conflictStrategy: "skip_existing"
    });

    expect(summary.valid).toBe(false);
    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate_skipped", severity: "warning" }),
        expect.objectContaining({ code: "missing_required_field", severity: "error" })
      ])
    );
    expect(summary.rows[0]).toMatchObject({ action: "skip", title: "Launch" });
  });

  it("imports tasks into mapped projects with tags, categories, search, and activity", async () => {
    const summary = await createService().executeImport({
      workspaceId: "workspace_1",
      targetType: "task",
      contents: "Project,Task,Due,Priority,Tags,Category,Body\nLaunch,Follow up,2026-05-20,2,client; launch,Ops,Bring notes\n",
      conflictStrategy: "create_new"
    });

    expect(summary).toMatchObject({
      valid: true,
      importedCount: 1,
      created: [expect.objectContaining({ targetType: "task", title: "Follow up" })]
    });

    const project = new ContainerRepository(connection)
      .listByWorkspace("workspace_1", { type: "project" })[0];
    expect(project).toMatchObject({ name: "Launch" });

    const task = new TaskRepository(connection).getByItemId(summary.created[0]!.id);
    expect(task).toMatchObject({
      item: {
        title: "Follow up",
        body: "Bring notes",
        containerId: project!.id
      },
      task: {
        dueAt: "2026-05-20T00:00:00.000Z",
        priority: 2
      }
    });

    expect(new TagRepository(connection).listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: summary.created[0]!.id
    }).map((tag) => tag.slug)).toEqual(["client", "launch"]);
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: summary.created[0]!.id
    })).toMatchObject({
      title: "Follow up",
      body: expect.stringContaining("Bring notes"),
      tags: "client launch",
      category: "Ops"
    });
    expect(new ActivityLogRepository(connection).listForTarget("workspace", "workspace_1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "csv_import_completed", actorType: "importer" })
      ])
    );
  });

  it("normalizes @tag notation consistently in preview and execution", async () => {
    const contents =
      "Project,Task,Due,Priority,Tags,Category,Body\n" +
      'Renovation,Order fixtures,2026-05-24,1,"@kitchen @supplier",Ops,Use complete-examination tag notation\n';
    const service = createService();

    const preview = service.previewImport({
      workspaceId: "workspace_1",
      targetType: "task",
      contents,
      conflictStrategy: "create_new"
    });

    expect(preview).toMatchObject({
      valid: true,
      rows: [
        expect.objectContaining({
          action: "create",
          tags: ["kitchen", "supplier"]
        })
      ]
    });

    const summary = await service.executeImport({
      workspaceId: "workspace_1",
      targetType: "task",
      contents,
      conflictStrategy: "create_new"
    });

    expect(summary).toMatchObject({
      valid: true,
      importedCount: 1,
      rows: [
        expect.objectContaining({
          action: "create",
          tags: ["kitchen", "supplier"]
        })
      ]
    });

    expect(new TagRepository(connection).listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: summary.created[0]!.id
    }).map((tag) => tag.slug)).toEqual(["kitchen", "supplier"]);
  });

  it("imports contacts with flexible mapped fields and container tags", async () => {
    const summary = await createService().executeImport({
      workspaceId: "workspace_1",
      targetType: "contact",
      contents: "Name,Email,Phone,Company,Role,Tags\nAlice Example,alice@example.test,555-0100,Example Co,Buyer,client;vip\n"
    });

    expect(summary.importedCount).toBe(1);
    const contactId = summary.created[0]!.id;
    expect(new ContactFieldRepository(connection).listForContact({
      workspaceId: "workspace_1",
      containerId: contactId
    })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Email", value: "alice@example.test", type: "email" }),
        expect.objectContaining({ label: "Company", value: "Example Co", type: "text" })
      ])
    );
    expect(new TagRepository(connection).listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "container",
      targetId: contactId
    }).map((tag) => tag.slug)).toEqual(["client", "vip"]);
  });
});

function createService(): CsvImportService {
  return new CsvImportService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-13T01:02:03.000Z")
  });
}
