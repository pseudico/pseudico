import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WorkspaceRepository, type DatabaseConnection } from "../src";
import {
  createRepositoryTestDatabase,
  TEST_TIMESTAMP,
  TEST_TIMESTAMP_LATER,
  type RepositoryTestDatabase
} from "./repositoryTestHarness";

let testDb: RepositoryTestDatabase;
let connection: DatabaseConnection;

describe("WorkspaceRepository", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("creates and reads a workspace", () => {
    const repository = new WorkspaceRepository(connection);

    const workspace = repository.create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: TEST_TIMESTAMP
    });

    expect(workspace).toEqual({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      createdAt: TEST_TIMESTAMP,
      updatedAt: TEST_TIMESTAMP
    });
    expect(repository.getById("workspace_1")).toEqual(workspace);
  });

  it("updates the last-opened timestamp through the workspace row", () => {
    const repository = new WorkspaceRepository(connection);
    repository.create({
      id: "workspace_1",
      name: "Personal Work",
      schemaVersion: 1,
      timestamp: TEST_TIMESTAMP
    });

    const updated = repository.updateLastOpened({
      workspaceId: "workspace_1",
      timestamp: TEST_TIMESTAMP_LATER
    });

    expect(updated.updatedAt).toBe(TEST_TIMESTAMP_LATER);
  });
});
