import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ActivityLogRepository,
  CategoryRepository,
  MigrationService,
  TagRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerTemplateService,
  LWO_TEMPLATE_FILE_EXTENSION,
  LWO_TEMPLATE_PACK_FILE_EXTENSION,
  ProjectService,
  TaskService,
  TemplateExportService,
  TemplateImportValidator,
  TemplatePackImportValidator,
  TemplateService,
  validateContainerTemplateJson,
  type TemplatePackFileV1,
  type TemplateFileV1
} from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;
const testDirectory = dirname(fileURLToPath(import.meta.url));

describe("template .lwo-template file format", () => {
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
    new CategoryRepository(connection).create({
      id: "category_1",
      workspaceId: "workspace_1",
      name: "Client Work",
      slug: "client-work",
      color: "#14b8a6",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    new TagRepository(connection).create({
      id: "tag_1",
      workspaceId: "workspace_1",
      name: "Launch",
      slug: "launch",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("exports a stored project template as a versioned .lwo-template file and validates it for import", async () => {
    const project = await new ProjectService({
      connection,
      idFactory: createId,
      now
    }).createProject({
      workspaceId: "workspace_1",
      name: "Client launch",
      description: "Repeatable launch plan",
      categoryId: "category_1"
    });
    const task = await new TaskService({
      connection,
      idFactory: createId,
      now
    }).createTask({
      workspaceId: "workspace_1",
      containerId: project.project.id,
      title: "Kickoff call",
      categoryId: "category_1",
      dueAt: "2026-05-06"
    });
    new TagRepository(connection).createTagging({
      id: "tagging_task",
      workspaceId: "workspace_1",
      tagId: "tag_1",
      targetType: "item",
      targetId: task.item.id,
      source: "manual",
      timestamp: "2026-05-02T00:00:00.000Z"
    });
    const template = await new ContainerTemplateService({
      connection,
      idFactory: createId,
      now
    }).saveContainerAsTemplate({
      containerId: project.project.id,
      name: "Launch project template",
      baseDate: "2026-05-04"
    });
    const writes: { path: string; contents: string }[] = [];
    const exporter = new TemplateExportService({
      connection,
      idFactory: createId,
      now,
      fileSystem: {
        writeTemplateFile: async ({ exportRelativePath, contents }) => {
          writes.push({ path: exportRelativePath, contents });
          return { sizeBytes: Buffer.byteLength(contents, "utf8") };
        }
      }
    });

    const result = await exporter.exportTemplateFile({
      templateId: template.id
    });
    const fileData = JSON.parse(writes[0]!.contents) as TemplateFileV1;
    const summary = new TemplateImportValidator().validateTemplateFileData(fileData);

    expect(result.relativePath).toMatch(
      new RegExp(`^exports/templates/.+launch-project-template\\${LWO_TEMPLATE_FILE_EXTENSION}$`)
    );
    expect(fileData).toMatchObject({
      fileType: "local-work-os.template",
      fileVersion: 1,
      metadata: {
        name: "Launch project template",
        kind: "project",
        templateJsonVersion: 1,
        recommendedExtension: ".lwo-template"
      },
      capabilities: {
        tabs: true,
        tasks: true,
        categories: true,
        relativeDates: true
      },
      references: {
        tags: [expect.objectContaining({ slug: "launch" })],
        categories: [expect.objectContaining({ slug: "client-work" })]
      }
    });
    expect(summary).toMatchObject({
      valid: true,
      kind: "project",
      name: "Launch project template",
      counts: {
        tabs: 1,
        items: 1,
        tasks: 1,
        categories: 1,
        tags: 1
      },
      issues: []
    });
    expect(validateContainerTemplateJson(summary.template)).toMatchObject({
      kind: "project",
      container: {
        items: [expect.objectContaining({ type: "task", dueOffsetDays: 2 })]
      }
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("export", result.id)
        .map((event) => event.action)
    ).toEqual(["export_created"]);
  });

  it("exports and imports a local template pack containing multiple templates", async () => {
    const project = await new ProjectService({
      connection,
      idFactory: createId,
      now
    }).createProject({
      workspaceId: "workspace_1",
      name: "Client launch"
    });
    await new TaskService({
      connection,
      idFactory: createId,
      now
    }).createTask({
      workspaceId: "workspace_1",
      containerId: project.project.id,
      title: "Schedule kickoff"
    });
    const templateService = new TemplateService({
      connection,
      idFactory: createId,
      now
    });
    const template = await new ContainerTemplateService({
      connection,
      idFactory: createId,
      now
    }).saveContainerAsTemplate({
      containerId: project.project.id,
      name: "Client launch template",
      baseDate: "2026-05-04"
    });
    const copy = await templateService.duplicateTemplate({
      templateId: template.id,
      name: "Client launch follow-up"
    });
    const writes: { path: string; contents: string }[] = [];
    const exporter = new TemplateExportService({
      connection,
      idFactory: createId,
      now,
      fileSystem: {
        writeTemplatePackFile: async ({ exportRelativePath, contents }) => {
          writes.push({ path: exportRelativePath, contents });
          return { sizeBytes: Buffer.byteLength(contents, "utf8") };
        }
      }
    });

    const result = await exporter.exportTemplatePackFile({
      workspaceId: "workspace_1",
      templateIds: [template.id, copy.id],
      name: "Launch templates"
    });
    const fileData = JSON.parse(writes[0]!.contents) as TemplatePackFileV1;
    const summary = new TemplatePackImportValidator().validateTemplatePackFileData(fileData);
    const imported = await exporter.importTemplatePackFile({
      workspaceId: "workspace_1",
      fileData
    });

    expect(result.relativePath).toMatch(
      new RegExp(`^exports/templates/.+launch-templates\\${LWO_TEMPLATE_PACK_FILE_EXTENSION}$`)
    );
    expect(fileData).toMatchObject({
      fileType: "local-work-os.template-pack",
      fileVersion: 1,
      metadata: {
        name: "Launch templates",
        templateCount: 2,
        recommendedExtension: ".lwo-template-pack"
      },
      capabilities: {
        tabs: true,
        tasks: true
      }
    });
    expect(summary).toMatchObject({
      valid: true,
      name: "Launch templates",
      templateCount: 2,
      counts: {
        tabs: 2,
        items: 2,
        tasks: 2
      },
      issues: []
    });
    expect(imported).toMatchObject({
      workspaceId: "workspace_1",
      templateCount: 2,
      importedTemplates: [
        expect.objectContaining({ name: "Client launch template" }),
        expect.objectContaining({ name: "Client launch follow-up" })
      ]
    });
    expect(
      new ActivityLogRepository(connection)
        .listForTarget("export", result.id)
        .map((event) => event.action)
    ).toEqual(["export_created"]);
    expect(templateService.listTemplates({ workspaceId: "workspace_1" })).toHaveLength(4);
  });

  it("rejects unsupported template file versions", () => {
    const summary = new TemplateImportValidator().validateTemplateFileData({
      fileType: "local-work-os.template",
      fileVersion: 2,
      exportedAt: "2026-05-02T01:02:03.000Z",
      source: {
        app: "Local Work OS",
        workspaceId: "workspace_1",
        templateId: "template_1",
        sourceType: "list",
        sourceId: "item_1"
      },
      metadata: {
        name: "Future template",
        description: null,
        kind: "list",
        templateJsonVersion: 1,
        recommendedExtension: ".lwo-template"
      },
      capabilities: {
        tabs: false,
        tasks: false,
        notes: false,
        lists: true,
        links: false,
        filePlaceholders: false,
        tags: false,
        categories: false,
        relativeDates: false,
        contactFields: false
      },
      references: { tags: [], categories: [] },
      template: {
        version: 1,
        kind: "list",
        createdFrom: { sourceType: "list", sourceId: "item_1" },
        baseDate: "2026-05-01",
        list: {
          title: "Checklist",
          body: null,
          categoryId: null,
          displayMode: "checklist",
          showCompleted: true,
          progressMode: "count",
          tags: [],
          items: []
        }
      }
    });

    expect(summary.valid).toBe(false);
    expect(summary.issues).toEqual([
      expect.objectContaining({
        code: "unsupported_file_version",
        path: "$.fileVersion"
      })
    ]);
  });

  it("keeps the committed v1 fixture importable", async () => {
    const fixture = await readFile(
      join(testDirectory, "fixtures", "template-v1.lwo-template"),
      "utf8"
    );
    const summary = new TemplateImportValidator().validateTemplateFileData(JSON.parse(fixture));

    expect(summary).toMatchObject({
      valid: true,
      fileVersion: 1,
      kind: "project",
      name: "Fixture onboarding project",
      counts: {
        tabs: 2,
        items: 5,
        tasks: 1,
        notes: 1,
        lists: 1,
        links: 1,
        filePlaceholders: 1,
        listItems: 1,
        tags: 1,
        categories: 1
      },
      issues: []
    });
  });

  it("requires .lwo-template extension for file-based validation", async () => {
    const summary = await new TemplateImportValidator({
      fileSystem: {
        readTextFile: async () => "{}"
      }
    }).validateTemplateFile("exports/templates/template.json");

    expect(summary.valid).toBe(false);
    expect(summary.issues).toEqual([
      expect.objectContaining({ code: "invalid_extension" })
    ]);
  });
});

function now(): Date {
  return new Date("2026-05-02T01:02:03.000Z");
}

function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
