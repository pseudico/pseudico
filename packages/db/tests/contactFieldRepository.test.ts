import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContactFieldRepository,
  ContainerRepository,
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

describe("ContactFieldRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);

    new ContainerRepository(connection).create({
      id: "container_contact_1",
      workspaceId: "workspace_1",
      type: "contact",
      name: "Alex Chen",
      slug: "alex-chen",
      timestamp: TEST_TIMESTAMP
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates, reads, and lists active contact fields in stable order", () => {
    const repository = new ContactFieldRepository(connection);
    const phone = repository.create({
      id: "contact_field_1",
      workspaceId: "workspace_1",
      containerId: "container_contact_1",
      label: "Phone",
      value: "+61 400 000 000",
      type: "phone",
      sortOrder: 20,
      timestamp: TEST_TIMESTAMP
    });
    const email = repository.create({
      id: "contact_field_2",
      workspaceId: "workspace_1",
      containerId: "container_contact_1",
      label: "Email",
      value: "alex@example.com",
      type: "email",
      sortOrder: 10,
      timestamp: TEST_TIMESTAMP
    });

    expect(repository.getById(phone.id)).toEqual(phone);
    expect(
      repository.listForContact({
        workspaceId: "workspace_1",
        containerId: "container_contact_1"
      })
    ).toEqual([email, phone]);
  });

  it("updates and soft deletes contact fields", () => {
    const repository = new ContactFieldRepository(connection);
    repository.create({
      id: "contact_field_1",
      workspaceId: "workspace_1",
      containerId: "container_contact_1",
      label: "Email",
      value: "old@example.com",
      type: "email",
      timestamp: TEST_TIMESTAMP
    });

    const updated = repository.update("contact_field_1", {
      value: "new@example.com",
      sortOrder: 30,
      timestamp: TEST_TIMESTAMP_LATER
    });
    const deleted = repository.softDelete("contact_field_1", TEST_TIMESTAMP_LATER);

    expect(updated).toMatchObject({
      value: "new@example.com",
      sortOrder: 30,
      updatedAt: TEST_TIMESTAMP_LATER
    });
    expect(deleted.deletedAt).toBe(TEST_TIMESTAMP_LATER);
    expect(repository.getById("contact_field_1")).toBeNull();
    expect(
      repository.listForContact({
        workspaceId: "workspace_1",
        containerId: "container_contact_1"
      })
    ).toEqual([]);
    expect(
      repository.listForContact({
        workspaceId: "workspace_1",
        containerId: "container_contact_1",
        includeDeleted: true
      })
    ).toHaveLength(1);
  });
});
