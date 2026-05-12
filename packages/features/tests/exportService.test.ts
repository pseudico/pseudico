import {
  ActivityLogRepository,
  AttachmentRepository,
  CategoryRepository,
  ContainerRepository,
  ContainerTabRepository,
  DailyPlanRepository,
  DashboardRepository,
  ItemRepository,
  LinkRepository,
  ListRepository,
  MigrationService,
  NoteRepository,
  RelationshipRepository,
  SavedViewRepository,
  SearchIndexRepository,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ExportService, type WorkspaceExportV1 } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;
const writtenExports = new Map<string, string>();

const timestamp = "2026-05-06T00:00:00.000Z";

describe("ExportService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({
      databasePath: testDb.databasePath
    });
    new MigrationService({ connection }).runPendingMigrations();
    seedWorkspace();
    idCounter = 0;
    writtenExports.clear();
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("builds a deterministic workspace export without generated search records", () => {
    const exportData = createService().buildWorkspaceExport({
      workspaceId: "workspace_1"
    });

    expect(exportData).toMatchObject({
      schemaVersion: 1,
      exportedAt: timestamp,
      workspace: {
        id: "workspace_1",
        name: "Personal Work"
      },
      data: {
        containers: [{ id: "container_project_1" }],
        containerTabs: [{ id: "container_tab_1" }],
        items: expect.arrayContaining([
          expect.objectContaining({ id: "item_task_1" }),
          expect.objectContaining({ id: "item_note_1" }),
          expect.objectContaining({ id: "item_list_1" }),
          expect.objectContaining({ id: "item_link_1" }),
          expect.objectContaining({ id: "item_file_1" })
        ]),
        taskDetails: [{ itemId: "item_task_1" }],
        noteDetails: [{ itemId: "item_note_1" }],
        listDetails: [{ itemId: "item_list_1" }],
        listItems: [{ id: "list_item_1" }],
        linkDetails: [{ itemId: "item_link_1" }],
        tags: [{ id: "tag_1", slug: "launch" }],
        taggings: [{ id: "tagging_1", targetId: "item_task_1" }],
        categories: [{ id: "category_1", slug: "operations" }],
        relationships: [{ id: "relationship_1" }],
        savedViews: [{ id: "saved_view_1" }],
        dashboards: [{ id: "dashboard_1" }],
        dashboardWidgets: [{ id: "dashboard_widget_1" }],
        dailyPlans: [{ id: "daily_plan_1" }],
        dailyPlanItems: [{ id: "daily_plan_item_1" }]
      },
      attachmentManifest: {
        attachmentCount: 1,
        totalAttachmentBytes: 42,
        attachments: [
          {
            id: "attachment_1",
            storagePath: "attachments/2026/05/attachment_1/Brief.pdf"
          }
        ]
      }
    });
    expect(JSON.stringify(exportData)).not.toContain("Generated search body");
  });

  it("writes stable JSON and logs export_created", async () => {
    const result = await createService().exportWorkspaceJson({
      workspaceId: "workspace_1",
      exportRelativePath: "exports/test-workspace-export.json"
    });

    expect(result).toMatchObject({
      id: "export_1",
      workspaceId: "workspace_1",
      relativePath: "exports/test-workspace-export.json",
      schemaVersion: 1,
      itemCount: 5,
      attachmentCount: 1,
      totalAttachmentBytes: 42
    });

    const contents = writtenExports.get("exports/test-workspace-export.json");
    expect(contents).toBeDefined();
    const parsed = JSON.parse(contents ?? "") as WorkspaceExportV1;

    expect(parsed.data.items.map((item) => item.id)).toEqual([
      "item_task_1",
      "item_note_1",
      "item_list_1",
      "item_link_1",
      "item_file_1"
    ]);
    expect(parsed.attachmentManifest.attachments).toHaveLength(1);
    expect(contents).not.toContain("search_index");
    expect(contents).not.toContain("Generated search body");
    expect(
      new ActivityLogRepository(connection).listForTarget("export", "export_1")
    ).toMatchObject([
      {
        action: "export_created",
        summary: "Created workspace JSON export exports/test-workspace-export.json."
      }
    ]);
  });

  it("exports project Markdown with escaped titles and local file metadata", async () => {
    const result = await createService().exportProjectMarkdown({
      projectId: "container_project_1",
      exportRelativePath: "exports/launch-plan-project.md"
    });

    expect(result).toMatchObject({
      id: "export_1",
      workspaceId: "workspace_1",
      relativePath: "exports/launch-plan-project.md",
      kind: "project_markdown",
      sourceId: "container_project_1",
      rowCount: 5
    });

    const contents = writtenExports.get("exports/launch-plan-project.md");
    expect(contents).toBeDefined();
    expect(contents).toContain("# Launch Plan");
    expect(contents).toContain("- [ ] Call supplier");
    expect(contents).toContain("Notes: Confirm \"launch\", then call\\.");
    expect(contents).toContain("```markdown\n# Launch notes\n```");
    expect(contents).toContain("Brief\\.pdf");
    expect(contents).toContain(
      "attachments/2026/05/attachment\\_1/Brief\\.pdf"
    );

    expect(
      new ActivityLogRepository(connection).listForTarget("export", "export_1")
    ).toMatchObject([
      {
        action: "export_created",
        summary: "Created project Markdown export exports/launch-plan-project.md."
      }
    ]);
  });


  it("exports planning summaries as Markdown and logs the local export", async () => {
    const result = await createService().exportPlanningSummaryMarkdown({
      workspaceId: "workspace_1",
      date: "2026-05-06",
      exportRelativePath: "exports/planning-summary.md"
    });

    expect(result).toMatchObject({
      kind: "planning_summary_markdown",
      sourceId: "workspace_1",
      relativePath: "exports/planning-summary.md"
    });
    expect(writtenExports.get("exports/planning-summary.md")).toContain(
      "# Planning summary for 2026-05-06"
    );
    expect(writtenExports.get("exports/planning-summary.md")).toContain(
      "Launch Plan: planned 1"
    );
    expect(
      new ActivityLogRepository(connection).listForTarget("export", "export_1")
    ).toMatchObject([
      {
        action: "export_created",
        summary: "Created planning summary Markdown export exports/planning-summary.md."
      }
    ]);
  });

  it("exports tasks as escaped CSV and TSV", async () => {
    const csv = await createService().exportTasksCsv({
      workspaceId: "workspace_1",
      exportRelativePath: "exports/tasks.csv"
    });
    const tsv = await createService().exportTasksCsv({
      workspaceId: "workspace_1",
      format: "tsv",
      exportRelativePath: "exports/tasks.tsv"
    });

    expect(csv).toMatchObject({
      kind: "tasks_csv",
      rowCount: 1,
      relativePath: "exports/tasks.csv"
    });
    expect(tsv).toMatchObject({
      kind: "tasks_tsv",
      rowCount: 1,
      relativePath: "exports/tasks.tsv"
    });
    expect(writtenExports.get("exports/tasks.csv")).toContain(
      'Launch Plan,Call supplier,open,2,,2026-05-07T00:00:00.000Z,,launch,"Confirm ""launch"", then call.",item_task_1'
    );
    expect(writtenExports.get("exports/tasks.tsv")).toContain(
      'Launch Plan\tCall supplier\topen\t2\t\t2026-05-07T00:00:00.000Z\t\tlaunch\t"Confirm ""launch"", then call."\titem_task_1'
    );
  });
});

function seedWorkspace(): void {
  new WorkspaceRepository(connection).create({
    id: "workspace_1",
    name: "Personal Work",
    schemaVersion: 1,
    timestamp
  });
  new CategoryRepository(connection).create({
    id: "category_1",
    workspaceId: "workspace_1",
    name: "Operations",
    slug: "operations",
    color: "#2c6b8f",
    timestamp
  });
  new ContainerRepository(connection).create({
    id: "container_project_1",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    categoryId: "category_1",
    timestamp
  });
  new ContainerTabRepository(connection).create({
    id: "container_tab_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    name: "Main",
    isDefault: true,
    timestamp
  });
  seedItems();
  seedMetadata();
  seedViews();
  new SearchIndexRepository(connection).upsert({
    id: "search_index_1",
    workspaceId: "workspace_1",
    targetType: "item",
    targetId: "item_task_1",
    title: "Generated search body",
    timestamp
  });
}

function seedItems(): void {
  const itemRepository = new ItemRepository(connection);
  itemRepository.create({
    id: "item_task_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    containerTabId: "container_tab_1",
    type: "task",
    title: "Call supplier",
    body: "Confirm \"launch\", then call.",
    categoryId: "category_1",
    sortOrder: 10,
    timestamp
  });
  new TaskRepository(connection).createDetails({
    itemId: "item_task_1",
    workspaceId: "workspace_1",
    dueAt: "2026-05-07T00:00:00.000Z",
    priority: 2,
    timestamp
  });
  itemRepository.create({
    id: "item_note_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    containerTabId: "container_tab_1",
    type: "note",
    title: "Launch notes",
    sortOrder: 20,
    timestamp
  });
  new NoteRepository(connection).createDetails({
    itemId: "item_note_1",
    workspaceId: "workspace_1",
    content: "# Launch notes",
    preview: "Launch notes",
    timestamp
  });
  itemRepository.create({
    id: "item_list_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    containerTabId: "container_tab_1",
    type: "list",
    title: "Launch checklist",
    sortOrder: 30,
    timestamp
  });
  const listRepository = new ListRepository(connection);
  listRepository.createDetails({
    itemId: "item_list_1",
    workspaceId: "workspace_1",
    timestamp
  });
  listRepository.createListItem({
    id: "list_item_1",
    workspaceId: "workspace_1",
    listId: "item_list_1",
    title: "Confirm export",
    sortOrder: 10,
    timestamp
  });
  itemRepository.create({
    id: "item_link_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    containerTabId: "container_tab_1",
    type: "link",
    title: "Reference",
    sortOrder: 40,
    timestamp
  });
  new LinkRepository(connection).createDetails({
    itemId: "item_link_1",
    workspaceId: "workspace_1",
    url: "https://example.com/brief",
    normalizedUrl: "https://example.com/brief",
    title: "Reference",
    domain: "example.com",
    timestamp
  });
  itemRepository.create({
    id: "item_file_1",
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    containerTabId: "container_tab_1",
    type: "file",
    title: "Brief.pdf",
    sortOrder: 50,
    timestamp
  });
  new AttachmentRepository(connection).create({
    id: "attachment_1",
    workspaceId: "workspace_1",
    itemId: "item_file_1",
    originalName: "Brief.pdf",
    storedName: "Brief.pdf",
    mimeType: "application/pdf",
    sizeBytes: 42,
    checksum: "a".repeat(64),
    storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
    description: "Launch brief",
    timestamp
  });
}

function seedMetadata(): void {
  const tagRepository = new TagRepository(connection);
  tagRepository.create({
    id: "tag_1",
    workspaceId: "workspace_1",
    name: "Launch",
    slug: "launch",
    timestamp
  });
  tagRepository.createTagging({
    id: "tagging_1",
    workspaceId: "workspace_1",
    tagId: "tag_1",
    targetType: "item",
    targetId: "item_task_1",
    source: "manual",
    timestamp
  });
  new RelationshipRepository(connection).create({
    id: "relationship_1",
    workspaceId: "workspace_1",
    sourceType: "item",
    sourceId: "item_task_1",
    targetType: "item",
    targetId: "item_note_1",
    relationType: "related",
    timestamp
  });
}

function seedViews(): void {
  new SavedViewRepository(connection).create({
    id: "saved_view_1",
    workspaceId: "workspace_1",
    type: "collection",
    name: "Launch",
    queryJson: JSON.stringify({ version: 1, match: "all", conditions: [] }),
    timestamp
  });
  const dashboardRepository = new DashboardRepository(connection);
  dashboardRepository.createDefaultDashboard({
    id: "dashboard_1",
    workspaceId: "workspace_1",
    timestamp
  });
  dashboardRepository.createWidget({
    id: "dashboard_widget_1",
    workspaceId: "workspace_1",
    dashboardId: "dashboard_1",
    type: "today",
    title: "Today",
    configJson: "{}",
    positionJson: "{}",
    sortOrder: 10,
    timestamp
  });
  const dailyPlanRepository = new DailyPlanRepository(connection);
  dailyPlanRepository.createPlan({
    id: "daily_plan_1",
    workspaceId: "workspace_1",
    planDate: "2026-05-06",
    timestamp
  });
  dailyPlanRepository.createPlanItem({
    id: "daily_plan_item_1",
    workspaceId: "workspace_1",
    dailyPlanId: "daily_plan_1",
    itemType: "task",
    itemId: "item_task_1",
    lane: "today",
    sortOrder: 10,
    timestamp
  });
}

function createService(): ExportService {
  return new ExportService({
    connection,
    idFactory: createId,
    now: () => new Date(timestamp),
    fileSystem: {
      async writeJsonExport(input) {
        writtenExports.set(input.exportRelativePath, input.contents);

        return {
          sizeBytes: Buffer.byteLength(input.contents)
        };
      },
      async writeTextExport(input) {
        writtenExports.set(input.exportRelativePath, input.contents);

        return {
          sizeBytes: Buffer.byteLength(input.contents)
        };
      }
    }
  });
}

function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
