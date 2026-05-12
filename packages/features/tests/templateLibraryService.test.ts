import { ActivityAction } from "@local-work-os/core";
import {
  ActivityLogRepository,
  MigrationService,
  TemplateRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TemplateService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("TemplateService library management", () => {
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
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("filters templates by type, query, and tag while returning previews", () => {
    seedTemplate({
      id: "template_project",
      kind: "project",
      name: "Client launch",
      templateJson: projectTemplateJson()
    });
    seedTemplate({
      id: "template_list",
      kind: "list",
      name: "Meeting checklist",
      templateJson: listTemplateJson()
    });

    const service = createTemplateService();
    const byType = service.listLibraryTemplates({
      workspaceId: "workspace_1",
      kind: "project"
    });
    const byQuery = service.listLibraryTemplates({
      workspaceId: "workspace_1",
      query: "kickoff"
    });
    const byTag = service.listLibraryTemplates({
      workspaceId: "workspace_1",
      tag: "client"
    });

    expect(byType.map((entry) => entry.template.id)).toEqual(["template_project"]);
    expect(byQuery.map((entry) => entry.template.id)).toEqual(["template_project"]);
    expect(byTag.map((entry) => entry.template.id)).toEqual(["template_project"]);
    expect(byTag[0]?.preview.counts).toMatchObject({
      tabs: 1,
      tasks: 1,
      lists: 1,
      listItems: 1
    });
  });

  it("updates, duplicates, and soft-deletes templates with activity events", async () => {
    seedTemplate({
      id: "template_project",
      kind: "project",
      name: "Client launch",
      templateJson: projectTemplateJson()
    });

    const service = createTemplateService();
    const updated = await service.updateTemplate({
      templateId: "template_project",
      name: "Renamed launch",
      description: "Updated local template"
    });
    const duplicate = await service.duplicateTemplate({
      templateId: "template_project",
      name: "Renamed launch copy"
    });
    const deleted = await service.deleteTemplate({ templateId: "template_project" });
    const activity = new ActivityLogRepository(connection).listRecent("workspace_1", 10);

    expect(updated).toMatchObject({
      id: "template_project",
      name: "Renamed launch",
      description: "Updated local template"
    });
    expect(duplicate).toMatchObject({
      id: "template_2",
      name: "Renamed launch copy",
      kind: "project"
    });
    expect(deleted.deletedAt).not.toBeNull();
    expect(service.listTemplates({ workspaceId: "workspace_1" }).map((item) => item.id)).toEqual([
      "template_2"
    ]);
    expect(activity.map((event) => event.action)).toEqual([
      ActivityAction.templateDeleted,
      ActivityAction.templateDuplicated,
      ActivityAction.templateUpdated
    ]);
  });
});

function createTemplateService(): TemplateService {
  return new TemplateService({
    connection,
    idFactory: (prefix) => `${prefix}_${++idCounter}`,
    now: () => new Date("2026-05-03T00:00:00.000Z")
  });
}

function seedTemplate(input: {
  id: string;
  kind: "list" | "project" | "contact";
  name: string;
  templateJson: string;
}): void {
  new TemplateRepository(connection).create({
    id: input.id,
    workspaceId: "workspace_1",
    kind: input.kind,
    name: input.name,
    description: null,
    sourceType: input.kind,
    sourceId: null,
    templateJson: input.templateJson,
    timestamp: "2026-05-02T00:00:00.000Z"
  });
}

function listTemplateJson(): string {
  return JSON.stringify({
    version: 1,
    kind: "list",
    createdFrom: {
      sourceType: "list",
      sourceId: "item_list_1"
    },
    baseDate: "2026-05-01",
    list: {
      title: "Meeting checklist",
      body: null,
      categoryId: null,
      displayMode: "checklist",
      showCompleted: false,
      progressMode: "count",
      tags: [{ tagId: "tag_meeting", name: "Meeting", slug: "meeting", source: "manual" }],
      items: [
        {
          stableId: "row_1",
          parentStableId: null,
          title: "Prepare agenda",
          body: null,
          status: "open",
          depth: 0,
          sortOrder: 1000,
          tags: [],
          dueOffsetDays: null,
          startOffsetDays: null,
          completedOffsetDays: null
        }
      ]
    }
  });
}

function projectTemplateJson(): string {
  return JSON.stringify({
    version: 1,
    kind: "project",
    createdFrom: {
      sourceType: "project",
      sourceId: "container_project_1"
    },
    baseDate: "2026-05-01",
    container: {
      type: "project",
      name: "Client launch",
      description: "Kickoff project",
      status: "active",
      categoryId: null,
      color: null,
      isFavorite: false,
      tags: [{ tagId: "tag_client", name: "Client", slug: "client", source: "manual" }],
      contactFields: [],
      tabs: [
        {
          stableId: "tab_1",
          name: "Plan",
          description: null,
          sortOrder: 1000,
          isDefault: true
        }
      ],
      items: [
        {
          stableId: "item_task_1",
          tabStableId: "tab_1",
          type: "task",
          title: "Schedule kickoff",
          body: null,
          categoryId: null,
          status: "active",
          sortOrder: 1000,
          pinned: false,
          tags: [],
          task: {
            taskStatus: "open",
            priority: null,
            allDay: true,
            timezone: null
          }
        },
        {
          stableId: "item_list_1",
          tabStableId: "tab_1",
          type: "list",
          title: "Launch checklist",
          body: null,
          categoryId: null,
          status: "active",
          sortOrder: 2000,
          pinned: false,
          tags: [],
          list: {
            displayMode: "checklist",
            showCompleted: false,
            progressMode: "count",
            items: [
              {
                stableId: "row_1",
                parentStableId: null,
                title: "Prepare scope",
                body: null,
                status: "open",
                depth: 0,
                sortOrder: 1000,
                tags: []
              }
            ]
          }
        }
      ]
    }
  });
}
