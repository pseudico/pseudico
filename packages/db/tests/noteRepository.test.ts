import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ItemRepository,
  NoteRepository,
  type DatabaseConnection
} from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("NoteRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
    new ContainerRepository(connection).create({
      id: "container_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: TEST_TIMESTAMP
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates, reads, and updates Markdown note details for a note item", () => {
    const noteItem = createNoteItem("item_note_1", "Launch notes");
    const repository = new NoteRepository(connection);

    const note = repository.createDetails({
      itemId: noteItem.id,
      workspaceId: "workspace_1",
      content: "# Launch\n\nDiscuss supplier plan.",
      preview: "Launch Discuss supplier plan.",
      timestamp: TEST_TIMESTAMP
    });
    const updated = repository.updateDetails(noteItem.id, {
      content: "## Launch\n\nDecision log.",
      preview: "Launch Decision log.",
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(note).toEqual({
      itemId: "item_note_1",
      workspaceId: "workspace_1",
      format: "markdown",
      content: "# Launch\n\nDiscuss supplier plan.",
      preview: "Launch Discuss supplier plan.",
      createdAt: TEST_TIMESTAMP,
      updatedAt: TEST_TIMESTAMP
    });
    expect(updated).toMatchObject({
      content: "## Launch\n\nDecision log.",
      preview: "Launch Decision log.",
      updatedAt: TEST_TIMESTAMP_LATER
    });
    expect(repository.getByItemId(noteItem.id)).toMatchObject({
      item: { id: "item_note_1", title: "Launch notes", type: "note" },
      note: {
        itemId: "item_note_1",
        format: "markdown",
        preview: "Launch Decision log."
      }
    });
  });

  it("lists notes by container while respecting archived item filters", () => {
    const first = createPersistedNote("item_note_1", "First note");
    const archived = createPersistedNote("item_note_2", "Archived note");
    new ItemRepository(connection).archive(archived.id, TEST_TIMESTAMP_LATER);

    const repository = new NoteRepository(connection);

    expect(repository.listByContainer("container_1").map((note) => note.item.id))
      .toEqual([first.id]);
    expect(repository.listByContainer("container_1", {
      includeArchived: true
    }).map((note) => note.item.id)).toEqual([first.id, archived.id]);
  });
});

function createPersistedNote(id: string, title: string) {
  const item = createNoteItem(id, title);
  new NoteRepository(connection).createDetails({
    itemId: item.id,
    workspaceId: "workspace_1",
    content: `${title} body`,
    preview: `${title} body`,
    timestamp: TEST_TIMESTAMP
  });
  return item;
}

function createNoteItem(id: string, title: string) {
  return new ItemRepository(connection).create({
    id,
    workspaceId: "workspace_1",
    containerId: "container_1",
    type: "note",
    title,
    timestamp: TEST_TIMESTAMP
  });
}
