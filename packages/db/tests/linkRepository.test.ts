import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  ItemRepository,
  LinkRepository,
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

describe("LinkRepository", () => {
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

  it("creates, reads, and updates link details for a link item", () => {
    const linkItem = createLinkItem("item_link_1", "Launch brief");
    const repository = new LinkRepository(connection);

    const link = repository.createDetails({
      itemId: linkItem.id,
      workspaceId: "workspace_1",
      url: "https://example.com/brief",
      normalizedUrl: "https://example.com/brief",
      title: "Launch brief",
      description: "Supplier reference",
      domain: "example.com",
      timestamp: TEST_TIMESTAMP
    });
    const updated = repository.updateDetails(linkItem.id, {
      url: "https://docs.example.com/final",
      normalizedUrl: "https://docs.example.com/final",
      title: "Final brief",
      description: "Final supplier reference",
      domain: "docs.example.com",
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(link).toMatchObject({
      itemId: "item_link_1",
      normalizedUrl: "https://example.com/brief",
      domain: "example.com"
    });
    expect(updated).toMatchObject({
      itemId: "item_link_1",
      normalizedUrl: "https://docs.example.com/final",
      title: "Final brief",
      description: "Final supplier reference",
      updatedAt: TEST_TIMESTAMP_LATER
    });
    expect(repository.getByItemId(linkItem.id)).toMatchObject({
      item: { id: "item_link_1", title: "Launch brief", type: "link" },
      link: {
        itemId: "item_link_1",
        normalizedUrl: "https://docs.example.com/final"
      }
    });
  });

  it("lists links by container while respecting archived item filters", () => {
    const first = createPersistedLink("item_link_1", "First link");
    const archived = createPersistedLink("item_link_2", "Archived link");
    new ItemRepository(connection).archive(archived.id, TEST_TIMESTAMP_LATER);

    const repository = new LinkRepository(connection);

    expect(repository.listByContainer("container_1").map((link) => link.item.id))
      .toEqual([first.id]);
    expect(repository.listByContainer("container_1", {
      includeArchived: true
    }).map((link) => link.item.id)).toEqual([first.id, archived.id]);
  });
});

function createPersistedLink(id: string, title: string) {
  const item = createLinkItem(id, title);
  new LinkRepository(connection).createDetails({
    itemId: item.id,
    workspaceId: "workspace_1",
    url: `https://example.com/${id}`,
    normalizedUrl: `https://example.com/${id}`,
    title,
    domain: "example.com",
    timestamp: TEST_TIMESTAMP
  });
  return item;
}

function createLinkItem(id: string, title: string) {
  return new ItemRepository(connection).create({
    id,
    workspaceId: "workspace_1",
    containerId: "container_1",
    type: "link",
    title,
    timestamp: TEST_TIMESTAMP
  });
}
