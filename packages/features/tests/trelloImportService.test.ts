import {
  ActivityLogRepository,
  AttachmentRepository,
  CommentRepository,
  ContainerRepository,
  ItemRepository,
  ListRepository,
  MigrationService,
  RelationshipRepository,
  SearchIndexRepository,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  createDatabaseConnection,
  type DatabaseConnection
} from "@local-work-os/db";
import { createTestDatabase } from "@local-work-os/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TrelloImportService } from "../src";

let cleanup: (() => Promise<void>) | undefined;
let connection: DatabaseConnection;
let idCounter = 0;

describe("TrelloImportService", () => {
  beforeEach(async () => {
    const testDb = await createTestDatabase();
    cleanup = testDb.cleanup;
    connection = await createDatabaseConnection({ databasePath: testDb.databasePath });
    new MigrationService({ connection }).runPendingMigrations();
    new WorkspaceRepository(connection).create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: "2026-05-14T00:00:00.000Z"
    });
    idCounter = 0;
  });

  afterEach(async () => {
    connection.close();
    await cleanup?.();
  });

  it("previews Trello boards, cards, checklists, comments, labels, attachments, and archive warnings", () => {
    const summary = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "trello-board.json",
      entries: [
        { relativePath: "board.json", kind: "board_json", content: JSON.stringify(createBoard()) },
        {
          relativePath: "attachments/brief.pdf",
          kind: "raw_attachment",
          match: { sourceId: "att_1", fileName: "brief.pdf" },
          copiedFile: copiedAttachment()
        },
        { relativePath: "README.txt", kind: "unsupported", sizeBytes: 10 }
      ]
    });

    expect(summary).toMatchObject({
      valid: true,
      boardName: "Launch Board",
      listCount: 2,
      cardCount: 2,
      archivedCardCount: 1,
      checklistCount: 1,
      checklistItemCount: 2,
      commentCount: 1,
      labelCount: 2,
      attachmentCount: 1,
      matchedRawAttachmentCount: 1
    });
    expect(summary.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "project", title: "Launch Board" }),
        expect.objectContaining({ kind: "list", title: "Doing" }),
        expect.objectContaining({ kind: "card", title: "Ship beta", action: "create" }),
        expect.objectContaining({ kind: "checklist", title: "QA" }),
        expect.objectContaining({ kind: "checklist_item", title: "Run smoke tests" }),
        expect.objectContaining({ kind: "comment", action: "append", title: "Looks ready" }),
        expect.objectContaining({ kind: "attachment", action: "match", title: "Brief" }),
        expect.objectContaining({ kind: "card", title: "Old card", action: "skip" })
      ])
    );
    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "archived_card_skipped", severity: "warning" }),
        expect.objectContaining({ code: "inert_attachment_url", severity: "warning" }),
        expect.objectContaining({ code: "unsupported_trello_export_file", severity: "warning" })
      ])
    );
  });

  it("imports Trello cards through project, list, task, checklist, tag, comment, attachment, relationship, search, and activity flows", async () => {
    const summary = await createService().executeImport({
      workspaceId: "workspace_1",
      rootName: "trello-board.json",
      entries: [
        { relativePath: "board.json", kind: "board_json", content: JSON.stringify(createBoard()) },
        {
          relativePath: "attachments/brief.pdf",
          kind: "raw_attachment",
          match: { sourceId: "att_1" },
          copiedFile: copiedAttachment()
        }
      ]
    });

    expect(summary.valid).toBe(true);
    expect(summary.created.map((target) => target.targetType)).toEqual(
      expect.arrayContaining(["project", "item", "list_item", "comment", "attachment", "relationship"])
    );

    const project = new ContainerRepository(connection).listByWorkspace("workspace_1", { type: "project" })[0]!;
    expect(project.name).toBe("Launch Board");

    const list = new ListRepository(connection).listByContainer(project.id)[0]!;
    expect(list.item.title).toBe("Doing");
    const listItems = new ListRepository(connection).listItems(list.item.id);
    expect(listItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Ship beta", depth: 0 }),
        expect.objectContaining({ title: "QA", depth: 1 }),
        expect.objectContaining({ title: "Run smoke tests", status: "done", depth: 2 }),
        expect.objectContaining({ title: "Write notes", status: "open", depth: 2 })
      ])
    );

    const task = new TaskRepository(connection).listByContainer(project.id)[0]!;
    expect(task).toMatchObject({
      item: {
        title: "Ship beta",
        body: expect.stringContaining("Looks ready")
      },
      task: {
        dueAt: "2026-05-20T12:00:00.000Z",
        taskStatus: "open"
      }
    });
    expect(new TagRepository(connection).listTagsForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: task.item.id
    }).map((tag) => tag.slug).sort()).toEqual(["green", "priority"]);
    expect(new CommentRepository(connection).listForTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: task.item.id
    })).toEqual([
      expect.objectContaining({ body: expect.stringContaining("Looks ready"), authorLabel: "Alice" })
    ]);
    expect(new AttachmentRepository(connection).listForItem({
      workspaceId: "workspace_1",
      itemId: task.item.id
    })[0]).toMatchObject({ originalName: "brief.pdf" });
    expect(new RelationshipRepository(connection).listOutgoingRelationships({
      workspaceId: "workspace_1",
      target: { type: "item", id: task.item.id }
    })).toEqual([
      expect.objectContaining({ targetType: "list_item", relationType: "belongs_to", label: "Trello card in list" })
    ]);
    const searchRecord = new SearchIndexRepository(connection).getByTarget({
      workspaceId: "workspace_1",
      targetType: "item",
      targetId: task.item.id
    });
    expect(searchRecord).toMatchObject({ title: "Ship beta" });
    expect(searchRecord?.tags.split(" ").sort()).toEqual(["green", "priority"]);
    expect(new ActivityLogRepository(connection).listForTarget("workspace", "workspace_1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "trello_import_completed", actorType: "importer" })
      ])
    );
  });

  it("can import archived cards as locally archived tasks", async () => {
    const summary = await createService().executeImport({
      workspaceId: "workspace_1",
      rootName: "trello-board.json",
      archiveHandling: "import_archived",
      entries: [{ relativePath: "board.json", kind: "board_json", content: JSON.stringify(createBoard()) }]
    });

    expect(summary.valid).toBe(true);
    expect(summary.rows).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Old card", action: "create" })])
    );
    const archived = new ItemRepository(connection).listByWorkspace("workspace_1", { includeArchived: true })
      .find((item) => item.title === "Old card");
    expect(archived?.archivedAt).not.toBeNull();
  });

  it("rejects unsafe paths and empty Trello exports", () => {
    const unsafe = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Unsafe",
      entries: [{ relativePath: "../board.json", kind: "board_json", content: JSON.stringify(createBoard()) }]
    });
    expect(unsafe.valid).toBe(false);
    expect(unsafe.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "unsafe_path" })]));

    const empty = createService().previewImport({
      workspaceId: "workspace_1",
      rootName: "Empty",
      entries: [{ relativePath: "readme.txt", kind: "unsupported", sizeBytes: 1 }]
    });
    expect(empty.valid).toBe(false);
    expect(empty.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "empty_trello_export" })]));
  });
});

function createService(): TrelloImportService {
  return new TrelloImportService({
    connection,
    idFactory: (prefix) => {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
    now: () => new Date("2026-05-14T01:02:03.000Z")
  });
}

function createBoard() {
  return {
    id: "board_1",
    name: "Launch Board",
    desc: "Board description",
    labels: [
      { id: "label_1", name: "priority", color: "red" },
      { id: "label_2", name: "", color: "green" }
    ],
    lists: [
      { id: "list_1", name: "Doing", closed: false, pos: 1 },
      { id: "list_2", name: "Archive", closed: false, pos: 2 }
    ],
    cards: [
      {
        id: "card_1",
        idList: "list_1",
        name: "Ship beta",
        desc: "Coordinate beta release",
        closed: false,
        due: "2026-05-20T12:00:00.000Z",
        dueComplete: false,
        idLabels: ["label_1", "label_2"],
        checklists: [{
          id: "check_1",
          name: "QA",
          checkItems: [
            { id: "check_item_1", name: "Run smoke tests", state: "complete" },
            { id: "check_item_2", name: "Write notes", state: "incomplete" }
          ]
        }],
        attachments: [{ id: "att_1", name: "Brief", fileName: "brief.pdf", url: "https://example.invalid/brief.pdf" }]
      },
      {
        id: "card_2",
        idList: "list_2",
        name: "Old card",
        desc: "Archived work",
        closed: true,
        due: null,
        dueComplete: false,
        idLabels: [],
        checklists: [],
        attachments: []
      }
    ],
    actions: [{
      id: "action_1",
      type: "commentCard",
      date: "2026-05-14T00:00:00.000Z",
      data: { card: { id: "card_1", name: "Ship beta" }, text: "Looks ready" },
      memberCreator: { fullName: "Alice" }
    }]
  };
}

function copiedAttachment() {
  return {
    attachmentId: "attachment_brief",
    originalName: "brief.pdf",
    storedName: "brief.pdf",
    storagePath: "attachments/2026/05/attachment_brief/brief.pdf",
    sizeBytes: 12,
    checksum: "c".repeat(64),
    mimeType: "application/pdf"
  };
}
