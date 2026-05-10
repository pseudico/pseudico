import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AttachmentRepository,
  ContainerRepository,
  ContainerTabRepository,
  ItemRepository,
  NoteRepository,
  TabSummaryRepository,
  TaskRepository,
  type DatabaseConnection
} from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("TabSummaryRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);

    new ContainerRepository(connection).create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: TEST_TIMESTAMP
    });

    new ContainerTabRepository(connection).create({
      id: "tab_main",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      name: "Main",
      isDefault: true,
      sortOrder: 0,
      timestamp: TEST_TIMESTAMP
    });
    new ContainerTabRepository(connection).create({
      id: "tab_delivery",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      name: "Delivery",
      sortOrder: 1,
      timestamp: TEST_TIMESTAMP
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("summarizes open, overdue, upcoming, and recent tab content with limited previews", () => {
    const items = new ItemRepository(connection);
    const tasks = new TaskRepository(connection);
    const notes = new NoteRepository(connection);
    const attachments = new AttachmentRepository(connection);

    items.create({
      id: "task_overdue",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      containerTabId: "tab_delivery",
      type: "task",
      title: "Send launch brief",
      timestamp: "2026-05-01T09:00:00.000Z"
    });
    tasks.createDetails({
      itemId: "task_overdue",
      workspaceId: "workspace_1",
      dueAt: "2026-05-09T00:00:00.000Z",
      timestamp: "2026-05-01T09:00:00.000Z"
    });

    items.create({
      id: "task_upcoming",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      containerTabId: "tab_delivery",
      type: "task",
      title: "Review checklist",
      timestamp: "2026-05-02T09:00:00.000Z"
    });
    tasks.createDetails({
      itemId: "task_upcoming",
      workspaceId: "workspace_1",
      dueAt: "2026-05-11T00:00:00.000Z",
      timestamp: "2026-05-02T09:00:00.000Z"
    });

    items.create({
      id: "note_main",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      containerTabId: null,
      type: "note",
      title: "Kickoff notes",
      timestamp: "2026-05-03T09:00:00.000Z"
    });
    notes.createDetails({
      itemId: "note_main",
      workspaceId: "workspace_1",
      content: "Kickoff agenda and risks",
      preview: "Kickoff agenda",
      timestamp: "2026-05-03T09:00:00.000Z"
    });

    items.create({
      id: "file_delivery",
      workspaceId: "workspace_1",
      containerId: "container_project_1",
      containerTabId: "tab_delivery",
      type: "file",
      title: "Client deck",
      timestamp: "2026-05-04T09:00:00.000Z"
    });
    attachments.create({
      id: "attachment_1",
      workspaceId: "workspace_1",
      itemId: "file_delivery",
      originalName: "client-deck.pdf",
      storedName: "client-deck.pdf",
      sizeBytes: 100,
      storagePath: "attachments/client-deck.pdf",
      timestamp: "2026-05-04T09:00:00.000Z"
    });

    const summaries = new TabSummaryRepository(connection).listByContainer({
      containerId: "container_project_1",
      todayStart: "2026-05-10T00:00:00.000Z",
      previewLimit: 1
    });

    const main = summaries.find((summary) => summary.tab.id === "tab_main")!;
    const delivery = summaries.find((summary) => summary.tab.id === "tab_delivery")!;

    expect(main.totalItemCount).toBe(1);
    expect(main.noteCount).toBe(1);
    expect(main.recentContentPreviews).toEqual([
      expect.objectContaining({ itemId: "note_main", preview: "Kickoff agenda" })
    ]);
    expect(delivery).toMatchObject({
      totalItemCount: 3,
      openTaskCount: 2,
      overdueTaskCount: 1,
      upcomingTaskCount: 1,
      fileCount: 1
    });
    expect(delivery.openTaskPreviews).toHaveLength(1);
    expect(delivery.openTaskPreviews[0]).toMatchObject({
      itemId: "task_overdue",
      dueAt: "2026-05-09T00:00:00.000Z"
    });
    expect(delivery.recentContentPreviews[0]).toMatchObject({
      itemId: "file_delivery",
      preview: "client-deck.pdf"
    });
  });

  it("keeps many-tab summaries bounded by the requested preview limit", () => {
    const tabRepository = new ContainerTabRepository(connection);
    const itemRepository = new ItemRepository(connection);
    const taskRepository = new TaskRepository(connection);

    for (let index = 0; index < 40; index += 1) {
      const tabId = `tab_${index}`;
      tabRepository.create({
        id: tabId,
        workspaceId: "workspace_1",
        containerId: "container_project_1",
        name: `Tab ${index}`,
        sortOrder: index + 2,
        timestamp: TEST_TIMESTAMP
      });

      for (let taskIndex = 0; taskIndex < 5; taskIndex += 1) {
        const itemId = `task_${index}_${taskIndex}`;
        itemRepository.create({
          id: itemId,
          workspaceId: "workspace_1",
          containerId: "container_project_1",
          containerTabId: tabId,
          type: "task",
          title: `Task ${index}.${taskIndex}`,
          timestamp: `2026-05-0${(taskIndex % 5) + 1}T09:00:00.000Z`
        });
        taskRepository.createDetails({
          itemId,
          workspaceId: "workspace_1",
          dueAt: "2026-05-11T00:00:00.000Z",
          timestamp: TEST_TIMESTAMP
        });
      }
    }

    const summaries = new TabSummaryRepository(connection).listByContainer({
      containerId: "container_project_1",
      todayStart: "2026-05-10T00:00:00.000Z",
      previewLimit: 2
    });

    expect(summaries).toHaveLength(42);
    expect(summaries.every((summary) => summary.openTaskPreviews.length <= 2)).toBe(true);
  });
});
