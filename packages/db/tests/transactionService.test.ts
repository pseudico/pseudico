import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ContainerRepository,
  TransactionService,
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

describe("TransactionService", () => {
  beforeEach(async () => {
    testDb = await createRepositoryTestDatabase();
    connection = testDb.connection;
    seedWorkspace(connection);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it("commits successful writes", async () => {
    const service = new TransactionService({ connection });

    await service.runInTransaction(() => {
      new ContainerRepository(connection).create({
        id: "container_project_1",
        workspaceId: "workspace_1",
        type: "project",
        name: "Launch Plan",
        slug: "launch-plan",
        timestamp: TEST_TIMESTAMP
      });
    });

    expect(new ContainerRepository(connection).getById("container_project_1"))
      .toMatchObject({
        id: "container_project_1",
        name: "Launch Plan"
      });
  });

  it("rolls back writes when the callback fails", async () => {
    const service = new TransactionService({ connection });

    await expect(
      service.runInTransaction(() => {
        new ContainerRepository(connection).create({
          id: "container_project_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Launch Plan",
          slug: "launch-plan",
          timestamp: TEST_TIMESTAMP
        });

        throw new Error("fail transaction");
      })
    ).rejects.toThrow("fail transaction");

    expect(new ContainerRepository(connection).getById("container_project_1"))
      .toBeNull();
  });
});

