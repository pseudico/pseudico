import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ActivityLogRepository,
  AttachmentRepository,
  CategoryRepository,
  ContainerRepository,
  DatabaseBootstrapService,
  DatabaseHealthService,
  ItemRepository,
  RelationshipRepository,
  SavedViewRepository,
  SearchIndexRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  CalendarService,
  CategoryService,
  CollectionService,
  ContactService,
  DailyPlanService,
  DashboardService,
  FileAttachmentService,
  InboxService,
  LinkService,
  ListService,
  NoteService,
  ProjectService,
  RelationshipService,
  SavedViewService,
  SearchService,
  TaskService,
  TimelineService,
  TodayService
} from "@local-work-os/features";
import {
  createTempWorkspace,
  makeTestIds,
  seedSmokeData,
  type TestWorkspaceHandle
} from "@local-work-os/test-utils";
import { launchDesktopAppForTest } from "./mvpSmokeHarness";

let workspace: TestWorkspaceHandle | null = null;
let connection: DatabaseConnection | null = null;

const createdAt = "2026-05-15T00:00:00.000Z";
const now = new Date(2026, 4, 15, 9, 30, 0, 0);
const nowLater = new Date(2026, 4, 15, 10, 30, 0, 0);

describe("operator readiness fresh-workspace smoke", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    connection?.close();
    connection = null;
    await workspace?.cleanup();
    workspace = null;
  });

  it("proves the integrated operator journey from a fresh workspace through restart persistence", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Operator smoke must not make network requests.")
    );

    expect(launchDesktopAppForTest()).toContain("Create workspace");

    workspace = await createTempWorkspace({
      id: "workspace_operator_smoke",
      name: "Operator Smoke Workspace",
      timestamp: createdAt
    });
    const seed = seedSmokeData({
      workspaceId: workspace.manifest.id,
      workspaceName: workspace.manifest.name,
      timestamp: createdAt
    });
    const ids = makeTestIds();

    await new DatabaseBootstrapService({
      idFactory: ids.nextId,
      now: () => new Date(createdAt)
    }).bootstrapWorkspaceDatabase({
      databasePath: workspace.paths.databasePath,
      workspaceId: seed.workspaceId,
      workspaceName: seed.workspaceName
    });

    connection = await createDatabaseConnection({
      databasePath: workspace.paths.databasePath,
      fileMustExist: true
    });

    await expect(
      new DatabaseHealthService({ connection }).getHealthReport()
    ).resolves.toMatchObject({
      connected: true,
      error: null,
      pendingMigrationCount: 0
    });

    const services = createOperatorServices({
      connection,
      idFactory: ids.nextId,
      now: () => now
    });

    const inbox = services.inbox.getInbox(seed.workspaceId);
    expect(inbox).toMatchObject({
      workspaceId: seed.workspaceId,
      type: "inbox",
      isSystem: true
    });

    const category = await services.category.createCategory({
      workspaceId: seed.workspaceId,
      name: "Operator QA",
      color: "#4c6ef5"
    });
    const project = await services.project.createProject({
      workspaceId: seed.workspaceId,
      name: "Operator Launch Project",
      description: "Fresh-workspace operator smoke project."
    });
    const contact = await services.contact.createContact({
      workspaceId: seed.workspaceId,
      name: "Avery Operator",
      description: "Nontechnical handoff reviewer",
      fields: [
        {
          label: "Email",
          value: "avery.operator@example.test",
          type: "email",
          sortOrder: 10
        }
      ]
    });

    await services.category.assignCategoryToContainer({
      workspaceId: seed.workspaceId,
      containerId: project.project.id,
      categoryId: category.id
    });

    const capturedNote = await services.note.createNote({
      workspaceId: seed.workspaceId,
      containerId: inbox.id,
      title: "Inbox intake @operator-smoke",
      content: "Captured first, then moved to the operator launch project."
    });
    await services.inbox.moveInboxItemToProject({
      itemId: capturedNote.item.id,
      projectId: project.project.id
    });

    const task = await services.task.createTask({
      workspaceId: seed.workspaceId,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      title: "Complete operator smoke @operator-smoke",
      body: "Confirm the real handoff workflow is visible and recoverable.",
      dueAt: "2026-05-15T12:00:00.000Z",
      priority: 1,
      categoryId: category.id
    });
    const list = await services.list.createList({
      workspaceId: seed.workspaceId,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      title: "Operator handoff checklist",
      body: "Steps a nontechnical operator should be able to complete."
    });
    const listRow = await services.list.addListItem({
      listId: list.item.id,
      title: "Verify backup instructions",
      body: "The operator runbook must explain backup and restore.",
      dueAt: "2026-05-15T13:00:00.000Z"
    });
    const note = await services.note.createNote({
      workspaceId: seed.workspaceId,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      title: "Operator runbook note",
      content: "# Operator runbook note\n\nSearch should find this operator-ready note."
    });
    const link = await services.link.createLink({
      workspaceId: seed.workspaceId,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id,
      url: "example.com/operator-readiness",
      title: "Operator readiness reference",
      description: "Local link metadata without required network fetch."
    });
    const file = await attachOperatorSmokeFile({
      workspace,
      service: services.file,
      workspaceId: seed.workspaceId,
      containerId: project.project.id,
      containerTabId: project.defaultTab.id
    });

    await services.relationship.createRelationship({
      workspaceId: seed.workspaceId,
      source: { type: "container", id: contact.contact.id },
      target: { type: "container", id: project.project.id },
      relationType: "related",
      label: "Operator stakeholder"
    });
    await services.relationship.createRelationship({
      workspaceId: seed.workspaceId,
      source: { type: "item", id: task.item.id },
      target: { type: "item", id: note.item.id },
      relationType: "references",
      label: "Runbook evidence"
    });
    await services.relationship.createRelationship({
      workspaceId: seed.workspaceId,
      source: { type: "item", id: list.item.id },
      target: { type: "list_item", id: listRow.listItem.id },
      relationType: "references",
      label: "Checklist row"
    });

    const savedView = await services.savedView.createSavedView({
      workspaceId: seed.workspaceId,
      type: "smart_list",
      name: "Operator smoke tasks",
      description: "Operator-readiness smoke tasks tagged @operator-smoke.",
      query: {
        version: 1,
        match: "all",
        targets: ["item"],
        conditions: [
          { field: "itemType", operator: "is", value: "task" },
          { field: "tag", operator: "has", value: "operator-smoke" }
        ],
        groupBy: "container",
        sort: [{ field: "dueAt", direction: "asc" }]
      },
      isFavorite: true
    });
    const collection = await services.collection.createTagCollection({
      workspaceId: seed.workspaceId,
      tagSlug: "operator-smoke",
      name: "Operator smoke collection"
    });
    await services.dailyPlan.planTask({
      workspaceId: seed.workspaceId,
      itemId: task.item.id,
      lane: "today",
      date: now
    });

    const searchResults = new SearchService({
      connection,
      idFactory: ids.nextId,
      now: () => nowLater
    }).search({
      workspaceId: seed.workspaceId,
      query: "operator-ready",
      limit: 10
    });
    expect(searchResults.map((result) => result.title)).toContain(
      "Operator runbook note"
    );

    expect(
      services.savedView.evaluateSavedViewById(savedView.savedView.id).results
    ).toMatchObject([
      {
        targetId: task.item.id,
        kind: "task",
        title: "Complete operator smoke @operator-smoke",
        containerTitle: "Operator Launch Project",
        tags: ["operator-smoke"]
      }
    ]);
    expect(services.collection.evaluateCollection(collection.id)).toMatchObject({
      total: 2,
      collection: { name: "Operator smoke collection", tagSlug: "operator-smoke" },
      results: expect.arrayContaining([
        expect.objectContaining({ targetId: capturedNote.item.id }),
        expect.objectContaining({ targetId: task.item.id })
      ])
    });

    const today = services.today.getTodayViewModel({
      workspaceId: seed.workspaceId,
      date: now
    });
    expect(today.localDate).toBe("2026-05-15");
    expect(today.dueToday.map((entry) => entry.title)).toEqual(
      expect.arrayContaining([
        "Complete operator smoke @operator-smoke",
        "Verify backup instructions"
      ])
    );
    expect(today.focusSummary.plannedTodayCount).toBeGreaterThanOrEqual(1);

    const dashboard = await services.dashboard.getDefaultDashboard({
      workspaceId: seed.workspaceId
    });
    expect(dashboard.widgets.map((widget) => widget.widget.type)).toEqual(
      expect.arrayContaining(["today", "recent_activity", "project_health"])
    );
    const todayWidget = services.dashboard.getTodayWidgetData({
      workspaceId: seed.workspaceId
    });
    expect(todayWidget.widgetType).toBe("today");
    if (todayWidget.widgetType !== "today") {
      throw new Error("Expected Today dashboard widget data.");
    }
    expect(todayWidget.items.map((entry) => entry.title)).toEqual(
      expect.arrayContaining(["Complete operator smoke @operator-smoke"])
    );

    const timeline = services.timeline.getTimelineItems({
      workspaceId: seed.workspaceId,
      start: "2026-05-15",
      end: "2026-05-16"
    });
    expect(timeline.map((entry) => entry.title)).toEqual(
      expect.arrayContaining([
        "Complete operator smoke @operator-smoke",
        "Verify backup instructions"
      ])
    );
    const calendar = services.calendar.getCalendarMonth({
      workspaceId: seed.workspaceId,
      month: "2026-05"
    });
    const may15 = calendar.days.find((day) => day.date === "2026-05-15");
    expect(may15?.items.map((entry) => entry.title)).toEqual(
      expect.arrayContaining([
        "Complete operator smoke @operator-smoke",
        "Verify backup instructions"
      ])
    );

    expect(launchDesktopAppForTest("/dashboard")).toContain("Dashboard");
    expect(launchDesktopAppForTest("/timeline")).toContain("Timeline");
    expect(launchDesktopAppForTest("/calendar")).toContain("Calendar");
    expect(launchDesktopAppForTest("/search?q=operator-ready")).toContain("Search");

    const activityActions = new ActivityLogRepository(connection)
      .listRecent(seed.workspaceId, 80)
      .map((activity) => activity.action);
    expect(activityActions).toEqual(
      expect.arrayContaining([
        "workspace_created",
        "container_created",
        "contact_field_created",
        "category_created",
        "category_assigned",
        "note_created",
        "item_moved",
        "task_created",
        "list_created",
        "list_item_created",
        "file_attached",
        "link_created",
        "relationship_created",
        "saved_view_created",
        "task_planned"
      ])
    );

    connection.close();
    connection = await createDatabaseConnection({
      databasePath: workspace.paths.databasePath,
      fileMustExist: true
    });

    await expect(
      new DatabaseHealthService({ connection }).getHealthReport()
    ).resolves.toMatchObject({ connected: true, error: null });
    expect(new WorkspaceRepository(connection).getById(seed.workspaceId))
      .toMatchObject({ name: seed.workspaceName });
    expect(new ContainerRepository(connection).getById(project.project.id))
      .toMatchObject({ name: "Operator Launch Project", categoryId: category.id });
    expect(new ContainerRepository(connection).getById(contact.contact.id))
      .toMatchObject({ type: "contact", name: "Avery Operator" });
    expect(new ItemRepository(connection).getById(task.item.id)).toMatchObject({
      type: "task",
      title: "Complete operator smoke @operator-smoke",
      categoryId: category.id
    });
    expect(new ItemRepository(connection).getById(capturedNote.item.id))
      .toMatchObject({ containerId: project.project.id });
    expect(new AttachmentRepository(connection).getById(file.attachment.id))
      .toMatchObject({ checksum: file.checksum });
    expect(await readFile(file.absolutePath, "utf8")).toContain(
      "operator smoke attachment"
    );
    expect(new SavedViewRepository(connection).getById(savedView.savedView.id))
      .toMatchObject({ name: "Operator smoke tasks", isFavorite: true });
    expect(new RelationshipRepository(connection).listByWorkspace(seed.workspaceId))
      .toHaveLength(3);
    expect(new CategoryRepository(connection).getById(category.id)).toMatchObject({
      name: "Operator QA"
    });
    expect(new SearchIndexRepository(connection).getByTarget({
      workspaceId: seed.workspaceId,
      targetType: "item",
      targetId: note.item.id
    })).toMatchObject({
      title: "Operator runbook note",
      isDeleted: false
    });
    expect(new SearchService({
      connection,
      idFactory: ids.nextId,
      now: () => nowLater
    }).search({
      workspaceId: seed.workspaceId,
      query: "Operator readiness reference",
      limit: 5
    })).toMatchObject([
      {
        title: "Operator readiness reference",
        kind: "link",
        targetId: link.item.id
      }
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

function createOperatorServices(input: {
  connection: DatabaseConnection;
  idFactory: (prefix: string) => string;
  now: () => Date;
}): {
  calendar: CalendarService;
  category: CategoryService;
  collection: CollectionService;
  contact: ContactService;
  dailyPlan: DailyPlanService;
  dashboard: DashboardService;
  file: FileAttachmentService;
  inbox: InboxService;
  link: LinkService;
  list: ListService;
  note: NoteService;
  project: ProjectService;
  relationship: RelationshipService;
  savedView: SavedViewService;
  task: TaskService;
  timeline: TimelineService;
  today: TodayService;
} {
  return {
    calendar: new CalendarService({ connection: input.connection, now: input.now }),
    category: new CategoryService(input),
    collection: new CollectionService(input),
    contact: new ContactService(input),
    dailyPlan: new DailyPlanService(input),
    dashboard: new DashboardService(input),
    file: new FileAttachmentService(input),
    inbox: new InboxService(input),
    link: new LinkService(input),
    list: new ListService(input),
    note: new NoteService(input),
    project: new ProjectService(input),
    relationship: new RelationshipService(input),
    savedView: new SavedViewService(input),
    task: new TaskService(input),
    timeline: new TimelineService({ connection: input.connection, now: input.now }),
    today: new TodayService({
      connection: input.connection,
      now: input.now
    })
  };
}

async function attachOperatorSmokeFile(input: {
  workspace: TestWorkspaceHandle;
  service: FileAttachmentService;
  workspaceId: string;
  containerId: string;
  containerTabId: string;
}): Promise<{
  attachment: Awaited<ReturnType<FileAttachmentService["attachFileToContainer"]>>["attachment"];
  absolutePath: string;
  checksum: string;
}> {
  const contents = "operator smoke attachment\n";
  const checksum = createHash("sha256").update(contents).digest("hex");
  const storagePath =
    "attachments/2026/05/operator-smoke-attachment/operator-smoke.txt";
  const absolutePath = join(input.workspace.workspaceRootPath, ...storagePath.split("/"));

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents);

  const file = await input.service.attachFileToContainer({
    workspaceId: input.workspaceId,
    containerId: input.containerId,
    containerTabId: input.containerTabId,
    description: "Operator smoke attachment evidence.",
    copiedFile: {
      attachmentId: "attachment_operator_smoke",
      originalName: "operator-smoke.txt",
      storedName: "operator-smoke.txt",
      storagePath,
      sizeBytes: Buffer.byteLength(contents),
      checksum,
      mimeType: "text/plain"
    }
  });

  return {
    attachment: file.attachment,
    absolutePath,
    checksum
  };
}
