import {
  ContainerRepository,
  AttachmentRepository,
  ItemRepository,
  ListRepository,
  MigrationService,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SearchService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("SearchService", () => {
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
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("indexes and searches containers through the feature-facing service", () => {
    const container = new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      description: "Supplier checklist",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const service = createService();

    service.upsertContainer(container, {
      tags: ["ops"],
      category: "Work"
    });

    expect(
      service.searchWorkspace({
        workspaceId: "workspace_1",
        query: "supplier"
      })
    ).toMatchObject([
      {
        targetType: "container",
        targetId: "container_1",
        title: "Launch Plan",
        tags: "ops",
        category: "Work"
      }
    ]);
  });

  it("hydrates searchable records and excludes archived or deleted sources by default", () => {
    const containerRepository = new ContainerRepository(connection);
    const project = containerRepository.create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      description: "Supplier checklist",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const archivedProject = containerRepository.create({
      id: "container_archived",
      workspaceId: "workspace_1",
      type: "project",
      name: "Archived Launch",
      slug: "archived-launch",
      description: "Old supplier notes",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const itemRepository = new ItemRepository(connection);
    const task = itemRepository.create({
      id: "item_task_1",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "task",
      title: "Call supplier",
      body: "Confirm the launch room",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const archivedTask = itemRepository.create({
      id: "item_task_archived",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "task",
      title: "Archived supplier call",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const deletedTask = itemRepository.create({
      id: "item_task_deleted",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "task",
      title: "Deleted supplier call",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const service = createService();

    service.upsertContainer(project, { tags: ["ops"], category: "Work" });
    service.upsertContainer(
      containerRepository.archive(
        archivedProject.id,
        "2026-04-30T01:00:00.000Z"
      )
    );
    service.upsertItem(task, { tags: ["supplier"], category: "Work" });
    service.upsertItem(
      itemRepository.archive(archivedTask.id, "2026-04-30T01:00:00.000Z")
    );
    service.upsertItem(
      itemRepository.softDelete(deletedTask.id, "2026-04-30T01:00:00.000Z")
    );

    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "supplier"
      })
    ).toMatchObject([
      {
        targetType: "item",
        targetId: "item_task_1",
        kind: "task",
        title: "Call supplier",
        containerTitle: "Launch Plan",
        destinationPath: "/projects/container_1",
        tags: ["supplier"],
        category: "Work"
      },
      {
        targetType: "container",
        targetId: "container_1",
        kind: "project",
        title: "Launch Plan",
        destinationPath: "/projects/container_1"
      }
    ]);
    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "supplier",
        includeArchived: true,
        includeDeleted: true
      })
    ).toHaveLength(4);
    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "archived",
        includeArchived: true
      })
    ).toHaveLength(2);
  });

  it("filters hydrated search results by source kind and hydrates checklist rows", () => {
    const project = new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const itemRepository = new ItemRepository(connection);
    const list = itemRepository.create({
      id: "item_list_1",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "list",
      title: "Supplier checklist",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const listRepository = new ListRepository(connection);
    listRepository.createDetails({
      itemId: list.id,
      workspaceId: "workspace_1",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const listItem = listRepository.createListItem({
      id: "list_item_1",
      workspaceId: "workspace_1",
      listId: list.id,
      title: "Confirm supplier copy",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const service = createService();

    service.upsertItem(list);
    service.upsertListItem(listItem);

    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "supplier",
        kinds: ["list_item"]
      })
    ).toMatchObject([
      {
        targetType: "list_item",
        targetId: "list_item_1",
        kind: "list_item",
        parentItemId: "item_list_1",
        parentItemTitle: "Supplier checklist",
        containerTitle: "Launch Plan",
        destinationPath: "/projects/container_1"
      }
    ]);
  });

  it("hydrates attachment search records as file results with item context", () => {
    const project = new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const fileItem = new ItemRepository(connection).create({
      id: "item_file_1",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "file",
      title: "Launch brief",
      body: "Signed launch scope",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const attachment = new AttachmentRepository(connection).create({
      id: "attachment_1",
      workspaceId: "workspace_1",
      itemId: fileItem.id,
      originalName: "Brief.pdf",
      storedName: "Brief.pdf",
      storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
      sizeBytes: 42,
      checksum: "c".repeat(64),
      description: "Signed launch scope",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const service = createService();

    service.upsertAttachment(attachment, {
      tags: ["launch"],
      category: "Finance"
    });

    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "signed",
        kinds: ["file"]
      })
    ).toMatchObject([
      {
        targetType: "attachment",
        targetId: "attachment_1",
        kind: "file",
        title: "Brief.pdf",
        body: "Signed launch scope",
        containerTitle: "Launch Plan",
        parentItemId: "item_file_1",
        parentItemTitle: "Launch brief",
        destinationPath: "/projects/container_1",
        tags: ["launch"],
        category: "Finance"
      }
    ]);
  });

  it("deduplicates file item and attachment records that represent the same visible file", () => {
    const project = new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Balcony Plan",
      slug: "balcony-plan",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const fileItem = new ItemRepository(connection).create({
      id: "item_file_1",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "file",
      title: "balcony_screen_concept.png",
      body: "Balcony screen concept image",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const attachment = new AttachmentRepository(connection).create({
      id: "attachment_1",
      workspaceId: "workspace_1",
      itemId: fileItem.id,
      originalName: "balcony_screen_concept.png",
      storedName: "balcony_screen_concept.png",
      storagePath: "attachments/2026/05/attachment_1/balcony_screen_concept.png",
      sizeBytes: 42,
      checksum: "d".repeat(64),
      description: "Balcony screen concept image",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const service = createService();

    service.upsertItem(fileItem);
    service.upsertAttachment(attachment);

    const results = service.search({
      workspaceId: "workspace_1",
      query: "balcony_screen_concept",
      kinds: ["file"]
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      targetType: "item",
      targetId: "item_file_1",
      kind: "file",
      title: "balcony_screen_concept.png"
    });
  });

  it("routes contact search hits directly to the contact detail page", () => {
    const contact = new ContainerRepository(connection).create({
      id: "container_contact_1",
      workspaceId: "workspace_1",
      type: "contact",
      name: "DJ DeRiu",
      slug: "dj-deriu",
      description: "Electrical collaborator",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const service = createService();

    service.upsertContainer(contact);

    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "DJ"
      })
    ).toMatchObject([
      {
        targetType: "container",
        targetId: "container_contact_1",
        kind: "contact",
        destinationPath: "/contacts/container_contact_1"
      }
    ]);
  });

  it("ranks title matches ahead of body-only matches and returns safe highlight excerpts", () => {
    const project = new ContainerRepository(connection).create({
      id: "container_rank",
      workspaceId: "workspace_1",
      type: "project",
      name: "Ranking Project",
      slug: "ranking-project",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const itemRepository = new ItemRepository(connection);
    const bodyOnly = itemRepository.create({
      id: "item_body_match",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "note",
      title: "General note",
      body: "The launch phrase appears only in the body.",
      timestamp: "2026-04-30T01:00:00.000Z"
    });
    const titleMatch = itemRepository.create({
      id: "item_title_match",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "note",
      title: "Launch decision",
      body: "Body includes <script>alert(1)</script> near launch details.",
      timestamp: "2026-04-30T00:30:00.000Z"
    });
    const service = createService();

    service.upsertItem(bodyOnly);
    service.upsertItem(titleMatch);

    const results = service.search({
      workspaceId: "workspace_1",
      query: "launch",
      kinds: ["note"]
    });

    expect(results.map((result) => result.targetId)).toEqual([
      "item_title_match",
      "item_body_match"
    ]);
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
    expect(results[0]?.titleHighlights).toEqual([
      { text: "Launch", match: true },
      { text: " decision", match: false }
    ]);
    expect(results[0]?.excerpt?.segments).toContainEqual({
      text: "launch",
      match: true
    });
    expect(results[0]?.excerpt?.text).toContain("<script>alert(1)</script>");
  });

  it("emits a local slow-query diagnostic when search exceeds the configured threshold", () => {
    const project = new ContainerRepository(connection).create({
      id: "container_slow_query",
      workspaceId: "workspace_1",
      type: "project",
      name: "Slow Query Project",
      slug: "slow-query-project",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const item = new ItemRepository(connection).create({
      id: "item_slow_query",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "task",
      title: "Slow query fixture",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const entries: unknown[] = [];
    const service = new SearchService({
      connection,
      idFactory: (prefix) => `${prefix}_slow`,
      slowQueryThresholdMs: 0.0001,
      slowQuerySink: (entry) => entries.push(entry),
      now: () => new Date("2026-04-30T00:00:00.000Z")
    });

    service.upsertItem(item);
    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "slow",
        limit: 10
      })
    ).toHaveLength(1);

    expect(entries).toMatchObject([
      {
        label: "search.search",
        thresholdMs: 0.0001,
        metadata: {
          workspaceId: "workspace_1",
          queryLength: 4,
          limit: 10,
          offset: 0
        }
      }
    ]);
  });

  it("applies explicit type, tag, category, due date, and status filters", () => {
    const project = new ContainerRepository(connection).create({
      id: "container_filters",
      workspaceId: "workspace_1",
      type: "project",
      name: "Filtered Project",
      slug: "filtered-project",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const itemRepository = new ItemRepository(connection);
    const matchingTask = itemRepository.create({
      id: "item_matching_task",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "task",
      title: "Call supplier",
      body: "Discuss launch details",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const wrongTagTask = itemRepository.create({
      id: "item_wrong_tag",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "task",
      title: "Call contractor",
      body: "Discuss launch details",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const service = createService();

    service.upsertItem(matchingTask, {
      tags: ["ops"],
      category: "Work",
      metadata: {
        taskStatus: "waiting",
        dueAt: "2026-05-05T00:00:00.000Z"
      }
    });
    service.upsertItem(wrongTagTask, {
      tags: ["personal"],
      category: "Work",
      metadata: {
        taskStatus: "waiting",
        dueAt: "2026-05-05T00:00:00.000Z"
      }
    });

    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "",
        filters: {
          kinds: ["task"],
          tags: ["ops"],
          category: "Work",
          status: "waiting",
          due: {
            operator: "between",
            from: "2026-05-01",
            to: "2026-05-10"
          }
        }
      })
    ).toMatchObject([
      {
        targetId: "item_matching_task",
        kind: "task",
        tags: ["ops"],
        category: "Work",
        taskStatus: "waiting",
        dueAt: "2026-05-05T00:00:00.000Z"
      }
    ]);
  });

  it("persists recent searches locally without a schema change", () => {
    const service = createService();

    expect(service.listRecentSearches("workspace_1")).toEqual([]);

    service.recordRecentSearch({
      workspaceId: "workspace_1",
      query: "supplier",
      filters: {
        kinds: ["task"],
        tags: ["ops"],
        includeArchived: true
      }
    });
    service.recordRecentSearch({
      workspaceId: "workspace_1",
      query: "supplier",
      filters: {
        kinds: ["task"],
        tags: ["ops"],
        includeArchived: true
      }
    });

    expect(service.listRecentSearches("workspace_1")).toMatchObject([
      {
        workspaceId: "workspace_1",
        query: "supplier",
        filters: {
          kinds: ["task"],
          tags: ["ops"],
          includeArchived: true
        }
      }
    ]);
  });

  it("exposes feature-level search-index rebuild for maintenance actions", () => {
    const project = new ContainerRepository(connection).create({
      id: "container_rebuild",
      workspaceId: "workspace_1",
      type: "project",
      name: "Rebuild Project",
      slug: "rebuild-project",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    new ItemRepository(connection).create({
      id: "item_rebuild",
      workspaceId: "workspace_1",
      containerId: project.id,
      type: "note",
      title: "Rebuild note",
      timestamp: "2026-04-30T00:00:00.000Z"
    });
    const service = createService();

    expect(service.rebuildWorkspaceIndex("workspace_1")).toMatchObject({
      indexedContainerCount: 1,
      indexedItemCount: 1
    });
    expect(
      service.search({
        workspaceId: "workspace_1",
        query: "rebuild",
        filters: { kinds: ["note"] }
      })
    ).toHaveLength(1);
  });

});

function createService(): SearchService {
  return new SearchService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-04-30T00:00:00.000Z")
  });
}
