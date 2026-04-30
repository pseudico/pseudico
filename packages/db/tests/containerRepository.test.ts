import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContainerRepository, type DatabaseConnection } from "../src";
import {
  createRepositoryTestDatabase,
  seedWorkspace,
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("ContainerRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates, reads, and lists project containers", () => {
    const repository = new ContainerRepository(connection);

    const project = repository.create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      description: "Project notes",
      isFavorite: true,
      timestamp: TEST_TIMESTAMP
    });

    expect(project).toMatchObject({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      description: "Project notes",
      status: "active",
      isFavorite: true,
      isSystem: false
    });
    expect(repository.getById(project.id)).toEqual(project);
    expect(repository.listByType("workspace_1", "project")).toEqual([project]);
  });

  it("updates, archives, and excludes archived containers from default lists", () => {
    const repository = new ContainerRepository(connection);
    repository.create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: TEST_TIMESTAMP
    });

    const updated = repository.update("container_project_1", {
      name: "Launch Plan Updated",
      status: "waiting",
      color: "blue",
      timestamp: TEST_TIMESTAMP_LATER
    });
    const archived = repository.archive("container_project_1", TEST_TIMESTAMP_LATER);

    expect(updated).toMatchObject({
      name: "Launch Plan Updated",
      status: "waiting",
      color: "blue"
    });
    expect(archived).toMatchObject({
      status: "archived",
      archivedAt: TEST_TIMESTAMP_LATER
    });
    expect(repository.listByWorkspace("workspace_1")).toEqual([]);
    expect(
      repository.listByWorkspace("workspace_1", { includeArchived: true })
    ).toHaveLength(1);
  });

  it("soft deletes containers and excludes them by default", () => {
    const repository = new ContainerRepository(connection);
    repository.create({
      id: "container_project_1",
      workspaceId: "workspace_1",
      type: "project",
      name: "Launch Plan",
      slug: "launch-plan",
      timestamp: TEST_TIMESTAMP
    });

    const deleted = repository.softDelete(
      "container_project_1",
      TEST_TIMESTAMP_LATER
    );

    expect(deleted.deletedAt).toBe(TEST_TIMESTAMP_LATER);
    expect(repository.getById("container_project_1")).toBeNull();
    expect(repository.listByWorkspace("workspace_1")).toEqual([]);
    expect(
      repository.listByWorkspace("workspace_1", { includeDeleted: true })
    ).toHaveLength(1);
  });

  it("creates and finds the system Inbox", () => {
    const repository = new ContainerRepository(connection);

    const inbox = repository.createSystemInbox({
      id: "container_inbox",
      workspaceId: "workspace_1",
      timestamp: TEST_TIMESTAMP
    });

    expect(repository.findSystemInbox("workspace_1")).toEqual(inbox);
    expect(inbox).toMatchObject({
      type: "inbox",
      slug: "inbox",
      isFavorite: true,
      isSystem: true
    });
  });
});
